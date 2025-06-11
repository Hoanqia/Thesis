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
                throw new \Exception("Không thể xác nhận đơn hàng này.");
            }

            foreach ($order->orderItems as $item) {
                $variant = $item->variant;

                $reserved = ReservedStock::where('variant_id', $variant->id)
                    ->where('user_id', $order->user_id)
                    ->where('order_id', $order->id)
                    ->first();

                if (! $reserved) {
                     $order->update([
                        'status' => 'canceled',
                    ]);
                    throw new \Exception("Sản phẩm '{$variant->full_name}' đã hết hạn giữ tạm.");
                }

                if ($variant->stock < $item->quantity) {
                    throw new \Exception("Sản phẩm '{$variant->full_name}' không đủ hàng.");
                }

                // Giảm tồn kho
                $variant->decrement('stock', $item->quantity);

                // Xoá bản ghi giữ hàng
                $reserved->delete();
            }

            // Cập nhật trạng thái về 'confirmed'
            $order->update(['status' => 'confirmed']);

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
