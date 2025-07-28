<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class WeightedEventProcessed extends Model
{
    use HasFactory;

    // Tên bảng trong database
    protected $table = 'weighted_events_processed';

    // Bảng này không có khóa chính tự tăng mặc định, nên ta cần khai báo
    public $incrementing = false;

    // Khóa chính là một mảng của các cột (composite primary key)
    protected $primaryKey = ['user_id', 'product_id'];

    // Không sử dụng timestamps (created_at, updated_at)
    public $timestamps = false;

    // Các trường có thể được gán hàng loạt (mass assignable)
    protected $fillable = [
        'user_id',
        'product_id',
        'implicit_score',
    ];

    // Ép kiểu dữ liệu (casting)
    protected $casts = [
        'user_id' => 'integer',
        'product_id' => 'integer',
        'implicit_score' => 'float',
    ];
}
