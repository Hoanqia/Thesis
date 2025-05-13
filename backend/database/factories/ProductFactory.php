<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Brand;
use App\Models\Category;
use Illuminate\Support\Str;
/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition()
    {
        $name = $this->faker->word();
        return [
            'name' => $name,
            'slug' => Str::slug($name) . '-' . Str::random(5),
            'description' => $this->faker->sentence(10),
            'cat_id' => Category::inRandomOrder()->value('id') ?? 1,  // lấy id ngẫu nhiên
            'brand_id' => Brand::inRandomOrder()->value('id') ?? 1,    // lấy id ngẫu nhiên
            'is_featured' => $this->faker->boolean(30),
            'status' => $this->faker->boolean(80),
            ];
    }
}
