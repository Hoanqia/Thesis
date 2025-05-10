<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\UserEvent;

class UserEventSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
         // Kiểm tra xem có user và product trước không
         if (\App\Models\User::count() === 0 || \App\Models\Product::count() === 0) {
            $this->command->warn('⚠️  Vui lòng seed users và products trước khi seed user_events.');
            return;
        }

        UserEvent::factory()->count(300)->create(); // số lượng tuỳ ý bạn
    }
}
