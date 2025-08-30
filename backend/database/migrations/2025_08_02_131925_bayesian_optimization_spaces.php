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
        Schema::create('bayesian_optimization_spaces', function (Blueprint $table) {
            $table->id();
            $table->string('param_name')->unique()->comment('Tên trọng số cần tối ưu');
            $table->string('param_type', 20)->comment('Loại tham số (ví dụ: Real, Integer)');
            $table->decimal('min_value', 8, 5)->nullable()->comment('Giá trị tối thiểu của khoảng tìm kiếm');
            $table->decimal('max_value', 8, 5)->nullable()->comment('Giá trị tối đa của khoảng tìm kiếm');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
