<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseOrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_order_id', 
        'variant_id',
        'ordered_quantity',
        'received_quantity',
        'unit_cost',
        'subtotal',
    ];

    protected $casts = [
        'ordered_quantity' => 'integer',
        'received_quantity' => 'integer',
        'unit_cost' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    /**
     * Lấy đơn đặt hàng mà mặt hàng này thuộc về.
     */
    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    /**
     * Lấy biến thể sản phẩm liên quan đến mặt hàng này.
     */
    public function variant()
    {
        return $this->belongsTo(Variant::class, 'variant_id');
    }
}