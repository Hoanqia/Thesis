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


    protected static function boot()
    {
        parent::boot();

        // Lắng nghe sự kiện "deleting" (trước khi bản ghi bị xóa)
        static::deleting(function ($item) {
            Log::warning('DELETING PurchaseOrderItem ID: ' . $item->id);
            Log::warning('PurchaseOrderItem Data being deleted: ' . json_encode($item->toArray()));
            Log::warning('Current stack trace for deleting event: ' . (new \Exception())->getTraceAsString());
            // Bạn có thể ném Exception ở đây để ngăn chặn việc xóa nếu cần
            // throw new \Exception('Không được xóa PurchaseOrderItem này!');
        });

        // Lắng nghe sự kiện "deleted" (sau khi bản ghi đã bị xóa)
        static::deleted(function ($item) {
            Log::warning('DELETED PurchaseOrderItem ID: ' . $item->id);
            Log::warning('PurchaseOrderItem (after deletion, usually just ID): ' . json_encode($item->toArray()));
            Log::warning('Current stack trace for deleted event: ' . (new \Exception())->getTraceAsString());
        });
    }
}