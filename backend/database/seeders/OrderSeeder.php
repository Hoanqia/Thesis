<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Order;
use App\Models\OrderItem;

class OrderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Order::factory(10)->create()->each(function ($order) {
            // Tạo 3 OrderItems cho mỗi Order
            OrderItem::factory(3)->create(['order_id' => $order->id]);
        });    }
}
