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
        'price',
        'discount',
        'stock',
        'cat_id',
        'brand_id',
        'is_featured',
        'status',
    ];

    /**
     * Quan hệ: Sản phẩm thuộc về một brand
     */
    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    /**
     * Quan hệ: Sản phẩm thuộc về một category
     */
    public function category()
    {
        return $this->belongsTo(Category::class, 'cat_id');
    }

    /**
     * Quan hệ: Sản phẩm có nhiều ảnh
     */
    public function images()
    {
        return $this->hasMany(ProductImage::class);
    }
    public function cart_items(){
        return $this->hasMany(CartItem::class);
    }
}
