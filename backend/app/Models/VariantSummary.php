<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VariantSummary extends Model
{
    protected $table = 'variant_summaries';
    protected $fillable = [
        'product_id',
        'name',
        'slug',
        'image_url',
        'price',
        'discount',
        'brand_name',
        'cat_id',
        'category_name',
        'reviews_count',
        'review_avg_rate',
        'denormalized_specs',
        'is_featured',
        'status',
    ];
    
}
