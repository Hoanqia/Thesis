<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
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
    }

    public function down(): void {
        Schema::dropIfExists('product_features');
        Schema::dropIfExists('item_similarity');
        Schema::dropIfExists('user_events');

    }
};

