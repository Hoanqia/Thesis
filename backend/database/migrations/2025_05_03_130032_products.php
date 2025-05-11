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
        Schema::create('products', function (Blueprint $table) {
            $table->id(); // bigIncrements
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2)->unsigned();
            $table->decimal('discount',10,2)->unsigned();
            $table->unsignedInteger('stock')->default(0);
            $table->foreignId('cat_id')
            ->constrained('categories')
            ->restrictOnDelete();
            $table->foreignId('brand_id')
            ->constrained('brands')
            ->restrictOnDelete();
            $table->boolean('is_featured')->default(false);          
            $table->boolean('status')->default(true);
            $table->timestamps();
            
        });

        
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_images');
        Schema::dropIfExists('products');
    }
};
