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
        Schema::create('variants_from_supplier', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->foreignId('variant_id')->constrained('product_variants')->cascadeOnDelete(); 
            $table->string('variant_supplier_sku')->nullable()->comment('Mã SKU của sản phẩm theo nhà cung cấp');
            $table->decimal('current_purchase_price', 13, 2)->unsigned()->comment('Giá mua hiện tại từ nhà cung cấp này');
            $table->boolean('is_active')->default(true)->comment('Sản phẩm còn được cung cấp bởi NCC này');
            $table->unique(['supplier_id', 'variant_id']);
            $table->timestamps();
        });     

        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('supplier_id')->constrained('suppliers');
            $table->date('expected_delivery_date');
            $table->date('actual_delivery_date')->nullable();
            $table->decimal('total_amount',13,2)->unsigned();
            $table->enum('status',['pending','confirmed','partially_received','received'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
          Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained('purchase_orders')->cascadeOnDelete();
            $table->foreignId('variant_id')->constrained('product_variants');
            $table->unsignedInteger('ordered_quantity');
            $table->unsignedInteger('received_quantity')->default(0);
            $table->decimal('unit_cost',13,2)->unsigned();
            $table->decimal('subtotal',13,2)->unsigned();
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
