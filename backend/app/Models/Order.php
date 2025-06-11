<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

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
        'product_voucher_id',
        'shipping_voucher_id',
        'discount_on_products',
        'discount_on_shipping',
        'status', 
        'payment_method', 
        'is_paid',
    ];
    protected $table = 'orders';
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

     public function reviews()
    {
        return $this->hasManyThrough(
            \App\Models\Review::class,   // Model đích
            \App\Models\OrderItem::class, // Model trung gian
            'order_id',                   // khóa ngoại trên OrderItem
            'variant_id',                 // khóa ngoại trên Review
            'id',                         // khóa chính của Order
            'variant_id'                  // khóa chính của OrderItem
        )->where('reviews.user_id', Auth::id());
    }

}
