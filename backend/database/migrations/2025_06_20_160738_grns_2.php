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

          Schema::create('stock_lots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->foreignId('grn_item_id')->nullable()->constrained('grn_items')->cascadeOnDelete()->comment('Tham chiếu đến GRN item đã tạo lô này');
            $table->string('reference_type')->nullable()->comment('Tên bảng tham chiếu (GRN, SO, ...)');
            $table->unsignedBigInteger('reference_id')->nullable()->comment('ID bản ghi tham chiếu');
            $table->index(['reference_type','reference_id']);
            $table->unsignedInteger('quantity_in')->comment('Số lượng nhập vào của lô này');
            $table->unsignedInteger('quantity_out')->default(0)->comment('Số lượng đã xuất từ lô này');
            $table->decimal('unit_cost', 13, 2)->unsigned()->comment('Giá vốn đơn vị của lô này');
            $table->timestamp('purchase_date')->useCurrent()->comment('Ngày nhập lô hàng'); // Dùng timestamp thay vì date để có cả giờ phút giây
            $table->timestamps();

            // Thêm index để truy vấn nhanh hơn
            $table->index(['variant_id', 'purchase_date']);
        });
        
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
