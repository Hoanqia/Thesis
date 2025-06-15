<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\UserAddress;
use App\Models\User;

class UserAddressSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::all();
        foreach ($users as $user) {
            if($user->id == 7 && $user->id == 10){
                continue;
            }
            UserAddress::factory()->count(2)->create([
                'user_id' => $user->id,
            ]);
        }    
    }
}
