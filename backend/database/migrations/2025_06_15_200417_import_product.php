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
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone');
            $table->text('address');
            $table->timestamps();
        });
        Schema::create('grns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('supplier_id')->constrained('suppliers');
            $table->enum('type',['purchase']);
            $table->date('expected_delivery_date')->nullable();
            $table->decimal('total_amount',13,2)->unsigned();
            $table->enum('status',['pending','confirmed','cancelled'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
        Schema::create('grn_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grn_id')->constrained('grns')->cascadeOnDelete();
            $table->foreignId('variant_id')->constrained("product_variants");
            $table->unsignedInteger('ordered_quantity');
            $table->decimal('unit_cost',13,2)->unsigned();
            $table->decimal('subtotal',13,2)->unsigned();
            $table->unsignedInteger('received_quantity')->default(0);
            $table->timestamps();
        });
        // Schema::create('GRNs', function (Blueprint $table) {
        //     $table->id();
        //     $table->foreignId('purchase_order_id')->constrained('purchase_orders');
        //     $table->foreignId('received_by_user_id')->constrained('users');
        //     $table->text('notes')->nullable();
        //     $table->timestamps();
        // });
        // Schema::create('GRN_items', function (Blueprint $table) {
        //     $table->id();
        //     $table->foreignId('GRN_id')->constrained('GRNs')->cascadeOnDelete();
        //     $table->foreignId('variant_id')->constrained('product_variants');
        //     $table->unsignedInteger('received_quantity');
        //     $table->foreignId('purchase_order_item_id')->constrained('purchase_order_items')->nullable();
        //     $table->timestamps();
        // });

        Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('variant_id')->constrained('product_variants')->cascadeOnDelete();

            $table->enum('transaction_type', [
                'IN_GRN',             // nhập hàng qua GRN
                'OUT_SALE',           // xuất bán hàng
                'ADJ_RETURN_FROM_CUSTOMER',    // trả hàng khách
                'ADJ_DAMAGE',         // hàng hỏng
                'ADJ_LOSS',           // hàng thất thoát
                'ADJ_RETURN_TO_SUPPLIER',    // trả hàng NCC
                'ADJ_FOUND'           // phát hiện thừa
            ])->comment('Loại giao dịch (có bao gồm các điều chỉnh)');
            $table->unsignedInteger('quantity')->comment('Số lượng cộng hoặc trừ tuỳ transaction_type');
            $table->string('reference_type')->nullable()->comment('Tên bảng tham chiếu (GRN, SO, ...)');
            $table->unsignedBigInteger('reference_id')->nullable()->comment('ID bản ghi tham chiếu');
            $table->foreignId('user_id')->constrained('users');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['variant_id', 'transaction_type']);
            $table->index(['reference_type', 'reference_id']);
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
