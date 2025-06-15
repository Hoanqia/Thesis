<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Order;

class OrderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Tạo 10 đơn hàng mẫu cùng quy trình add-to-cart, purchase, review
        Order::factory()
             ->count(200)
             ->create();
    }
}
