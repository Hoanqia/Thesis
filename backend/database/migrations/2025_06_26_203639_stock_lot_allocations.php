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
        Schema::create('stock_lot_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_item_id')
                  ->constrained('order_items')// Giả định bảng order_items tồn tại
                  ->onDelete('cascade');
            $table->foreignId('stock_lot_id')
                  ->constrained('stock_lots') // Giả định bảng stock_lots tồn tại
                  ->onDelete('restrict'); // Nên là restrict để không xóa lô hàng nếu còn liên kết

            $table->integer('allocated_quantity')->unsigned()->comment('Số lượng được cấp phát từ lô hàng này cho OrderItem');
            $table->decimal('unit_cost_at_allocation', 10, 2)->comment('Giá vốn đơn vị của lô tại thời điểm cấp phát (để ghi nhận snapshot)');
            
            $table->timestamps();

            // Đảm bảo không có bản ghi trùng lặp cho cùng một OrderItem và StockLot
            $table->unique(['order_item_id', 'stock_lot_id'], 'order_item_stock_lot_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_lot_allocations');
    }
};

