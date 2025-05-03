<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('item_similarity', function (Blueprint $table) {
            $table->id('sim_id');
            $table->unsignedBigInteger('product_id_1');
            $table->unsignedBigInteger('product_id_2');
            $table->decimal('score', 5, 4); // Ví dụ: 0.8750

            $table->foreign('product_id_1')->references('id')->on('products')->cascadeOnDelete();
            $table->foreign('product_id_2')->references('id')->on('products')->cascadeOnDelete();

            $table->unique(['product_id_1', 'product_id_2']); // tránh trùng
            $table->index(['product_id_1']);
            $table->index(['product_id_2']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('item_similarity');
    }
};
