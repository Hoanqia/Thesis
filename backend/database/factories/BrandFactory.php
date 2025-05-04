<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use App\Models\Brand;

class BrandFactory extends Factory
{
    protected $model = Brand::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->company, // Sử dụng faker để tạo tên công ty
            'slug' => Str::slug($this->faker->company), // Tạo slug từ tên công ty
            'status' => $this->faker->boolean, // Trạng thái ngẫu nhiên (true hoặc false)
        ];
    }
}
