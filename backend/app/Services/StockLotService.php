<?php

namespace App\Services;

use App\Models\StockLot;
use App\Models\Variant;
use App\Models\GrnItem;       // Đảm bảo import đúng Model GrnItem
use App\Models\InventoryTransaction; // Cần thiết để ghi lại giao dịch
use App\Models\OrderItem; // Nếu bạn dùng OrderItem làm reference_type cho hàng trả lại
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Pagination\LengthAwarePaginator; // <--- Đảm bảo dòng này đã được import đúng
use App\Models\StockLotAllocation; // <--- Import model mới

class StockLotService
{   


        /**
     * Đồng bộ lại tổng tồn kho của một biến thể dựa trên các lô hàng.
     * Đây là hàm quan trọng để đảm bảo variant.stock luôn chính xác.
     *
     * @param int $variantId ID của biến thể.
     * @return void
     */
    protected function syncVariantStock(int $variantId): void
    {
        $variant = Variant::find($variantId);
        if (!$variant) {
            // Không tìm thấy biến thể, có thể log lỗi hoặc bỏ qua
            return;
        }

        // Tính tổng số lượng còn lại từ tất cả các lô hàng của biến thể này
        $totalStockFromLots = StockLot::where('variant_id', $variantId)
                                      ->selectRaw('SUM(quantity_in - quantity_out) as total_remaining_quantity')
                                      ->first()
                                      ->total_remaining_quantity ?? 0;

        // Cập nhật cột 'stock' của biến thể
        $variant->stock = $totalStockFromLots;
        $variant->save();
    }


    /**
     * Tạo một lô hàng mới trong kho.
     * Dùng cho nhập kho (GRN), hàng trả lại từ khách hàng, hoặc hàng tìm thấy.
     *
     * @param int $variantId ID của biến thể sản phẩm.
     * @param int $quantityIn Số lượng nhập vào của lô này.
     * @param float $unitCost Giá vốn đơn vị của lô này.
     * @param int|null $grnItemId ID của GrnItem nếu lô đến từ GRN.
     * @param string|null $referenceType Loại tham chiếu (e.g., 'App\Models\OrderItem' cho hàng trả lại).
     * @param int|null $referenceId ID của bản ghi tham chiếu.
     * @param Carbon|null $purchaseDate Ngày nhập lô hàng (mặc định là hiện tại).
     * @param int|null $userId ID của người dùng thực hiện giao dịch (để ghi InventoryTransaction).
     * @param string $transactionType Loại giao dịch tồn kho liên quan (e.g., 'IN_GRN', 'ADJ_RETURN_FROM_CUSTOMER', 'ADJ_FOUND').
     * @param string|null $transactionNotes Ghi chú cho InventoryTransaction.
     * @return StockLot
     * @throws \Exception
     */
    public function createLot(
        int $variantId,
        int $quantityIn,
        float $unitCost,
        ?int $grnItemId = null,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?Carbon $purchaseDate = null,
        ?int $userId = null,
        string $transactionType = 'IN_GRN', // Mặc định là nhập GRN
        ?string $transactionNotes = null
    ): StockLot {
        DB::beginTransaction();
        try {
            $stockLot = StockLot::create([
                'variant_id' => $variantId,
                'grn_item_id' => $grnItemId,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'quantity_in' => $quantityIn,
                'quantity_out' => 0,
                'unit_cost' => $unitCost,
                'purchase_date' => $purchaseDate ?? now('Asia/Ho_Chi_Minh'),
            ]);

            // Cập nhật tổng số lượng tồn kho của variant
            $variant = Variant::find($variantId);
            if (!$variant) {
                throw new \Exception("Variant with ID {$variantId} not found.");
            }
            $variant->stock += $quantityIn;
            $variant->save();
        
            // Ghi lại giao dịch tồn kho
            InventoryTransaction::create([
                'variant_id' => $variantId,
                'transaction_type' => $transactionType,
                'quantity' => $quantityIn,
                'reference_type' => $referenceType, // Sử dụng reference_type của stock_lot
                'reference_id' => $referenceId,     // Sử dụng reference_id của stock_lot
                'user_id' => $userId , // Lấy user ID từ auth nếu không truyền vào
                'notes' => $transactionNotes ?? "Nhập kho / Điều chỉnh tăng từ {$transactionType}",
            ]);

            DB::commit();
            $this->syncVariantStock($variantId);

            return $stockLot;
        } catch (\Exception $e) {
            DB::rollBack();
            // Log lỗi hoặc throw lại tùy vào cách bạn muốn xử lý
            throw $e;
        }
    }

