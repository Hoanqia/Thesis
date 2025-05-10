<?php

namespace App\Service;
use App\Models\ReservedStock;
use Carbon\Carbon;

class ReservedStockService {
    public function reserveStockBeforeOrder($user, $cartItems)
    {
        foreach ($cartItems as $item) {
            $product = $item->product;

            // Kiểm tra số lượng tồn kho
            if ($product->stock < $item->quantity) {
                throw new \Exception("Sản phẩm {$product->name} không đủ hàng.");
            }

            // Tạo bản ghi giữ hàng
            ReservedStock::create([
                'product_id' => $product->id,
                'user_id' => $user->id,
                'quantity' => $item->quantity,
                'expires_at' => Carbon::now()->addMinutes(30), // Giữ trong 30 phút
            ]);
        }
    }
}

