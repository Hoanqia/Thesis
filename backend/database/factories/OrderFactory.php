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
use Carbon\Carbon; // Đảm bảo đã import Carbon

class OrderFactory extends Factory
{
    protected $model = Order::class;

    // Định nghĩa các hằng số xác suất cho từng loại sự kiện
    // Các giá trị này là xác suất để một sự kiện X xảy ra cho mỗi sản phẩm được mua
    // Bạn có thể tinh chỉnh các số này để đạt được tỷ lệ tổng thể mong muốn
    const PROB_VIEW = 0.95; // Hầu hết các sản phẩm được mua đều đã được xem
    const PROB_ADD_TO_CART = 0.6; // Khoảng 60% các sản phẩm được mua đã từng được thêm vào giỏ hàng
    const PROB_WISHLIST = 0.4;    // Khoảng 40% các sản phẩm được mua đã từng được thêm vào wishlist
    const PROB_RATE = 0.7;        // Khoảng 70% các sản phẩm đã mua được đánh giá

    public function definition(): array
    {
        $user = User::inRandomOrder()->first();
        $address = UserAddress::where('user_id', optional($user)->id)->inRandomOrder()->first();

        if (!$user || !$address) {
            throw new \Exception("User or UserAddress not found for OrderFactory. Ensure your database is seeded with Users and UserAddresses before seeding Orders.");
        }

        $productVoucher  = Voucher::where('type', 'product_discount')->inRandomOrder()->first();
        $shippingVoucher = Voucher::where('type', 'shipping_discount')->inRandomOrder()->first();

        // Tạo một thời điểm ngẫu nhiên trong 1 năm qua, và đảm bảo nó ở múi giờ 'Asia/Ho_Chi_Minh'
        $createdAt = Carbon::parse($this->faker->dateTimeBetween('-1 year', 'now'))
                             ->timezone('Asia/Ho_Chi_Minh');

        return [
            'user_id'           => $user->id,
            'recipient_name'    => $user->name,
            'recipient_phone'   => $address->phone,
            'recipient_address' => $address->street_address,
            'province'          => $address->province_name,
            'district'          => $address->district_name,
            'ward'              => $address->ward_name,
            'shipping_id'       => 3,
            'shipping_fee'      => 40000,
            'total_price'       => 0,
            'product_voucher_id' => optional($productVoucher)->id,
            'shipping_voucher_id' => optional($shippingVoucher)->id,
            'discount_on_products' => 0,
            'discount_on_shipping' => 0,
            'status'            => 'pending',
            'payment_method'    => 'cod',
            'is_paid'           => 1,
            'created_at'        => $createdAt, // Sử dụng thời điểm đã được đặt múi giờ
            'updated_at'        => $createdAt, // updated_at cũng nên theo created_at hoặc sau đó một chút
        ];
    }