    /**
     * Trừ số lượng tồn kho từ các lô hàng theo nguyên tắc FIFO.
     * Dùng cho bán hàng, hư hỏng, mất hàng, trả hàng NCC.
     *
     * @param int $variantId ID của biến thể sản phẩm.
     * @param int $quantityToDeduct Số lượng cần trừ.
     * @param string $transactionType Loại giao dịch tồn kho (e.g., 'OUT_SALE', 'ADJ_DAMAGE', 'ADJ_LOSS', 'ADJ_RETURN_TO_SUPPLIER').
     * @param string|null $referenceType Loại tham chiếu (e.g., 'App\Models\Order' cho bán hàng).
     * @param int|null $referenceId ID của bản ghi tham chiếu.
     * @param int|null $userId ID của người dùng thực hiện giao dịch.
     * @param string|null $transactionNotes Ghi chú cho InventoryTransaction.
     * @return float Tổng giá vốn hàng bán/hàng bị trừ.
     * @throws \Exception Nếu không đủ hàng tồn kho.
     */
    public function deductStockFifo(
        int $variantId,
        int $quantityToDeduct,
        string $transactionType = 'OUT_SALE', // Mặc định là bán hàng
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?int $userId = null,
        ?string $transactionNotes = null
    ): float {
        DB::beginTransaction();
        try {
            $variant = Variant::find($variantId);
            if (!$variant) {
                throw new \Exception("Variant with ID {$variantId} not found.");
            }

            if ($variant->stock < $quantityToDeduct) {
                throw new \Exception("Không đủ tồn kho cho variant ID: {$variantId}. Yêu cầu: {$quantityToDeduct}, Tồn kho: {$variant->stock}");
            }

            $totalCostOfDeduction = 0;
            $remainingQuantityToDeduct = $quantityToDeduct;

            // Lấy các lô hàng còn tồn theo thứ tự nhập kho (cũ nhất trước)
            $stockLots = StockLot::where('variant_id', $variantId)
                                 ->whereRaw('quantity_in > quantity_out') // Lô còn tồn
                                 ->orderBy('purchase_date', 'asc')        // FIFO: lấy lô cũ nhất
                                 ->orderBy('id', 'asc')                   // Thứ tự phụ nếu purchase_date giống nhau
                                 ->lockForUpdate()                        // Khóa các bản ghi để tránh race condition
                                 ->get();

            foreach ($stockLots as $lot) {
                if ($remainingQuantityToDeduct <= 0) {
                    break; // Đã trừ đủ số lượng
                }

                $availableInLot = $lot->quantity_in - $lot->quantity_out;
                $quantityToTakeFromLot = min($remainingQuantityToDeduct, $availableInLot);

                // Cập nhật lô hàng
                $lot->quantity_out += $quantityToTakeFromLot;
                $lot->save();

                // Tính toán tổng giá vốn
                $totalCostOfDeduction += $quantityToTakeFromLot * $lot->unit_cost;
                $remainingQuantityToDeduct -= $quantityToTakeFromLot;

                // Ghi lại vào bảng StockLotAllocations
                // Điều này yêu cầu $referenceType và $referenceId phải là của OrderItem
                // Nếu $referenceType là Order (Order ID), bạn sẽ cần tìm OrderItem tương ứng
                // Để đơn giản, giả định $referenceType là 'App\Models\OrderItem' và $referenceId là order_item_id
                if ($referenceType === OrderItem::class && $referenceId !== null) {
                    StockLotAllocation::create([
                        'order_item_id' => $referenceId,
                        'stock_lot_id' => $lot->id,
                        'allocated_quantity' => $quantityToTakeFromLot,
                        'unit_cost_at_allocation' => $lot->unit_cost, // Ghi lại giá vốn tại thời điểm cấp phát
                    ]);
                }

            }

            // Cập nhật tổng số lượng tồn kho của variant
            $variant->stock -= $quantityToDeduct;
            $variant->save();

            // Ghi lại giao dịch tồn kho
            InventoryTransaction::create([
                'variant_id' => $variantId,
                'transaction_type' => $transactionType,
                'quantity' => $quantityToDeduct,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'user_id' => $userId ?? Auth::id(),
                'notes' => $transactionNotes ?? "Xuất kho / Điều chỉnh giảm từ {$transactionType}",
            ]);

            DB::commit();
            $this->syncVariantStock($variantId);

            return $totalCostOfDeduction;
        } catch (\Exception $e) {
            DB::rollBack();
            // Log lỗi hoặc throw lại
            throw $e;
        }
    }


