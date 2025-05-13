<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 
        'recipient_name', 
        'recipient_phone', 
        'recipient_address', 
        'province', 
        'district', 
        'ward', 
        'shipping_id',
        'shipping_fee', 
        'total_price', 
        'product_vourcher_id',
        'shipping_vourcher_id',
        'discount_on_products',
        'discount_on_shipping',
        'status', 
        'payment_method', 
        'is_paid',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }
}
