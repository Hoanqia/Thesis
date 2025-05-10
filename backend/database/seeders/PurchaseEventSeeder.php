<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\OrderItem;
use App\Models\UserEvent;
class PurchaseEventSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $orderItems = OrderItem::with('order')->get();
        $count = 0;

        foreach ($orderItems as $item) {
            $userId = $item->order->user_id;
            $productId = $item->product_id;

            // Không tạo nếu đã tồn tại
            if (!UserEvent::where('user_id', $userId)
                ->where('product_id', $productId)
                ->where('event_type', 'purchase')
                ->exists()) {
                
                UserEvent::create([
                    'user_id' => $userId,
                    'product_id' => $productId,
                    'event_type' => 'purchase',
                    'value' => null,
                    'created_at' => $item->order->created_at ?? now(),
                ]);
                $count++;
            }
        }

        echo "Đã tạo $count sự kiện 'purchase'.\n";
    }
}
