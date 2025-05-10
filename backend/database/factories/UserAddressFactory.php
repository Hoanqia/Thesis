<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\UserAddress;
use App\Models\User;
/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\UserAddress>
 */
class UserAddressFactory extends Factory
{
    
    protected $model = UserAddress::class;  
    public function definition(): array
    {
        return [
            'user_id' => User::inRandomOrder()->value('id') ?? 1,
            'province' => $this->faker->state(),
            'district' => $this->faker->city(),
            'ward' => $this->faker->streetName(),
            'street_address' => $this->faker->streetAddress(),
            'phone' => $this->faker->phoneNumber(),
            'is_default' => $this->faker->boolean(30),

        ];
    }
}
