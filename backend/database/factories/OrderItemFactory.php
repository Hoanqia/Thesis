<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Order;
/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\OrderItem>
 */
class OrderItemFactory extends Factory
{
    protected $model = OrderItem::class;

    public function definition(): array
    {
        return [
            'order_id' => Order::inRandomOrder()->value('id'),
            'product_id' => Product::inRandomOrder()->value('id'),
            'product_name' => $this->faker->word(),
            'price' => $this->faker->randomFloat(2, 10, 100),
            'quantity' => $this->faker->numberBetween(1, 10),
            'total' => $this->faker->randomFloat(2, 10, 1000),
        ];
    }
}
