<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User; // Import model User
use App\Models\Order; // Import model Order

class OrderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // === RẤT QUAN TRỌNG: Đảm bảo các Seeder cần thiết khác đã chạy trước OrderSeeder ===
        // Nếu bạn đang gọi OrderSeeder riêng lẻ, hãy đảm bảo các Seeder sau đã được gọi:
        // UserSeeder, ProductSeeder (để có Variants), UserAddressSeeder, VoucherSeeder.
        // Thông thường, bạn sẽ gọi chúng từ DatabaseSeeder.php theo đúng thứ tự.
        // Ví dụ trong DatabaseSeeder:
        // $this->call([
        //     UserSeeder::class,
        //     ProductSeeder::class, // ProductSeeder cần tạo Variants
        //     UserAddressSeeder::class,
        //     VoucherSeeder::class,
        //     // ... các seeder khác ...
        //     OrderSeeder::class, // Cuối cùng gọi OrderSeeder
        // ]);

        // Lấy tất cả người dùng hiện có trong database
        $users = User::whereNotIn('id', [162, 163])->get();

        // Kiểm tra xem có người dùng nào không để tránh lỗi nếu UserSeeder chưa chạy
        if ($users->isEmpty()) {
            echo "No users found. Please ensure UserSeeder runs before OrderSeeder.\n";
            return;
        }

        // Định nghĩa số lượng order tối thiểu và tối đa cho mỗi user
        // Đã tăng số lượng đơn hàng để tạo ra nhiều dữ liệu UserEvent hơn
        $minOrdersPerUser = 5; // Tăng số lượng đơn hàng tối thiểu cho mỗi người dùng
        $maxOrdersPerUser = 10; // Tăng số lượng đơn hàng tối đa cho mỗi người dùng để tạo nhiều dữ liệu hơn

        echo "Seeding orders for " . $users->count() . " users...\n";

        // Lặp qua từng người dùng để đảm bảo mỗi người có đủ số orders
        foreach ($users as $user) {
            // Tạo ngẫu nhiên từ $minOrdersPerUser đến $maxOrdersPerUser đơn hàng cho user hiện tại.
            // Mỗi lần gọi `create()` sẽ kích hoạt `OrderFactory` để tạo một `Order`,
            // và trong `OrderFactory` sẽ tạo `OrderItem` và `UserEvent` liên quan
            // với các tỷ lệ sự kiện đã được điều chỉnh.
            $numOrdersCreated = rand($minOrdersPerUser, $maxOrdersPerUser);
            Order::factory()->count($numOrdersCreated)->create([
                'user_id' => $user->id, // Ghi đè user_id để đảm bảo order thuộc về user này
            ]);
            echo "    - Created " . $numOrdersCreated . " orders for User ID: " . $user->id . "\n";
        }

        echo "Finished seeding orders.\n";
    }
}