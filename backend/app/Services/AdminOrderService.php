<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\DB;
use App\Models\ReservedStock;
use App\Models\OrderItem;
use App\Services\StockLotService;
use Exception;
use Illuminate\Support\Facades\Log;
use App\Models\StockLotAllocation;
class AdminOrderService
{
    /**
     * Lấy tất cả đơn hàng (mới nhất đến cũ nhất)
     */
    protected $stockLotService;

    // Inject StockLotService thông qua constructor
    public function __construct(StockLotService $stockLotService)
    {
        $this->stockLotService = $stockLotService;
    }


    public function getAllOrders()
    {
        $orders = Order::with(['user', 'orderItems.variant'])->latest()->get();

        $orders->each(function ($order) {
            $order->orderItems->each(function ($item) {
                $item->img  = $item->variant?->image_url;
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

            return $order;
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error("Xác nhận đơn hàng thất bại cho Đơn hàng ID: {$orderId} - " . $e->getMessage());
            throw $e;
        }
    }
    // /**
    //  * Xác nhận đơn hàng
    //  */
    // public function confirmOrder($orderId)
    // {
    //     DB::beginTransaction();

    //     try {
    //         $order = Order::with('orderItems.variant')->findOrFail($orderId);

    //         if ($order->status !== 'pending') {
    //             throw new \Exception("Không thể xác nhận đơn hàng này.");
    //         }

    //         foreach ($order->orderItems as $item) {
    //             $variant = $item->variant;

    //             $reserved = ReservedStock::where('variant_id', $variant->id)
    //                 ->where('user_id', $order->user_id)
    //                 ->where('order_id', $order->id)
    //                 ->first();

    //             if (! $reserved) {
    //                  $order->update([
    //                     'status' => 'canceled',
    //                 ]);
    //                 throw new \Exception("Sản phẩm '{$variant->full_name}' đã hết hạn giữ tạm.");
    //             }

    //             if ($variant->stock < $item->quantity) {
    //                 throw new \Exception("Sản phẩm '{$variant->full_name}' không đủ hàng.");
    //             }

    //             // Giảm tồn kho
    //             $variant->decrement('stock', $item->quantity);

    //             // Xoá bản ghi giữ hàng
    //             $reserved->delete();
    //         }

    //         // Cập nhật trạng thái về 'confirmed'
    //         $order->update(['status' => 'confirmed']);

    //         DB::commit();

    //         return $order;
    //     } catch (\Exception $e) {
    //         DB::rollBack();
    //         throw $e;
    //     }
    // }

    /**
     * Cập nhật trạng thái đơn hàng
     */
    public function updateOrderStatus($orderId, $newStatus)
    {
        $order = Order::findOrFail($orderId);
         if ($order->status === 'canceled' || $order->status === 'pending') {
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

        if ($newStatus === 'canceled') {
            if ($order->status === 'shipping') {
                // Hoàn tác tồn kho khi đang giao
                foreach ($order->orderItems as $item) {
                    $item->variant()->increment('stock', $item->quantity);
                }
            } elseif ($order->status === 'pending') {
                // Xóa giữ hàng khi hủy trước xác nhận
                ReservedStock::where('order_id', $order->id)->delete();
            }
        }

        $order->update(['status' => $newStatus]);

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
