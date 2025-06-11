<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'cat_id',
        'brand_id',
        'is_featured',
        'status',
    ];

   
    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

   
    public function category()
    {
        return $this->belongsTo(Category::class, 'cat_id');
    }

    public function variants(){
        return $this->hasMany(Variant::class);
    }

    public function reviews(){
        return $this->hasMany(Review::class);
    }
}
