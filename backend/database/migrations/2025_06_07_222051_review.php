// File: database/migrations/2025_06_07_000000_create_reviews_table.php

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
        Schema::create('reviews', function (Blueprint $table) {
            $table->engine = 'InnoDB';

            $table->id();

            // Ai đánh giá; nếu user bị xóa thì set null
            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            // Sản phẩm được đánh giá
            $table->foreignId('product_id')
                  ->constrained('products')
                  ->cascadeOnDelete();

            // Biến thể tùy chọn
            $table->foreignId('variant_id')
                  ->nullable()
                  ->constrained('product_variants')
                  ->nullOnDelete();

            // Nội dung review
            $table->text('message')->nullable();

            // Đánh giá 1–5
            $table->unsignedTinyInteger('rate');

            // Phản hồi của admin
            $table->text('admin_reply')->nullable();

            // Trạng thái: true=hiển thị, false=ẩn
            $table->boolean('status')
                  ->default(true);

            $table->timestamps();

            // Index tối ưu truy vấn
            $table->index(['product_id', 'rate']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
