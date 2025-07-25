<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Product; // Đảm bảo bạn có model Product
use App\Models\UserEvent;
use Carbon\Carbon;

class UserEventMore extends Seeder
{
     /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::whereNotIn('id', [162, 163])->get();
        $products = Product::all(); // Lấy tất cả các sản phẩm có thể có

        // Đảm bảo có người dùng và sản phẩm để tạo sự kiện
        if ($users->isEmpty() || $products->isEmpty()) {
            $this->command->warn('Không có người dùng hoặc sản phẩm để tạo User Events không liên quan đến Order.');
            return;
        }

        $numInteractionsPerUser = 20; // Số lượng tương tác ngẫu nhiên mỗi người dùng
        $probNonPurchaseEvent = 0.7; // Xác suất để một sự kiện không phải purchase được tạo

        // Định nghĩa xác suất cho từng loại sự kiện (tùy chỉnh nếu cần)
        $eventProbabilities = [
            'view'        => 0.6,
            'add_to_cart' => 0.2,
            'wishlist'    => 0.2,
            // Không tạo 'purchase' và 'rate' ở đây vì chúng gắn với Order/Review
        ];

        foreach ($users as $user) {
            for ($i = 0; $i < $numInteractionsPerUser; $i++) {
                if (mt_rand(0, 100) / 100 < $probNonPurchaseEvent) {
                    $randomProduct = $products->random();
                    $eventType = array_rand($eventProbabilities); // Chọn ngẫu nhiên loại sự kiện
                    
                    // Đảm bảo tổng xác suất là 1 để tránh lỗi phân phối nếu bạn muốn chặt chẽ
                    // Ví dụ: $randomFloat = mt_rand(0, 100) / 100;
                    // if ($randomFloat < $eventProbabilities['view']) $eventType = 'view';
                    // else if ($randomFloat < $eventProbabilities['view'] + $eventProbabilities['add_to_cart']) $eventType = 'add_to_cart';
                    // ...

                    $eventValue = null;
                    if ($eventType === 'rate') { // Mặc dù không tạo rate, nhưng nếu có thể, hãy định nghĩa value
                        $eventValue = mt_rand(1, 5);
                    } elseif ($eventType === 'add_to_cart') {
                        $eventValue = 3; // Giá trị định danh cho add_to_cart
                    } elseif ($eventType === 'wishlist') {
                        $eventValue = 2; // Giá trị định danh cho wishlist
                    }

                    // Thời gian ngẫu nhiên trong 1 năm qua
                    $createdAt = Carbon::parse(fake()->dateTimeBetween('-1 year', 'now'))
                                     ->timezone('Asia/Ho_Chi_Minh');

                    UserEvent::create([
                        'user_id'    => $user->id,
                        'product_id' => $randomProduct->id,
                        'event_type' => $eventType,
                        'value'      => $eventValue,
                        'created_at' => $createdAt,
                    ]);
                }
            }
        }
    }
}
