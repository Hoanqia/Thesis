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
        Schema::create('recommender_settings', function (Blueprint $table) {
            $table->id(); // Khóa chính tự động tăng
            $table->string('key')->unique()->comment('Tên tham số cấu hình của hệ thống gợi ý'); // Tên tham số (ví dụ: TOP_K)
            $table->string('value')->comment('Giá trị của tham số'); // Giá trị (ví dụ: 10, 0.5)
            $table->string('data_type', 50)->default('string')->comment('Kiểu dữ liệu của tham số (ví dụ: integer, float, string)'); // Để biết cách parse giá trị
            $table->string('description')->nullable()->comment('Mô tả tham số'); // Mô tả cho quản trị viên
            $table->timestamps(); // created_at và updated_at
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recommender_settings');
    }
};