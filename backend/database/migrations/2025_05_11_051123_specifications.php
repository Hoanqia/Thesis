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

         Schema::create('products', function (Blueprint $table) {
            $table->id(); // bigIncrements
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->foreignId('cat_id')
            ->constrained('categories')
            ->restrictOnDelete();
            $table->foreignId('brand_id')
            ->constrained('brands')
            ->restrictOnDelete();
            $table->boolean('is_featured')->default(false);          
            $table->boolean('status')->default(true);
            $table->timestamps();
            
        });
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->string('sku')->unique(); // mã phân biệt từng phiên bản
            $table->decimal('price', 10, 2)->unsigned();
            $table->decimal('discount', 10, 2)->unsigned()->default(0);
            $table->unsignedInteger('stock')->default(0);
            $table->timestamps();
        });
        
        Schema::create('specifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->onDelete('cascade');
            $table->string('name'); // Tên thuộc tính: RAM, CPU, ...
            $table->enum('data_type', ['int', 'decimal', 'text', 'option']);
            $table->string('unit')->nullable(); // Đơn vị: GB, kg...
            $table->text('description')->nullable();
            $table->timestamps();
        });
         Schema::create('spec_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('spec_id')->constrained('specifications')->onDelete('cascade');
            $table->string('value'); // Giá trị tuỳ chọn: Đen, Trắng...
            $table->timestamps();
        });
         Schema::create('variant_spec_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('variant_id')->constrained('product_variants')->onDelete('cascade');
            $table->foreignId('spec_id')->constrained('specifications')->onDelete('cascade');

            // 4 cột để lưu tuỳ theo kiểu dữ liệu
            $table->text('value_text')->nullable();     // nếu là text
            $table->integer('value_int')->nullable();   // nếu là int
            $table->decimal('value_decimal', 10, 2)->nullable(); // nếu là decimal
            $table->foreignId('option_id')->nullable()->constrained('spec_options')->onDelete('cascade'); // nếu là option

            $table->timestamps();
        });


        Schema::create('carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cart_id')->constrained('carts')->cascadeOnDelete();
            $table->foreignId('variant_id')->constrained('product_variants')->cascadeOnDelete(); // thay đổi ở đây
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('price_at_time', 10, 2);
            $table->unique(['cart_id', 'variant_id']); // đổi constraint cho phù hợp
            $table->timestamp('expires_at');
            $table->timestamps();
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
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();

            $table->string('variant_name');
            $table->decimal('price', 10, 2);
            $table->integer('quantity');
            $table->timestamps();
        });
       
         Schema::create('user_events', function (Blueprint $table) {
            $table->id('event_id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('product_id');
            $table->enum('event_type', ['view', 'add_to_cart', 'purchase', 'rate']);
            $table->integer('value')->nullable(); // có thể null nếu không dùng

            $table->timestamp('created_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();

            $table->index(['user_id', 'product_id', 'event_type']);
        });

        // Ràng buộc cho điểm rating (1-5 nếu là "rate")
        DB::statement("ALTER TABLE user_events ADD CONSTRAINT chk_event_value 
                       CHECK (event_type != 'rate' OR (value BETWEEN 1 AND 5))");

        Schema::create('item_similarity', function (Blueprint $table) {
            $table->id('sim_id');
            $table->unsignedBigInteger('product_id_1');
            $table->unsignedBigInteger('product_id_2');
            $table->decimal('score', 5, 4); // Ví dụ: 0.8750

            $table->foreign('product_id_1')->references('id')->on('products')->cascadeOnDelete();
            $table->foreign('product_id_2')->references('id')->on('products')->cascadeOnDelete();

            $table->unique(['product_id_1', 'product_id_2']); // tránh trùng
            $table->index(['product_id_1']);
            $table->index(['product_id_2']);
        });

        Schema::create('user_recommendations', function (Blueprint $table) {
            $table->id('rec_id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('product_id');
            $table->decimal('score', 5, 4)->nullable(); // điểm gợi ý
            $table->dateTime('updated_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();

            $table->unique(['user_id', 'product_id']); // tránh trùng gợi ý
            $table->index(['user_id']);
        });
        Schema::create('reserved_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('variant_id')->constrained('product_variants');
            $table->foreignId('user_id')->constrained('users');
            $table->integer('quantity');
            $table->foreignId('order_id')->nullable()->constrained('orders')->onDelete('cascade');
            $table->timestamp('expires_at'); // thời điểm giữ hết hiệu lực
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
       
    }
};
