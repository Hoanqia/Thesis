<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VariantFromSupplier extends Model
{
    use HasFactory;

    // Tên bảng nếu khác với tên số nhiều của model
    protected $table = 'variants_from_supplier';

    // Các thuộc tính có thể gán hàng loạt
    protected $fillable = [
        'supplier_id',
        'variant_id',
        'variant_supplier_sku',
        'current_purchase_price',
        'is_active',
        'is_default',
    ];

    // Các thuộc tính nên được chuyển đổi sang kiểu dữ liệu cụ thể
    protected $casts = [
        'is_active' => 'boolean',
        'current_purchase_price' => 'decimal:2', // Đảm bảo định dạng số thập phân
    ];

    /**
     * Lấy nhà cung cấp mà biến thể này được cung cấp bởi.
     */
    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * Lấy biến thể sản phẩm liên quan.
     */
    public function variant()
    {
        return $this->belongsTo(Variant::class, 'variant_id');
    }
}