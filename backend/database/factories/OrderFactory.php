<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Order;
use App\Models\User;
/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Order>
 */
class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        return [
            'user_id' => User::inRandomOrder()->value('id'), // Tạo user giả
            'recipient_name' => $this->faker->name(),
            'recipient_phone' => $this->faker->phoneNumber(),
            'recipient_address' => $this->faker->address(),
            'province' => $this->faker->word(),
            'district' => $this->faker->word(),
            'ward' => $this->faker->word(),
            'shipping_fee' => $this->faker->randomFloat(2, 0, 100),
            'total_price' => $this->faker->randomFloat(2, 100, 1000),
            'grand_total' => $this->faker->randomFloat(2, 100, 1000),
            'status' => $this->faker->randomElement(['pending', 'shipping', 'completed', 'canceled']),
            'payment_method' => $this->faker->randomElement(['cod', 'bank_transfer']),
            'is_paid' => $this->faker->boolean(50),
        ];
    }
}
