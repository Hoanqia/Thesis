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
        Schema::create('user_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
        
            // Địa chỉ phân cấp theo GHTK API
            $table->string('province');     // Tỉnh/Thành phố
            $table->string('district');     // Quận/Huyện
            $table->string('ward');         // Phường/Xã
        
            // Thông tin chi tiết hơn
            $table->string('street_address'); // Số nhà, tên đường
        
            // Các tuỳ chọn thêm
            $table->string('phone');
            $table->boolean('is_default')->default(false); // Địa chỉ mặc định của người dùng
        
            $table->timestamps();
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_addresses');
    }
};
