<?php

namespace Database\Factories;

use App\Models\Specification;
use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

class SpecificationFactory extends Factory
{
    protected $model = Specification::class;

    public function definition()
    {
        $dataTypes = ['int', 'decimal', 'text', 'option'];
        $type = $this->faker->randomElement($dataTypes);

        return [
            'category_id' => Category::inRandomOrder()->first()?->id ?? Category::factory(),  // Sử dụng inRandomOrder thay cho factory
            'name' => $this->faker->unique()->randomElement([
                'RAM', 'CPU', 'Color', 'Weight', 'Storage', 'Processor', 'Display', 'Battery', 'Graphics', 'Network', 'Camera'
            ]),
            'data_type' => $type,
            'unit' => $type !== 'option' ? $this->faker->randomElement(['GB', 'GHz', 'kg', null]) : null,
            'description' => $this->faker->optional()->sentence(),
        ];
    }
}
