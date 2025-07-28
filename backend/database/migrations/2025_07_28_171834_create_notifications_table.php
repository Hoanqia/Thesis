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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id(); // ID tự tăng chính
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // Khóa ngoại tới bảng users
            $table->string('type'); // Loại thông báo: order_success, order_confirmed, new_message, etc.
            $table->text('content'); // Nội dung thông báo hiển thị
            $table->boolean('is_read')->default(false); // Trạng thái đã đọc/chưa đọc
            $table->timestamp('read_at')->nullable(); // Thời gian đọc thông báo
            $table->timestamps(); // created_at và updated_at
            // Thêm chỉ mục để tối ưu truy vấn
            $table->index('user_id');
            $table->index('is_read');
            $table->index(['user_id', 'is_read']); // Chỉ mục cho các truy vấn phổ biến
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};