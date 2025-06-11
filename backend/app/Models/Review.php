<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    protected $fillable = [
        'user_id',
        'product_id',
        'variant_id',
        'message',
        'rate',
        'admin_reply',
        'status',
    ];
    protected $table = 'reviews';

    public function user(){
        return $this->belongsTo(User::class,'user_id');
    }
    public function product(){
        return $this->belongsTo(Product::class,'product_id');
    }
    public function variant(){
        return $this->belongsTo(Variant::class,'variant_id');
    }
}
