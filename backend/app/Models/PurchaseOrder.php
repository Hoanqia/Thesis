<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'supplier_id',
        'expected_delivery_date',
        'actual_delivery_date',
        'total_amount',
        'status',
        'notes',
    ];
    protected $table ='purchase_orders';
    protected $primaryKey = 'id';
    protected $keyType = 'int';
    protected $casts = [
        'expected_delivery_date' => 'date',
        'actual_delivery_date' => 'date',
        'total_amount' => 'decimal:2',
        'status' => 'string', // Enum có thể cast thành string
    ];

    /**
     * Lấy người dùng đã tạo đơn đặt hàng.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Lấy nhà cung cấp của đơn đặt hàng này.
     */
    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * Lấy các mặt hàng trong đơn đặt hàng này.
     */
    public function items()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    // Các hằng số cho trạng thái để dễ quản lý hơn
    public const STATUS_PENDING = 'pending';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_PARTIALLY_RECEIVED = 'partially_received';
    public const STATUS_RECEIVED = 'received';

    public static function getStatuses(): array
    {
        return [
            self::STATUS_PENDING,
            self::STATUS_CONFIRMED,
            self::STATUS_PARTIALLY_RECEIVED,
            self::STATUS_RECEIVED,
        ];
    }
}