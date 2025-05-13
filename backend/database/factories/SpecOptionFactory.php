<?php

namespace Database\Factories;

use App\Models\SpecOption;
use App\Models\Specification;
use Illuminate\Database\Eloquent\Factories\Factory;

class SpecOptionFactory extends Factory
{
    protected $model = SpecOption::class;

    public function definition()
    {
        return [
            'spec_id' => Specification::inRandomOrder()->first()?->id, // Lấy spec có sẵn
            'value' => $this->faker->unique()->word(),
        ];
    }
}
