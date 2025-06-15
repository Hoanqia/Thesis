<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Order;
use App\Models\User;
use App\Models\UserAddress;
use App\Models\Voucher;
use App\Models\OrderItem;
use App\Models\Variant;
use App\Models\UserEvent;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Review;

class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        $user = User::inRandomOrder()->first();
        $address = UserAddress::where('user_id', $user->id)
                    ->inRandomOrder()
                    ->first();

        $productVoucher  = Voucher::where('type', 'product_discount')
                                 ->inRandomOrder()
                                 ->first();
        $shippingVoucher = Voucher::where('type', 'shipping_discount')
                                 ->inRandomOrder()
                                 ->first();

        return [
            'user_id'             => $user->id,
            'recipient_name'      => $user->name,
            'recipient_phone'     => $address->phone,
            'recipient_address'   => $address->street_address,
            'province'            => $address->province_name,
            'district'            => $address->district_name,
            'ward'                => $address->ward_name,
            'shipping_id'         => 3,
            'shipping_fee'        => 40000,
            'total_price'         => 0,
            'product_voucher_id'  => optional($productVoucher)->id,
            'shipping_voucher_id' => optional($shippingVoucher)->id,
            'discount_on_products'=> 0,
            'discount_on_shipping'=> 0,
            'status'              => 'pending',
            'payment_method'      => 'cod',
            'is_paid'             => 1,
        ];
    }

    public function configure()
    {
        return $this->afterCreating(function (Order $order) {
            // Always create a fresh cart for isolation
            $cart = Cart::firstOrCreate(['user_id' => $order->user_id]);
            $cart->cartItems()->delete();

            // Pick distinct variants to avoid duplicates
            $count = rand(1, 3);
            $variants = Variant::inRandomOrder()->take($count)->get();

            $productsTotal = 0;

            foreach ($variants as $variant) {
                // Add to cart
                CartItem::create([
                    'cart_id'       => $cart->id,
                    'variant_id'    => $variant->id,
                    'quantity'      => 2,
                    'price_at_time' => $variant->price,
                    'expires_at'    => now()->addDay(),
                ]);
                UserEvent::create([
                    'user_id'    => $order->user_id,
                    'product_id' => $variant->product_id,
                    'event_type' => 'add_to_cart',
                    'value'      => 3,
                    'created_at' => now(),
                ]);

                // Create order item
                $item = OrderItem::create([
                    'order_id'     => $order->id,
                    'variant_id'   => $variant->id,
                    'variant_name' => $variant->full_name,
                    'price'        => $variant->price,
                    'quantity'     => 2,
                ]);
                UserEvent::create([
                    'user_id'    => $order->user_id,
                    'product_id' => $variant->product_id,
                    'event_type' => 'purchase',
                    'value'      => null,
                    'created_at' => now(),
                ]);

                // Create review
                $rate = rand(1, 5);
                $messages = $rate < 4
                    ? ['Tạm được', 'Khá tệ', 'Chưa hài lòng']
                    : ['Sản phẩm rất tốt', 'OK', 'Rất chất lượng'];
                $message = $messages[array_rand($messages)];

                Review::create([
                    'user_id'    => $order->user_id,
                    'product_id' => $variant->product_id,
                    'variant_id' => $variant->id,
                    'message'    => $message,
                    'rate'       => $rate,
                    'admin_reply'=> null,
                    'status'     => 1, // Approved
                ]);
                UserEvent::create([
                    'user_id'    => $order->user_id,
                    'product_id' => $variant->product_id,
                    'event_type' => 'rate',
                    'value'      => $rate,
                    'created_at' => now(),
                ]);

                $productsTotal += $item->price * $item->quantity;
            }

            // Calculate discounts
            $productVoucher  = Voucher::find($order->product_voucher_id);
            $shippingVoucher = Voucher::find($order->shipping_voucher_id);
            $discountProducts = $productVoucher ? $productsTotal * ($productVoucher->discount_percent / 100) : 0;
            $discountShipping = $shippingVoucher ? $order->shipping_fee * ($shippingVoucher->discount_percent / 100) : 0;

            // Update order totals
            $order->update([
                'discount_on_products' => $discountProducts,
                'discount_on_shipping' => $discountShipping,
                'total_price'          => $productsTotal + $order->shipping_fee - $discountProducts - $discountShipping,
            ]);
        });
    }
} 
