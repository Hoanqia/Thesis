<?php

namespace Database\Factories;

use App\Models\VariantSpecValue;
use App\Models\Variant;
use App\Models\Specification;
use App\Models\SpecOption;
use Illuminate\Database\Eloquent\Factories\Factory;

class VariantSpecValueFactory extends Factory
{
    protected $model = VariantSpecValue::class;

    public function definition()
    {
        $dataTypes = ['int', 'decimal', 'text', 'option'];
        $type = $this->faker->randomElement($dataTypes);

        // Lấy random spec_id phù hợp với kiểu dữ liệu (nếu muốn chính xác hơn)
        $spec = Specification::inRandomOrder()->first();

        return [
            'variant_id' => Variant::inRandomOrder()->first()?->id,
            'spec_id' => $spec?->id,
            'value_text' => $type === 'text' ? $this->faker->sentence() : null,
            'value_int' => $type === 'int' ? $this->faker->numberBetween(1, 32) : null,
            'value_decimal' => $type === 'decimal' ? $this->faker->randomFloat(2, 1, 100) : null,
            'option_id' => $type === 'option' ? SpecOption::inRandomOrder()->first()?->id : null,
        ];
    }
}
