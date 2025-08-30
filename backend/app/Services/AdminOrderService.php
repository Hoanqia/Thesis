<?php

namespace App\Services;

use App\Models\User;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use App\Models\ReservedStock;
use App\Models\OrderItem;
use App\Services\StockLotService;
use Exception;
use Illuminate\Support\Facades\Log;
use App\Models\StockLotAllocation;
use Illuminate\Pagination\LengthAwarePaginator;
use App\Services\NotificationService;
class AdminOrderService
{
    /**
     * Lấy tất cả đơn hàng (mới nhất đến cũ nhất)
     */
    protected $stockLotService;
    protected $notificationService;
    // Inject StockLotService thông qua constructor
    public function __construct(StockLotService $stockLotService, NotificationService $notificationService)
    {
        $this->stockLotService = $stockLotService;
        $this->notificationService = $notificationService;
    }


    /**
     * Get all orders with pagination, including user and order items with variant details.
     * Orders are sorted from newest to oldest.
     *
     * @param int $perPage The number of items to display per page.
     * @return \Illuminate\Pagination\LengthAwarePaginator
     */
    public function getAllOrders(int $perPage = 15): LengthAwarePaginator
    {
        $orders = Order::with(['user', 'orderItems.variant'])
                       ->latest()
                       ->paginate($perPage); // Use paginate() instead of get()

        // Apply image_url to each order item after pagination
        $orders->each(function ($order) {
            $order->orderItems->each(function ($item) {
                // Use optional chaining for $item->variant to prevent errors if variant is null
                $item->img = $item->variant?->image_url;
            });
        });

        return $orders;
    }

    /**
     * Lấy chi tiết 1 đơn hàng theo ID
     */
    public function getOrderById($orderId)
    {
        $order = Order::with(['user', 'orderItems.variant'])->findOrFail($orderId);

        foreach ($order->orderItems as $item) {
            $item->img  = $item->variant?->image_url;
        }

        return $order;
    }


