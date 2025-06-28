<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockLot extends Model
{
    protected $fillable = [
        'variant_id',
        'grn_item_id',
        'reference_type',
        'reference_id',
        'quantity_in',
        'quantity_out',
        'unit_cost',
        'purchase_date',
    ];
    public function variant(){
        return $this->belongsTo(Variant::class,'variant_id');
    }
    public function grn_item(){
        return $this->belongsTo(GrnItem::class,'grn_item_id');
    }
    public function stockLotAllocations()
    {
        return $this->hasMany(StockLotAllocation::class);
    }
}
