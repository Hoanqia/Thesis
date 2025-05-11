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
        Schema::create('specifications', function (Blueprint $table) {
            $table->id('spec_id');
            $table->foreignId('category_id')->constrained('categories')->onDelete('cascade');
            $table->string('name'); // Tên thuộc tính: RAM, CPU, ...
            $table->enum('data_type', ['int', 'decimal', 'text', 'option']);
            $table->string('unit')->nullable(); // Đơn vị: GB, kg...
            $table->text('description')->nullable();
            $table->timestamps();
        });
         Schema::create('spec_options', function (Blueprint $table) {
            $table->id('option_id');
            $table->foreignId('spec_id')->constrained('specifications')->onDelete('cascade');
            $table->string('value'); // Giá trị tuỳ chọn: Đen, Trắng...
            $table->timestamps();
        });
         Schema::create('spec_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->foreignId('spec_id')->constrained('specifications')->onDelete('cascade');

            // 4 cột để lưu tuỳ theo kiểu dữ liệu
            $table->text('value_text')->nullable();     // nếu là text
            $table->integer('value_int')->nullable();   // nếu là int
            $table->decimal('value_decimal', 10, 2)->nullable(); // nếu là decimal
            $table->foreignId('option_id')->nullable()->constrained('spec_options')->onDelete('cascade'); // nếu là option

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('spec_values');
        Schema::dropIfExists('spec_options');
        Schema::dropIfExists('specifications');
    }
};
