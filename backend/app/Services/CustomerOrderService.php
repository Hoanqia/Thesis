<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\Variant;
use Illuminate\Support\Facades\Auth;

class CustomerOrderService
{
    public function createOrder(array $data)
    {
        $user = Auth::user();
        $cart = Cart::where('user_id', $user->id)->firstOrFail();
        $cartItems = $cart->cartItems;

        if ($cartItems->isEmpty()) {
            throw new \Exception("Giỏ hàng trống.");
        }

        // Lấy địa chỉ
        if (!empty($data['address_id'])) {
            $address = $user->addresses()->where('id', $data['address_id'])->first();
            if (!$address) {
                throw new \Exception("Địa chỉ không hợp lệ.");
            }
        } else {
            $address = $user->addresses()->where('is_default', true)->first();
            if (!$address) {
                throw new \Exception("Bạn chưa chọn địa chỉ giao hàng mặc định.");
            }
        }

        // Tính tổng giá từ variant
        $totalPrice = $cartItems->sum(function ($item) {
            return $item->variant->price * $item->quantity;
        });

        $shippingFee = $data['shipping_fee'] ?? 0;
        $grandTotal = $totalPrice + $shippingFee;

        // Tạo đơn hàng
        $order = $user->orders()->create([
            'recipient_name' => $user->name,
            'recipient_phone' => $address->phone,
            'recipient_address' => $address->street_address,
            'province' => $address->province,
            'district' => $address->district,
            'ward' => $address->ward,
            'shipping_fee' => $shippingFee,
            'total_price' => $totalPrice,
            'status' => 'pending',
            'payment_method' => $data['payment_method'],
            'is_paid' => false,
        ]);

        // Tạo các order_items
        foreach ($cartItems as $item) {
            $variant = $item->variant;

            $order->orderItems()->create([
                'variant_id' => $variant->id,
                'variant_name' => $variant->name,
                'price' => $variant->price,
                'quantity' => $item->quantity,
            ]);

            // Giảm tồn kho
            $variant->decrement('stock', $item->quantity);
        }

        // Xoá giỏ hàng
        $cartItems->each->delete();

        return $order;
    }

    public function getUserOrders()
    {
        return Auth::user()->orders()->latest()->with('orderItems')->get();
    }

    public function getOrderDetails($orderId)
    {
        return Auth::user()->orders()->with('orderItems')->findOrFail($orderId);
    }

    public function cancelOrder($orderId)
    {
        $order = Auth::user()->orders()->where('status', 'pending')->findOrFail($orderId);
        $order->update(['status' => 'canceled']);

        // Hoàn tồn kho
        foreach ($order->orderItems as $item) {
            $item->variant->increment('stock', $item->quantity);
        }

        return $order;
    }

    public function confirmReceived($orderId)
    {
        $user = Auth::user();
        $order = $user->orders()->where('status', 'delivering')->findOrFail($orderId);

        $updateData = ['status' => 'completed'];
        if ($order->payment_method === 'cod') {
            $updateData['is_paid'] = true;
        }

        $order->update($updateData);

        return $order;
    }
}
