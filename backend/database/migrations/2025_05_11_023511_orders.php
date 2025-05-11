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
        
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');

            $table->string('recipient_name');
            $table->string('recipient_phone');
            $table->text('recipient_address');
            $table->string('province');
            $table->string('district');
            $table->string('ward');

            $table->foreignId('shipping_id')->nullable()->constrained('shipping_methods')->onDelete('set null');
            $table->decimal('shipping_fee',10,2);
            $table->decimal('total_price', 10, 2);

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
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();

            $table->string('product_name');
            $table->decimal('price', 10, 2);
            $table->integer('quantity');
            $table->timestamps();
        });
       
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
