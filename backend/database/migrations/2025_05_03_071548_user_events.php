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
    }

    public function down(): void {
        Schema::dropIfExists('user_events');
    }
};

