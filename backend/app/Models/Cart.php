<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cart extends Model
{
    protected $fillable = [
        'user_id'
    ];
    protected $table = 'carts';
 
    public function cartItems()
    {
        return $this->hasMany(CartItem::class);
    }
    
    public function user()
    {
        return $this->belongsTo(User::class,'user_id');
    }
}
