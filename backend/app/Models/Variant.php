<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Variant extends Model
{
    use HasFactory;
    protected $fillable = [
        'product_id',
        'sku',
        'price',
        'discount',
        'stock',
        'created_at',
        'updated_at',
        'image',
    ];
    protected $table = 'product_variants';

    public function product(){
        return $this->belongsTo(Product::class,'product_id');
    }
    public function variantSpecValues(){
        return $this->hasMany(VariantSpecValue::class);
    }   
    

}
