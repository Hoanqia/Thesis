<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\UserEvent;
use App\Models\User;
use App\Models\Product;

class UserEventSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
            User::all()->each(function ($user) {
            Product::inRandomOrder()->take(10)->get()->each(function ($product) use ($user) {
                UserEvent::factory()->create([
                    'user_id' => $user->id,
                    'product_id' => $product->id,
                ]);
            });
        });

    }
}
