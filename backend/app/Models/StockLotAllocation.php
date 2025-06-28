<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockLotAllocation extends Model
{
    use HasFactory;

    protected $table = 'stock_lot_allocations';

    protected $fillable = [
        'order_item_id',
        'stock_lot_id',
        'allocated_quantity',
        'unit_cost_at_allocation',
    ];

    /**
     * Mối quan hệ với OrderItem.
     */
    public function orderItem()
    {
        return $this->belongsTo(OrderItem::class);
    }

    /**
     * Mối quan hệ với StockLot.
     */
    public function stockLot()
    {
        return $this->belongsTo(StockLot::class);
    }
}
