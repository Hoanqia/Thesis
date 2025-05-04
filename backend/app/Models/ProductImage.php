<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ProductImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'image_path',
        'is_primary',
    ];

    /**
     * Quan hệ: Ảnh thuộc về một sản phẩm
     */
    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
