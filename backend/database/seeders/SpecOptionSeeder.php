<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SpecOption;
use App\Models\Specification;

class SpecOptionSeeder extends Seeder
{
    public function run()
    {
        $specs = Specification::where('data_type', 'option')->get();

        foreach ($specs as $spec) {
            SpecOption::factory()->count(3)->create([
                'spec_id' => $spec->id,
            ]);
        }
    }
}

