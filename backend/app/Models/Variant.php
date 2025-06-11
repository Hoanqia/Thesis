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

    protected $appends = [
        'full_name',
        'image_url',
    ];

    
    public function getFullNameAttribute()
{
    $baseName = $this->product->name;

    $specValues = $this->variantSpecValues()
        ->with(['spec_options', 'specification'])
        ->get()
        ->filter(function ($specValue) {
            // Chỉ lấy 3 đặc điểm cần thiết
            $specName = $specValue->specification->name ?? '';
            return in_array($specName, ['Màu sắc', 'RAM', 'Dung lượng bộ nhớ']);
        })
        ->sortBy(function ($specValue) {
            // Sắp xếp đúng thứ tự mong muốn
            $order = ['Màu sắc' => 1, 'RAM' => 2, 'Dung lượng bộ nhớ' => 3];
            return $order[$specValue->specification->name] ?? 99;
        })
        ->map(function ($specValue) {
            if ($specValue->option_id && $specValue->spec_options) {
                return $specValue->spec_options->value;
            } elseif (!is_null($specValue->value_int)) {
                return $specValue->value_int . ' GB'; // RAM/Dung lượng có thể thêm đơn vị
            } elseif (!is_null($specValue->value_text)) {
                return $specValue->value_text;
            } else {
                return null;
            }
        })
        ->filter()
        ->implode(' - ');

    return $baseName . ($specValues ? ' - ' . $specValues : '');
}
    public function getImageUrlAttribute()
{
    return $this->image ? asset('storage/' . $this->image) : null;
}

}
