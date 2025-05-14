<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\Variant;
use App\Models\Voucher;
use Illuminate\Support\Facades\Auth;

class CustomerOrderService
{
   public function createOrder(array $data){
        $user = Auth::user();
        $cart = Cart::where('user_id', $user->id)->firstOrFail();
        $cartItems = $cart->cartItems;

        if ($cartItems->isEmpty()) {
            throw new \Exception("Giỏ hàng trống.");
        }

        // Lấy địa chỉ giao hàng
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

        // Tính tổng giá sản phẩm ban đầu
        $totalPrice = $cartItems->sum(function ($item) {
            return $item->price_at_time * $item->quantity;
        });

        // Lấy voucher ID từ request (nếu có)
        $productVoucherId = $data['product_voucher_id'] ?? null;
        $shippingVoucherId = $data['shipping_voucher_id'] ?? null;

        $discountOnProducts = 0;
        $discountOnShipping = 0;

        // Áp dụng giảm giá sản phẩm theo phần trăm từ voucher
        if ($productVoucherId) {
            $productVoucher = Voucher::where('id', $productVoucherId)
                ->where('type', 'product_discount')
                ->where('status', true)
                ->where('start_date', '<=', now())
                ->where('end_date', '>=', now())
                ->where(function($query) {
                    $query->whereNull('max_uses')
                        ->orWhereColumn('used_count', '<', 'max_uses');
                })
                ->first();

            if ($productVoucher) {
                $discountOnProducts = $totalPrice * ($productVoucher->discount_percent / 100);
                $productVoucher->increment('used_count');
            } else {
                throw new \Exception("Voucher giảm giá sản phẩm không hợp lệ.");
            }
        }

        // Lấy shipping_id và shipping_fee từ bảng shipping_methods
    $shippingFee = 0;
    $shippingId = $data['shipping_id'] ?? null;

    if ($shippingId) {
        $shipping = \App\Models\ShippingMethod::find($shippingId);
        if ($shipping) {
            $shippingFee = $shipping->fee;
        } else {
            throw new \Exception("Phương thức vận chuyển không hợp lệ.");
        }
    }

        // Áp dụng giảm giá phí vận chuyển theo phần trăm từ voucher
        if ($shippingVoucherId) {
            $shippingVoucher = Voucher::where('id', $shippingVoucherId)
                ->where('type', 'shipping_discount')
                ->where('status', true)
                ->where('start_date', '<=', now())
                ->where('end_date', '>=', now())
                ->where(function($query) {
                    $query->whereNull('max_uses')
                        ->orWhereColumn('used_count', '<', 'max_uses');
                })
                ->first();

            if ($shippingVoucher) {
                $discountOnShipping = $shippingFee * ($shippingVoucher->discount_percent / 100);
                $shippingVoucher->increment('used_count');
            } else {
                throw new \Exception("Voucher giảm giá vận chuyển không hợp lệ.");
            }
        }

        // Tổng tiền cuối cùng
        $grandTotal = ($totalPrice - $discountOnProducts) + ($shippingFee - $discountOnShipping);
        foreach ($cartItems as $item) {
            $variant = $item->variant;

            if ($variant->stock < $item->quantity) {
                throw new \Exception("Sản phẩm '{$variant->name}' không đủ số lượng trong kho. Còn lại: {$variant->stock}");
            }
        }
        // Tạo đơn hàng
        $order = $user->orders()->create([
            'recipient_name' => $user->name,
            'recipient_phone' => $address->phone,
            'recipient_address' => $address->street_address,
            'province' => $address->province,
            'district' => $address->district,
            'ward' => $address->ward,
            'shipping_id' => $shippingId,
            'shipping_fee' => $shippingFee,
            'total_price' => $totalPrice,
            'product_voucher_id' => $productVoucherId,
            'shipping_voucher_id' => $shippingVoucherId,
            'discount_on_products' => $discountOnProducts,
            'discount_on_shipping' => $discountOnShipping,
            'status' => 'pending',
            'payment_method' => $data['payment_method'],
            'is_paid' => false,
        ]);

        // Lưu các mặt hàng trong đơn
        foreach ($cartItems as $item) {
            $variant = $item->variant;
            $productName = $variant->product->name;
            $order->orderItems()->create([
                'variant_id' => $variant->id,
                'variant_name' => $productName,
                'price' => $variant->price,
                'quantity' => $item->quantity,
            ]);
        }

        // Xoá giỏ hàng sau khi đặt hàng
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
        $order = Auth::user()->orders()->where('status', ['pending','shipping'])->findOrFail($orderId);
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
        $order = $user->orders()->where('status', 'shipping')->where('id',$orderId)->first();
         if (!$order) {
            return null; // để controller xử lý 404
        }
        $updateData = ['status' => 'completed'];
        if ($order->payment_method === 'cod') {
            $updateData['is_paid'] = true;
        }

        $order->update($updateData);

        return $order;
    }
}
