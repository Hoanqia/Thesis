<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Specification;
use App\Models\SpecOption;
use App\Models\VariantSpecValue;

class SpecificationSeeder extends Seeder
{
    public function run()
    {
        // Tạo 10 bản ghi Specification
        Specification::factory()->count(10)->create()->each(function ($specification) {
            // Tạo 2 SpecOptions cho mỗi Specification
            SpecOption::factory()->count(2)->create([
                'spec_id' => $specification->id,
            ]);

            // Tạo 5 VariantSpecValue cho mỗi Specification
            VariantSpecValue::factory()->count(5)->create([
                'spec_id' => $specification->id,
            ]);
        });
    }
}
