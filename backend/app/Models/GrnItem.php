<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class GrnItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'grn_id',
        'purchase_order_item_id',
        'quantity',
        'unit_cost',
        'subtotal',
    ];

    public function grn()
    {
        return $this->belongsTo(Grn::class,'grn_id');
    }

    public function purchaseOrderItem()
    {
        return $this->belongsTo(PurchaseOrderItem::class, 'purchase_order_item_id');
    }
}
