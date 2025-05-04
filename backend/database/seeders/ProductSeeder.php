<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $brandIds = Brand::pluck('id')->toArray();
        $categoryIds = Category::pluck('id')->toArray();

        Product::factory()->count(50)->make()->each(function ($product) use ($brandIds, $categoryIds) {
            $product->brand_id = fake()->randomElement($brandIds);
            $product->cat_id = fake()->randomElement($categoryIds);
            $product->save();
        });
    }
}