<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up(): void
    {
        Schema::create('product_summaries', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('product_id')->unique();
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');

            $table->string('name', 255);
            $table->string('slug', 255)->unique();
            $table->string('image_url', 500)->nullable();
            $table->decimal('price', 10, 2)->nullable();
            $table->decimal('discount', 10, 2)->nullable();

            $table->string('brand_name', 255)->nullable();
            $table->string('category_name', 255)->nullable();

            $table->unsignedInteger('reviews_count')->default(0);
            $table->decimal('reviews_avg_rate', 3, 2)->nullable();

            $table->json('denormalized_specs')->nullable();

            $table->boolean('is_featured')->default(false);
            $table->string('status', 50)->default('active');
            
            $table->index('slug');
            $table->index('brand_name');
            $table->index('category_name');
            $table->index('reviews_avg_rate');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down(): void
    {
        Schema::dropIfExists('product_summaries');
    }
};