        public function getStockLotDetails(int $lotId): ?StockLot
    {
        return StockLot::with(['variant.product', 'grn_item.grn.purchaseOrder.supplier', 'stockLotAllocations.orderItem'])->find($lotId);
    }

    /**
     * Lấy các lô hàng còn tồn của một variant theo thứ tự FIFO.
     *
     * @param int $variantId
     * @return \Illuminate\Database\Eloquent\Collection<StockLot>
     */
    public function getAvailableStockLots(int $variantId): \Illuminate\Database\Eloquent\Collection
    {
        return StockLot::where('variant_id', $variantId)
                       ->whereRaw('quantity_in > quantity_out')
                       ->orderBy('purchase_date', 'asc')
                       ->orderBy('id', 'asc') // Thứ tự phụ
                       ->get();
    }

    /**
     * Tính toán giá vốn hàng bán (COGS) cho một số lượng cụ thể mà không thực hiện trừ kho.
     * Chỉ dùng cho mục đích tính toán preview COGS.
     *
     * @param int $variantId
     * @param int $quantity
     * @return float
     * @throws \Exception Nếu không đủ hàng tồn kho để tính toán.
     */
    public function calculateCogsPreview(int $variantId, int $quantity): float
    {
        $totalCogs = 0;
        $remainingQuantity = $quantity;

        $stockLots = StockLot::where('variant_id', $variantId)
                             ->whereRaw('quantity_in > quantity_out')
                             ->orderBy('purchase_date', 'asc')
                             ->orderBy('id', 'asc')
                             ->get();

        foreach ($stockLots as $lot) {
            if ($remainingQuantity <= 0) {
                break;
            }

            $availableInLot = $lot->quantity_in - $lot->quantity_out;
            $quantityToTakeFromLot = min($remainingQuantity, $availableInLot);

            $totalCogs += $quantityToTakeFromLot * $lot->unit_cost;
            $remainingQuantity -= $quantityToTakeFromLot;
        }

        if ($remainingQuantity > 0) {
            // Nếu vẫn còn quantityToTakeFromLot > 0, tức là không đủ hàng trong kho
            throw new \Exception("Không đủ tồn kho để tính toán COGS cho variant ID: {$variantId}. Thiếu: {$remainingQuantity}");
        }

        return $totalCogs;
    }


