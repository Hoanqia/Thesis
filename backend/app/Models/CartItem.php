<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CartItem extends Model
{
    protected $fillable = [
        'cart_id',
        'product_id',
        'quantity',
        'price_at_time',
        'status',
        'expires_at',
    ];
    protected $table = 'cart_items';

    public function product(){
        return $this->belongsTo(Product::class,'product_id');
    }
    public function cart(){
        return $this->belongsTo(Cart::class,'cart_id');
    }
}
