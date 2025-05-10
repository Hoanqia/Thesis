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
        'shipping_fee', 
        'total_price', 
        'grand_total', 
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
