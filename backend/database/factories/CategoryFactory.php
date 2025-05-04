<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use App\Models\Category;

class CategoryFactory extends Factory
{
    protected $model = Category::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->word, // Tạo một từ ngẫu nhiên
            'slug' => Str::slug($this->faker->word), // Tạo slug từ từ ngẫu nhiên
            'id_parent' => $this->faker->optional()->randomElement(Category::pluck('id')->toArray()), // Lựa chọn ngẫu nhiên id của category cha
            'status' => $this->faker->boolean, // Trạng thái ngẫu nhiên (true hoặc false)
        ];
    }
}
