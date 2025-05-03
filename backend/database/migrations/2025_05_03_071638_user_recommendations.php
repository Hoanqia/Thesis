<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('user_recommendations', function (Blueprint $table) {
            $table->id('rec_id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('product_id');
            $table->decimal('score', 5, 4)->nullable(); // điểm gợi ý
            $table->dateTime('updated_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();

            $table->unique(['user_id', 'product_id']); // tránh trùng gợi ý
            $table->index(['user_id']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('user_recommendations');
    }
};

