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
        'profit_percent',
        'average_cost',
        'status',
    ];
    protected $table = 'product_variants';



     public function reservedStocks()
    {
        return $this->hasMany(ReservedStock::class);
    }


    public function getAvailableStockForSaleAttribute(): int
    {
        // Tính tổng số lượng đang được giữ (chỉ những bản ghi chưa hết hạn)
        $totalReservedQuantity = $this->reservedStocks()
                                      ->where('expires_at', '>', now('Asia/Ho_Chi_Minh'))
                                      ->sum('quantity');

        // Tồn kho khả dụng = Tồn kho vật lý (variant.stock) - Tổng số lượng đã giữ
        // Đảm bảo không trả về giá trị âm
        return max(0, $this->stock - $totalReservedQuantity);
    }



    public function variant_from_suppliers(){
        return $this->hasMany(VariantFromSupplier::class);
    }
    public function product(){
        return $this->belongsTo(Product::class,'product_id');
    }
    public function variantSpecValues(){
        return $this->hasMany(VariantSpecValue::class);
    }   

    protected $appends = [
        'full_name',
        'image_url',
        'available_stock_for_sale',
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
