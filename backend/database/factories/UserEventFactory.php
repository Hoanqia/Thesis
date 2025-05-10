<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\UserEvent;
use App\Models\User;
use App\Models\Product;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Facades\DB;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\UserEvent>
 */
class UserEventFactory extends Factory
{
    protected $model = UserEvent::class;

    public function definition(): array
    {
        $eventType = $this->faker->randomElement(['view', 'add_to_cart', 'rate']);
        $value = $eventType === 'rate' ? $this->faker->numberBetween(1, 5) : null;

        return [
            'user_id' => User::inRandomOrder()->value('id') ?? 1,
            'product_id' => Product::inRandomOrder()->value('id') ?? 1,
            'event_type' => $eventType,
            'value' => $value,
            'created_at' => $this->faker->dateTimeThisMonth(),
        ];
    }
}
