<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
         Schema::create('vouchers', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // Mã giảm giá

            $table->enum('type', ['product_discount', 'shipping_discount']);

            $table->integer('discount_percent')->nullable();       // VD: 10 (%)

            $table->decimal('minimum_order_amount', 10, 2)->default(0); // Đơn hàng tối thiểu

            // Hạn sử dụng
            $table->dateTime('start_date');
            $table->dateTime('end_date');

            // Giới hạn lượt sử dụng
            $table->integer('max_uses')->nullable(); // Null = không giới hạn
            $table->integer('used_count')->default(0); // Theo dõi số lượt đã dùng

            $table->boolean('status')->default(true); // Có đang hoạt động không

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vouchers');
    }
};
