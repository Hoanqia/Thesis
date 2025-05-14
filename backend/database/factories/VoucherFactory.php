<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class VoucherFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code' => strtoupper($this->faker->bothify('VC###??')),
            'discount_percent' => $this->faker->numberBetween(5, 50),
            'minimum_order_amount' => $this->faker->randomFloat(2, 50, 500),
            'type' => $this->faker->randomElement(['product_discount', 'shipping_discount']),
            'start_date' => now(),
            'end_date' => now()->addDays(30),
            'max_uses' => $this->faker->numberBetween(10, 100),
            'used_count' => 0,
            'status' => 1,
        ];
    }
}
