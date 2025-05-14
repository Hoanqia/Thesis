<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Voucher;

class VoucherSeeder extends Seeder
{
    public function run(): void
    {
        // Tạo 5 voucher loại giảm giá sản phẩm
        Voucher::factory()->count(5)->create([
            'type' => 'product_discount',
        ]);

        // Tạo 5 voucher loại giảm giá vận chuyển
        Voucher::factory()->count(5)->create([
            'type' => 'shipping_discount',
        ]);
    }
}
