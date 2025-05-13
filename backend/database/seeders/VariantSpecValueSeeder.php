<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\VariantSpecValue;

class VariantSpecValueSeeder extends Seeder
{
    public function run()
    {
        VariantSpecValue::factory()->count(30)->create();
    }
}
