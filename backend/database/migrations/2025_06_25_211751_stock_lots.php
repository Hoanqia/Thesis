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


         Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');

            $table->string('recipient_name');
            $table->string('recipient_phone');
            $table->text('recipient_address');
            $table->string('province');
            $table->string('district');
            $table->string('ward');

            $table->foreignId('shipping_id')->nullable()->constrained('shipping_methods')->nullOnDelete();
            $table->decimal('shipping_fee',13,2);
            $table->decimal('total_price', 13, 2);
            $table->decimal('total_cogs ',13,2);
            $table->foreignId('product_voucher_id')->nullable()->constrained('vouchers')->nullOnDelete();
            $table->foreignId('shipping_voucher_id')->nullable()->constrained('vouchers')->nullOnDelete();

            $table->decimal('discount_on_products', 10, 2)->default(0);
            $table->decimal('discount_on_shipping', 10, 2)->default(0);

            $table->enum('status', ['pending','confirmed','shipping', 'completed', 'canceled'])->default('pending');
            $table->enum('payment_method', ['cod', 'bank_transfer']);
            $table->boolean('is_paid')->default(false);

            $table->timestamps();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();

            $table->string('variant_name');
            $table->decimal('price', 10, 2);
            $table->decimal('cogs_per_unit',13,2);
            $table->decimal('subtotal_cogs',13,2);
            $table->integer('quantity');
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
