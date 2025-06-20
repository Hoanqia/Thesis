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

        Schema::create('supplier_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->foreignId('variant_id')->constrained('product_variants')->cascadeOnDelete(); 
            $table->string('supplier_sku')->nullable()->comment('Mã SKU của sản phẩm theo nhà cung cấp');
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
            $table->enum('status',['pending','confirmed','received'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('variant_id')->constrained('product_variants');
            $table->unsignedInteger('ordered_quantity');
            $table->unsignedInteger('received_quantity')->default(0);
            $table->decimal('unit_cost',13,2)->unsigned();
            $table->decimal('subtotal',13,2)->unsigned();
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
             Schema::create('product_variants', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
                $table->string('sku')->unique(); // mã phân biệt từng phiên bản
                $table->decimal('price', 10, 2)->unsigned();
                $table->decimal('average_cost', 13, 2)->unsigned()->default(0); // <-- THÊM CỘT NÀY
                $table->integer('profit_percent')->unsigned()->default(0); // Tỷ lệ lợi nhuận mong muốn
                $table->unsignedInteger('stock')->default(0);
                $table->string('image')->nullable();
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
