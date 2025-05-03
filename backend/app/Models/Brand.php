<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Brand extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'status'
    ];
    protected $table = 'brands';
    // public function product(): HasMany{
    //     return $this->hasMany(Product::class);
    // }
}
