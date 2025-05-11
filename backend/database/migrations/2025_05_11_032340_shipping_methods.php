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
         Schema::create('shipping_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Tên phương thức vận chuyển
            $table->decimal('fee', 10, 2); // Phí vận chuyển tĩnh cho phương thức này
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipping_methods');
    }
};
