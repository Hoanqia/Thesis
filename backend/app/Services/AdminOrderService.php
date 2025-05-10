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
    public function confirmOrder($orderId)
    {
        // Bắt đầu giao dịch
        DB::beginTransaction();

        try {
            // Lấy đơn hàng
            $order = Order::findOrFail($orderId);
             if ($order->status !== 'pending') {
                throw new \Exception("Không thể xác nhận đơn hàng này.");
            }
            // Kiểm tra các sản phẩm trong order
            foreach ($order->orderItems as $orderItem) {
                // Cập nhật reserved_stock
                $reservedStock = ReservedStock::where('product_id', $orderItem->product_id)
                    ->where('user_id', $order->user_id)
                    ->whereNull('order_id') // Chưa có order_id
                    ->first();
                
                if ($reservedStock) {
                    if ($orderItem->product->stock < $orderItem->quantity) {
                        throw new \Exception("Sản phẩm {$orderItem->product->name} không đủ hàng trong kho.");
                    }
                    // Gán order_id vào reserved_stock
                    $reservedStock->update(['order_id' => $order->id]);

                    // Giảm stock thực sự
                    $orderItem->product->decrement('stock', $orderItem->quantity);
                } else {
                    throw new \Exception("Không thể xác nhận vì sản phẩm đã hết hạn giữ tạm.");
                }
            }

            // Xác nhận giao dịch
            DB::commit();

            return $order;
        } catch (\Exception $e) {
            // Nếu có lỗi, rollback giao dịch
            DB::rollBack();
            throw $e;
        }
    }
    /**
     * Cập nhật trạng thái đơn hàng
     */
    public function updateOrderStatus($orderId, $newStatus)
    {
        $order = Order::findOrFail($orderId);

        // Kiểm tra trạng thái hợp lệ
        if (!in_array($newStatus, ['pending', 'shipping', 'completed', 'canceled'])) {
            throw new \InvalidArgumentException("Trạng thái không hợp lệ.");
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
     * Xoá đơn hàng (hiếm khi dùng, có thể dùng khi test)
     */
    public function deleteOrder($orderId)
    {
        return Order::findOrFail($orderId)->delete();
    }
}
