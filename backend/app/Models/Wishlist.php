<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Wishlist extends Model
{
    protected $fillable = [
        'user_id',
        'variant_id',
    ];
    protected $table = 'wishlists';
    public function user(){
        return $this->belongsTo(User::class,'user_id');
    }
    public function variant(){
        return $this->belongsTo(Variant::class,'variant_id');
    }
}
