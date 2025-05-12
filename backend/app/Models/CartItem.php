<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CartItem extends Model
{
    protected $fillable = [
        'cart_id',
        'variant_id',
        'quantity',
        'price_at_time',
        'status',
        'expires_at',
    ];
    protected $table = 'cart_items';

    public function variant(){
        return $this->belongsTo(Variant::class,'variant_id');
    }
    public function cart(){
        return $this->belongsTo(Cart::class,'cart_id');
    }
}
