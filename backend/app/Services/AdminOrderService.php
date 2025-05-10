<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\DB;
use App\Models\ReservedStock;

class AdminOrderService
{
    /**
     * Lấy tất cả đơn hàng (mới nhất đến cũ nhất)
     */
    public function getAllOrders()
    {
        return Order::with('user', 'orderItems')->latest()->get();
    }

    /**
     * Lấy chi tiết 1 đơn hàng theo ID
     */
    public function getOrderById($orderId)
    {
        return Order::with('user', 'orderItems')->findOrFail($orderId);
    }


    /* 
    * Xác nhận đơn hàng 
    */
    public function confirmOrder($orderId){
        DB::beginTransaction();

        try {
            // Lấy đơn hàng
            $order = Order::findOrFail($orderId);

            if ($order->status !== 'pending') {
                throw new \Exception("Không thể xác nhận đơn hàng này.");
            }

            // Kiểm tra và xử lý từng sản phẩm trong đơn hàng
            foreach ($order->orderItems as $orderItem) {
                $reservedStock = ReservedStock::where('product_id', $orderItem->product_id)
                    ->where('user_id', $order->user_id)
                    ->where('order_id', $order->id) 
                    ->first();

                if (!$reservedStock) {
                    throw new \Exception("Không thể xác nhận vì sản phẩm '{$orderItem->product->name}' đã hết hạn giữ tạm.");
                }

                if ($orderItem->product->stock < $orderItem->quantity) {
                    throw new \Exception("Sản phẩm '{$orderItem->product->name}' không đủ hàng trong kho.");
                }

                // Trừ tồn kho thật
                $orderItem->product->decrement('stock', $orderItem->quantity);

                // Xoá bản ghi giữ hàng tạm vì đã xác nhận
                $reservedStock->delete();
            }

            // Cập nhật trạng thái đơn hàng
            $order->update(['status' => 'shipping']);

            DB::commit();

            return $order;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Cập nhật trạng thái đơn hàng
     */
    public function updateOrderStatus($orderId, $newStatus){
        $order = Order::findOrFail($orderId);

       // Kiểm tra trạng thái hợp lệ
        $validStatuses = ['pending', 'shipping', 'completed', 'canceled'];
        if (!in_array($newStatus, $validStatuses)) {
            throw new \InvalidArgumentException("Trạng thái không hợp lệ.");
        }

        // Kiểm tra trạng thái không hợp lệ khi thay đổi
        if (($order->status === 'confirmed' && in_array($newStatus, ['pending', 'completed']))) {
            throw new \InvalidArgumentException("Trạng thái không hợp lệ.");
        }

        if ($order->status === 'shipping' && in_array($newStatus, ['pending', 'confirmed'])) {
            throw new \InvalidArgumentException("Trạng thái không hợp lệ.");
        }
        // Xử lý khi cập nhật trạng thái là 'canceled'
        if ($newStatus === 'canceled') {
            if ($order->status === 'shipping') {
                // Nếu đơn đang ở trạng thái shipping, cần hồi lại stock
                foreach ($order->orderItems as $orderItem) {
                    // Cộng lại stock
                    $orderItem->product->increment('stock', $orderItem->quantity);
                }
            } else if($order->status === 'pending'){
                // Nếu đơn hàng đang ở trạng thái pending, chỉ cần xoá reserved_stock
                foreach ($order->orderItems as $orderItem) {
                    ReservedStock::where('order_id', null) // chỉ xoá reserved_stock chưa có order_id
                        ->where('product_id', $orderItem->product_id)
                        ->delete();
                }
            }
        }

        // Cập nhật trạng thái mới cho đơn hàng
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
     * Xoá đơn hàng (hiếm khi dùng, có thể dùng khi test)
     */
    public function deleteOrder($orderId)
    {
        return Order::findOrFail($orderId)->delete();
    }
}
