<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ReservedStock extends Model
{
    use HasFactory;

    protected $fillable = [
        'variant_id',
        'user_id',
        'quantity',
        'order_id',
        'expires_at',
    ];

    protected $dates = ['expires_at'];

    // Quan hệ: ReservedStock thuộc về một sản phẩm
    public function variant()
    {
        return $this->belongsTo(Variant::class);
    }

    // Quan hệ: ReservedStock thuộc về một người dùng
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Quan hệ: ReservedStock thuộc về một đơn hàng (có thể null)
    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