     /**
     * Xác nhận đơn hàng
     */
    public function confirmOrder($orderId)
    {
        DB::beginTransaction();

        try {
            $order = Order::with('orderItems.variant')->findOrFail($orderId);

            if ($order->status !== 'pending') {
                throw new \Exception("Không thể xác nhận đơn hàng này vì trạng thái không phải 'pending'.");
            }
            $totalCogsForOrder = 0; 

            foreach ($order->orderItems as $item) {
                $variant = $item->variant;

                // Kiểm tra và xóa bản ghi giữ hàng (ReservedStock)
                $reserved = ReservedStock::where('variant_id', $variant->id)
                    ->where('user_id', $order->user_id)
                    ->where('order_id', $order->id)
                    ->first();

                if (!$reserved) {
                    // Nếu không tìm thấy bản ghi giữ hàng, có thể hàng đã hết hạn giữ hoặc lỗi
                    // Trong trường hợp này, hủy đơn hàng và thông báo
                    $order->update(['status' => 'canceled']);
                    throw new \Exception("Sản phẩm '{$variant->full_name}' đã hết hạn giữ tạm hoặc không tìm thấy bản ghi giữ hàng.");
                }

                // Kiểm tra đủ tồn kho trước khi thực hiện trừ FIFO
                // Hàm deductStockFifo đã có kiểm tra này, nhưng kiểm tra trước ở đây rõ ràng hơn
                if (($variant->stock ?? 0) < $item->quantity) {
                    // Nếu không đủ hàng, hủy đơn hàng và thông báo
                    $order->update(['status' => 'canceled']);
                    throw new \Exception("Sản phẩm '{$variant->full_name}' không đủ hàng trong kho. Yêu cầu: {$item->quantity}, Tồn kho: {$variant->stock}.");
                }

                // Giảm tồn kho bằng cách gọi service StockLotService::deductStockFifo
                // transaction_type sẽ là 'OUT_SALE'
                // reference_type sẽ là OrderItem::class
                // reference_id sẽ là $item->id (ID của order item)
                $this->stockLotService->deductStockFifo(
                    $variant->id,
                    $item->quantity,
                    'OUT_SALE', // Loại giao dịch là bán hàng
                    OrderItem::class, // Tham chiếu đến OrderItem
                    $item->id, // ID của OrderItem
                    $order->user_id, // User thực hiện giao dịch (có thể là admin xác nhận)
                    "Xuất kho cho đơn hàng #{$order->id}, item #{$item->id}"
                );

                // --- BẮT ĐẦU TÍNH TOÁN COGS CHO TỪNG ORDER ITEM ---

                $itemCogsPerUnit = 0;
                $itemSubtotalCogs = 0;
                $allocatedQuantitySum = 0;

                 $allocations = StockLotAllocation::where('order_item_id', $item->id)
                                                ->get();
                foreach ($allocations as $allocation) {
                    $allocatedQuantity = $allocation->allocated_quantity;
                    $unitCost = $allocation->unit_cost_at_allocation; // Giá vốn đơn vị từ StockLot

                    // Tính toán subtotal_cogs cho phần số lượng từ lô hàng này
                    $itemSubtotalCogs += ($allocatedQuantity * $unitCost);
                    $allocatedQuantitySum += $allocatedQuantity;
                }

                 // Tính toán cogs_per_unit cho OrderItem.
                // Đảm bảo tránh chia cho 0 nếu không có cấp phát kho (trường hợp lỗi).
                if ($allocatedQuantitySum > 0) {
                    $itemCogsPerUnit = $itemSubtotalCogs / $allocatedQuantitySum;
                } else {
                    // Nếu không có cấp phát kho nào được ghi nhận cho item này (lỗi ở StockLotService),
                    // COGS của đơn vị sẽ là 0. Bạn có thể chọn cách xử lý lỗi khác tùy theo nghiệp vụ.
                    $itemCogsPerUnit = 0;
                }

                  // Cập nhật các trường COGS vào OrderItem
                $item->cogs_per_unit = $itemCogsPerUnit;
                $item->subtotal_cogs = $itemSubtotalCogs;
                $item->save(); // Lưu OrderItem sau khi cập nhật COGS
                // --- KẾT THÚC TÍNH TOÁN COGS CHO TỪNG ORDER ITEM ---


                // Cộng dồn subtotal_cogs của OrderItem này vào tổng COGS của toàn bộ đơn hàng
                $totalCogsForOrder += $itemSubtotalCogs;

                // Xoá bản ghi giữ hàng sau khi đã trừ tồn kho thành công
                $reserved->delete();
            }

            $order->total_cogs = $totalCogsForOrder;
            $order->status = 'confirmed'; // Cập nhật trạng thái đơn hàng về 'confirmed'
            $order->save(); // Lưu Order sau khi cập nhật total_cogs và status


            DB::commit();
            $user = User::find($order->user_id);
            $this->notificationService->createNotification(
                $user,
                "order",
                "Đơn hàng" . $order->id  . "đã được xác nhận",
            );
            return $order;
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error("Xác nhận đơn hàng thất bại cho Đơn hàng ID: {$orderId} - " . $e->getMessage());
            throw $e;
        }
    }
    /**
     * Cập nhật trạng thái đơn hàng
     */
    public function updateOrderStatus($orderId, $newStatus)
    {
        $order = Order::findOrFail($orderId);
         if ($order->status === 'canceled') {
        throw new \InvalidArgumentException("Không thể thay đổi trạng thái.");
    }
        $validStatuses = ['pending', 'confirmed', 'shipping', 'completed', 'canceled'];
        if (! in_array($newStatus, $validStatuses)) {
            throw new \InvalidArgumentException("Trạng thái không hợp lệ.");
        }
        
        if ($order->status === 'confirmed' && in_array($newStatus, ['pending', 'completed'])) {
            throw new \InvalidArgumentException("Trạng thái không hợp lệ.");
        }

        if ($order->status === 'shipping' && in_array($newStatus, ['pending', 'confirmed'])) {
            throw new \InvalidArgumentException("Trạng thái không hợp lệ.");
        }

          // Bắt đầu transaction để đảm bảo tính toàn vẹn dữ liệu
    DB::beginTransaction();
    
        // 4. Xử lý logic tồn kho hoặc giữ hàng dựa trên trạng thái mới
        if ($newStatus === 'canceled') {
            // Khi đơn hàng bị hủy, hoàn lại tồn kho
            // Logic hoàn tồn kho phụ thuộc vào trạng thái hiện tại của đơn hàng
            if (in_array($currentStatus, ['confirmed', 'shipping'])) {
                // Hàng đã được xác nhận hoặc đang vận chuyển, nghĩa là tồn kho đã bị trừ từ các lô cụ thể
                // Cần tạo StockLot mới cho từng phần đã được phân bổ
                foreach ($order->orderItems as $item) {
                    // Lấy tất cả các bản ghi phân bổ cho order_item này
                    $allocations = StockLotAllocation::where('order_item_id', $item->id)->get();

                    if ($allocations->isEmpty()) {             
                        \Log::warning("Không tìm thấy StockLotAllocations cho OrderItem ID: " . $item->id);
                        continue; 
                    }

                    foreach ($allocations as $allocation) {
                        // Tạo StockLot mới cho phần hàng được hoàn lại từ mỗi lô đã phân bổ
                        $this->stockLotService->createLot( // Gọi service của bạn
                            $item->variant_id, // ID biến thể sản phẩm
                            $allocation->allocated_quantity, // Số lượng được hoàn lại từ lô này
                            $allocation->unit_cost_at_allocation, // **Giá vốn chính xác tại thời điểm xuất kho**
                            null, // grnItemId
                            'App\Models\StockLotAllocation', // referenceType: tham chiếu đến bản ghi phân bổ
                            $allocation->id, // referenceId: ID của bản ghi phân bổ
                            now('Asia/Ho_Chi_Minh'), // purchaseDate: Ngày nhập lại
                            Auth::id(), // userId của người thực hiện hủy
                            'ADJ_RETURN_FROM_CUSTOMER', // transactionType
                            "Hàng trả lại từ đơn hàng hủy #" . $order->id . " (Phân bổ từ Lot #" . $allocation->stock_lot_id . ")"
                        );
                        // Tùy chọn: Bạn có thể đánh dấu allocation là đã hoàn trả hoặc xóa nó
                        // $allocation->delete(); // hoặc $allocation->update(['is_returned' => true]);
                    }
                }
            } elseif ($currentStatus === 'pending') {
                ReservedStock::where('order_id', $order->id)->delete();
            }
        }

        // 5. Cập nhật trạng thái đơn hàng
        $order->update(['status' => $newStatus]);

        DB::commit(); // Hoàn tất giao dịch
        $user = User::find($order->user_id);
            $this->notificationService->createNotification(
                $user,
                "order",
                "Trạng thái của đơn hàng" . $order->id  . "đã được chuyển thành " . $order->status,
            );
        return $order;
    }

    /**
     * Cập nhật trạng thái thanh toán
     */
    public function markAsPaid($orderId)
    {
        $order = Order::findOrFail($orderId);
        $order->update(['is_paid' => true]);

        return $order;
    }

    /**
     * Xoá đơn hàng
     */
    public function deleteOrder($orderId)
    {
        return Order::findOrFail($orderId)->delete();
    }
}
