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
}
