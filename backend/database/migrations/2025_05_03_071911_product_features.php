<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('product_features', function (Blueprint $table) {
            $table->id('feature_id');
            $table->unsignedBigInteger('product_id');
            $table->string('feature_name');
            $table->string('feature_value');
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->index('product_id');
        });
    }

    public function down(): void {
        Schema::dropIfExists('product_features');
    }
};

