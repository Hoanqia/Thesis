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
        Schema::create('categories', function (Blueprint $table) {
            $table->id(); // BIGINT + AUTO_INCREMENT + PRIMARY KEY
            $table->string('name', 255);
            $table->string('slug')->unique();
            $table->foreignId('id_parent')
                ->nullable()
                ->constrained('categories')
                ->cascadeOnDelete();
            $table->boolean('status')->default(true);
            $table->timestamps(); // thêm created_at, updated_at (nên có)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