    /**
     * Lấy danh sách lô hàng với phân trang và bộ lọc.
     * Hỗ trợ tìm kiếm, lọc theo biến thể, trạng thái lô, khoảng ngày nhập.
     *
     * @param array $filters Mảng các bộ lọc:
     * - 'search': string, tìm kiếm theo Lot ID hoặc tên biến thể.
     * - 'variant_id': int, lọc theo ID biến thể.
     * - 'status': string, 'available' (còn hàng), 'low_stock' (sắp hết), 'out_of_stock' (hết hàng).
     * - 'from_date': string, ngày bắt đầu (YYYY-MM-DD).
     * - 'to_date': string, ngày kết thúc (YYYY-MM-DD).
     * - 'supplier_id': int, lọc theo nhà cung cấp (cần join với GRN/PurchaseOrder để lấy).
     * @param int $perPage Số lượng bản ghi mỗi trang.
     * @return \Illuminate\Pagination\LengthAwarePaginator // <--- Đã sửa kiểu trả về ở đây
     */
    public function getPaginatedStockLots(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = StockLot::query()
            ->with(['variant', 'grn_item']); // Load eager relationships for display

        // Lọc theo tìm kiếm (Lot ID hoặc full_name của biến thể)
            if (!empty($filters['search'])) {
                $searchTerm = '%' . $filters['search'] . '%';
                $query->where(function ($q) use ($searchTerm) {
                    $q->where('stock_lots.id', 'like', $searchTerm) // Tìm theo Lot ID
                    ->orWhereHas('variant', function ($qv) use ($searchTerm) {
                        // Tìm kiếm trong tên sản phẩm (Product name)
                        $qv->whereHas('product', function ($qp) use ($searchTerm) {
                            $qp->where('name', 'like', $searchTerm);
                        });
                    });
                });
            }

        // Lọc theo ID biến thể
        if (isset($filters['variant_id'])) {
            $query->where('variant_id', $filters['variant_id']);
        }

        // Lọc theo trạng thái lô hàng (available, low_stock, out_of_stock)
        if (!empty($filters['status'])) {
            switch ($filters['status']) {
                case 'available':
                    $query->whereRaw('quantity_in > quantity_out');
                    break;
                case 'low_stock':
                    // Giả định ngưỡng thấp là 10%, bạn có thể định nghĩa hằng số hoặc tham số cấu hình
                    $query->whereRaw('quantity_in > quantity_out')
                          ->whereRaw('(quantity_in - quantity_out) <= (quantity_in * 0.1)'); // Ví dụ: số lượng còn lại <= 10% tổng số lượng nhập
                    break;
                case 'out_of_stock':
                    $query->whereRaw('quantity_in = quantity_out');
                    break;
            }
        }

        // Lọc theo khoảng ngày nhập
        if (!empty($filters['from_date'])) {
            $query->where('purchase_date', '>=', Carbon::parse($filters['from_date'])->startOfDay());
        }
        if (!empty($filters['to_date'])) {
            $query->where('purchase_date', '<=', Carbon::parse($filters['to_date'])->endOfDay());
        }

        // Lọc theo nhà cung cấp (phức tạp hơn, cần join qua GRN và PurchaseOrder)
        if (isset($filters['supplier_id'])) {
            $query->whereHas('grn_item.grn.purchase_order', function ($q) use ($filters) {
                $q->where('supplier_id', $filters['supplier_id']);
            });
        }
        
        // Sắp xếp mặc định theo FIFO: lô cũ nhất trước
        $query->orderBy('purchase_date', 'asc')
              ->orderBy('id', 'asc');

        return $query->paginate($perPage);
    }
    /**
     * Lấy lịch sử giao dịch tồn kho của một lô hàng cụ thể.
     *
     * @param int $lotId ID của lô hàng.
     * @return \Illuminate\Database\Eloquent\Collection<InventoryTransaction>
     */
    public function getLotTransactionHistory(int $lotId): \Illuminate\Database\Eloquent\Collection
    {
        $stockLot = StockLot::find($lotId);
        if (!$stockLot) {
            return collect(); 
        }

        // Lấy giao dịch IN tạo ra lô này
        $inTransactions = InventoryTransaction::where('variant_id', $stockLot->variant_id)
                                             ->where('transaction_type', 'IN_GRN')
                                             ->where('reference_type', GrnItem::class) 
                                             ->where('reference_id', $stockLot->grn_item_id) 
                                             ->get();

        // Lấy các giao dịch OUT có liên quan thông qua StockLotAllocations
        // Join InventoryTransaction với StockLotAllocations
        $outTransactions = InventoryTransaction::where('inventory_transactions.variant_id', $stockLot->variant_id)
            ->whereIn('inventory_transactions.transaction_type', ['OUT_SALE', 'ADJ_DAMAGE', 'ADJ_LOSS', 'ADJ_RETURN_TO_SUPPLIER'])
            ->where('inventory_transactions.reference_type', OrderItem::class) // Chỉ lấy các giao dịch xuất từ OrderItem
            ->join('stock_lot_allocations', function ($join) use ($lotId) {
                $join->on('inventory_transactions.reference_id', '=', 'stock_lot_allocations.order_item_id')
                     ->where('stock_lot_allocations.stock_lot_id', '=', $lotId);
            })
            ->select('inventory_transactions.*', 'stock_lot_allocations.allocated_quantity as allocated_from_lot') // Lấy cả số lượng được cấp phát từ lô này
            ->distinct() // Đảm bảo không trùng lặp nếu một OrderItem có nhiều giao dịch khác không phải từ lô này
            ->get();
        
        // Gộp và sắp xếp tất cả giao dịch
        return $inTransactions->merge($outTransactions)->sortBy('created_at');
    }