    public function configure()
    {
        return $this->afterCreating(function (Order $order) {
            // Sử dụng created_at của Order làm mốc thời gian cho sự kiện 'purchase'
            // created_at của Order đã được đảm bảo là 'Asia/Ho_Chi_Minh'
            $purchaseTime = $order->created_at;

            $cart = Cart::firstOrCreate(['user_id' => $order->user_id]);
            $cart->cartItems()->delete();

            $minOrderItems = 3; // Giảm min order items để có nhiều đơn hàng nhỏ hơn
            $maxOrderItems = 10; // Giảm max order items để có nhiều đơn hàng nhỏ hơn
            $numOrderItems = rand($minOrderItems, $maxOrderItems);

            $variants = Variant::inRandomOrder()->take($numOrderItems)->get();

            if ($variants->isEmpty()) {
                throw new \Exception("Not enough unique Variants found for OrderFactory. Ensure ProductSeeder has created enough variants.");
            }

            $productsTotal = 0;

            foreach ($variants as $variant) {
                // === Tạo UserEvent: 'view' ===
                // Một sản phẩm được mua có thể được xem nhiều lần
                $numViews = $this->faker->numberBetween(1, 5); // 1 đến 5 lượt xem
                for ($i = 0; $i < $numViews; $i++) {
                    if (rand(0, 100) / 100 < self::PROB_VIEW) { // Xác suất cao để có lượt view
                        UserEvent::create([
                            'user_id'    => $order->user_id,
                            'product_id' => $variant->product_id,
                            'event_type' => 'view',
                            'value'      => null,
                            // Thời gian ngẫu nhiên từ 1 đến 240 phút (4 giờ) trước thời điểm purchase
                            'created_at' => $purchaseTime->copy()->subMinutes(rand(1, 240)),
                        ]);
                    }
                }


                // === Tạo UserEvent: 'wishlist' ===
                if (rand(0, 100) / 100 < self::PROB_WISHLIST) {
                    UserEvent::create([
                        'user_id'    => $order->user_id,
                        'product_id' => $variant->product_id,
                        'event_type' => 'wishlist',
                        'value'      => 2,
                        // Thời gian ngẫu nhiên từ 1 đến 60 phút trước thời điểm purchase
                        'created_at' => $purchaseTime->copy()->subMinutes(rand(1, 60)),
                    ]);
                }

                // === Tạo UserEvent: 'add_to_cart' ===
                if (rand(0, 100) / 100 < self::PROB_ADD_TO_CART) {
                    UserEvent::create([
                        'user_id'    => $order->user_id,
                        'product_id' => $variant->product_id,
                        'event_type' => 'add_to_cart',
                        'value'      => 3,
                        // Thời gian ngẫu nhiên từ 1 đến 15 phút trước thời điểm purchase
                        'created_at' => $purchaseTime->copy()->subMinutes(rand(1, 15)),
                    ]);

                    // Optional: Thêm vào CartItem nếu bạn muốn mô phỏng cả quá trình giỏ hàng
                    CartItem::create([
                        'cart_id'       => $cart->id,
                        'variant_id'    => $variant->id,
                        'quantity'      => rand(1, 2),
                        'price_at_time' => $variant->price,
                        // now() ở đây sẽ dùng múi giờ mặc định của ứng dụng (hoặc múi giờ đã cấu hình)
                        'expires_at'    => Carbon::now('Asia/Ho_Chi_Minh')->addDay(),
                    ]);
                }


                // === Tạo OrderItem ===
                $quantity = rand(1, 2); // Giảm số lượng tối đa mỗi sản phẩm trong OrderItem
                $item = OrderItem::create([
                    'order_id'     => $order->id,
                    'variant_id'   => $variant->id,
                    'variant_name' => $variant->full_name,
                    'price'        => $variant->price,
                    'quantity'     => $quantity,
                ]);

                // === Tạo UserEvent: 'purchase' ===
                // Luôn tạo sự kiện purchase vì đây là AfterCreating Order, tức là order đã được tạo
                UserEvent::create([
                    'user_id'    => $order->user_id,
                    'product_id' => $variant->product_id,
                    'event_type' => 'purchase',
                    'value'      => null,
                    'created_at' => $purchaseTime, // Sử dụng thời điểm purchase của Order đã có múi giờ
                ]);

                // === Tạo Review và UserEvent: 'rate' ===
                if (rand(0, 100) / 100 < self::PROB_RATE) {
                    $rate = rand(1, 5);
                    $messages = $rate < 4
                        ? ['Tạm được', 'Khá tệ', 'Chưa hài lòng']
                        : ['Sản phẩm rất tốt', 'OK', 'Rất chất lượng'];
                    $message = $messages[array_rand($messages)];

                    Review::create([
                        'user_id'     => $order->user_id,
                        'product_id'  => $variant->product_id,
                        'variant_id'  => $variant->id,
                        'message'     => $message,
                        'rate'        => $rate,
                        'admin_reply' => null,
                        'status'      => 1, // Approved
                    ]);

                    UserEvent::create([
                        'user_id'    => $order->user_id,
                        'product_id' => $variant->product_id,
                        'event_type' => 'rate',
                        'value'      => $rate,
                        // Rate sau khi mua, ngẫu nhiên từ 1 đến 240 phút (4 giờ) sau thời điểm purchase
                        'created_at' => $purchaseTime->copy()->addMinutes(rand(1, 240)),
                    ]);
                }

                $productsTotal += $item->price * $item->quantity;
            }

            $productVoucher  = Voucher::find($order->product_voucher_id);
            $shippingVoucher = Voucher::find($order->shipping_voucher_id);
            $discountProducts = $productVoucher ? $productsTotal * ($productVoucher->discount_percent / 100) : 0;
            $discountShipping = $shippingVoucher ? $order->shipping_fee * ($shippingVoucher->discount_percent / 100) : 0;

            $order->update([
                'discount_on_products' => $discountProducts,
                'discount_on_shipping' => $discountShipping,
                'total_price'          => $productsTotal + $order->shipping_fee - $discountProducts - $discountShipping,
            ]);
        });
    }
}