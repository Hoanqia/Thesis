<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Variant;

class ProductVariantSeeder extends Seeder
{
    public function run(): void
    {
        // Tạo mỗi product vài variant nếu muốn logic hơn
        \App\Models\Product::all()->each(function ($product) {
            Variant::factory()->count(rand(1, 3))->create([
                'product_id' => $product->id,
            ]);
        });

        // Hoặc tạo ngẫu nhiên 30 variants không gắn cố định product
        // ProductVariant::factory()->count(30)->create();
    }
}
