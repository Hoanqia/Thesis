<?php

namespace App\Services;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;


class CustomerOrderService {
    public function createOrder(array $data){
            $user = Auth::user();
            $cart = Cart::where('user_id', $user->id)->firstOrFail();
            $cartItems = $cart->cartItems;

            if ($cartItems->isEmpty()) {
                throw new \Exception("Giỏ hàng trống.");
            }
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
            $totalPrice = $cartItems->sum(fn($item) => $item->product->price * $item->quantity);
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
                'grand_total' => $grandTotal,
                'status' => 'pending',
                'payment_method' => $data['payment_method'],
                'is_paid' => false,
            ]);

            // Tạo từng order_item
            foreach ($cartItems as $item) {
                $order->orderItems()->create([
                    'product_id' => $item->product->id,
                    'product_name' => $item->product->name,
                    'price' => $item->product->price,
                    'quantity' => $item->quantity,
                    'total' => $item->product->price * $item->quantity,
                ]);

                // Giảm số lượng tồn kho
                $item->product->decrement('stock', $item->quantity);
            }

            // Xoá giỏ hàng
            $cartItems->each->delete();

            return $order;
    }
    public function getUserOrders(){
        return Auth::user()->orders()->latest()->with('orderItems')->get();
    }
    public function getOrderDetails($orderId){
        $order = Auth::user()->orders()->with('orderItems')->findOrFail($orderId);
        return $order;
    }
    public function cancelOrder($orderId){
        $order = Auth::user()->orders()->where('status', 'pending')->findOrFail($orderId);

        $order->update(['status' => 'canceled']);

        // Hoàn lại số lượng sản phẩm
        foreach ($order->orderItems as $item) {
            Product::where('id', $item->product_id)->increment('stock', $item->quantity);
        }

        return $order;
    }
    public function markAsPaid($orderId){
        $order = Auth::user()->orders()->findOrFail($orderId);

        $order->update(['is_paid' => true]);

        return $order;
    }



}