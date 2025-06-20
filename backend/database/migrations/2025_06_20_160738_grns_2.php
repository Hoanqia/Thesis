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
          Schema::create('grns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('purchase_order_id')->constrained('purchase_orders');
            $table->enum('type',['purchase']);
            $table->decimal('total_amount',13,2)->unsigned();
            $table->enum('status',['pending','confirmed','cancelled'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
       Schema::create('grn_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grn_id')->constrained('grns')->cascadeOnDelete();
            $table->foreignId('purchase_order_item_id')->constrained('purchase_order_items');
            $table->unsignedInteger('quantity')->default(0);
            $table->decimal('unit_cost',13,2)->unsigned();
            $table->decimal('subtotal',13,2)->unsigned();
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