    /**
     * Điều chỉnh số lượng tồn kho của một lô hàng cụ thể.
     * Dùng cho các trường hợp điều chỉnh thủ công (kiểm kê, hư hỏng, tìm thấy).
     * Ghi nhận giao dịch tương ứng trong InventoryTransaction.
     *
     * @param int $lotId ID của lô hàng cần điều chỉnh.
     * @param int $quantityChange Số lượng thay đổi (dương cho tăng, âm cho giảm).
     * @param string $transactionType Loại giao dịch điều chỉnh (e.g., 'ADJ_INVENTORY_COUNT', 'ADJ_DAMAGE', 'ADJ_LOSS', 'ADJ_FOUND').
     * @param string|null $notes Ghi chú về lý do điều chỉnh.
     * @param int|null $userId ID của người dùng thực hiện giao dịch.
     * @return StockLot Đối tượng StockLot đã được cập nhật.
     * @throws \Exception Nếu số lượng điều chỉnh gây ra tồn kho âm hoặc lô không tồn tại.
     */
    public function adjustStockLotQuantity(
        int $lotId,
        int $quantityChange,
        string $transactionType,
        ?string $notes = null,
        ?int $userId = null
    ): StockLot {
        DB::beginTransaction();
        try {
            $lot = StockLot::find($lotId);

            if (!$lot) {
                throw new \Exception("Lô hàng với ID {$lotId} không tìm thấy.");
            }

            $variant = Variant::find($lot->variant_id);
            if (!$variant) {
                throw new \Exception("Variant with ID {$lot->variant_id} không tìm thấy.");
            }

            $currentQuantityRemaining = $lot->quantity_in - $lot->quantity_out;
            $quantityForTransaction = $quantityChange; // Mặc định là số lượng thay đổi

            if ($quantityChange > 0) {
                // Điều chỉnh tăng (hàng tìm thấy, kiểm kê tăng)
                $lot->quantity_in += $quantityChange;
                $variant->stock += $quantityChange;
                $transactionNotes = $notes ?? "Điều chỉnh tăng số lượng lô {$lotId} ({$lot->variant_id})";
            } elseif ($quantityChange < 0) {
                // Điều chỉnh giảm (hàng hư hỏng, mất mát, kiểm kê giảm)
                $absQuantityChange = abs($quantityChange);
                if ($currentQuantityRemaining < $absQuantityChange) {
                    throw new \Exception("Không đủ số lượng trong lô {$lotId} để điều chỉnh giảm {$absQuantityChange}. Còn lại: {$currentQuantityRemaining}.");
                }
                $lot->quantity_out += $absQuantityChange;
                $variant->stock -= $absQuantityChange;
                $transactionNotes = $notes ?? "Điều chỉnh giảm số lượng lô {$lotId} ({$lot->variant_id})";
                $quantityForTransaction = $absQuantityChange; // Lưu giá trị tuyệt đối cho giao dịch giảm

            } else {
                // quantityChange = 0, không có gì để làm
                return $lot;
            }

            $lot->save();
            $variant->save();

            // Ghi lại giao dịch tồn kho
            InventoryTransaction::create([
                'variant_id' => $lot->variant_id,
                'transaction_type' => $transactionType,
                'quantity' => $quantityForTransaction, // Lưu số lượng thay đổi (có thể âm)
                'reference_type' => 'App\Models\StockLot', // Tham chiếu trực tiếp đến StockLot
                'reference_id' => $lotId,
                'user_id' => $userId ?? Auth::id(),
                'notes' => $transactionNotes,
            ]);

            DB::commit();
            $this->syncVariantStock($lot->variant_id);
            return $lot;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }


}