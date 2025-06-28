<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'variant_id',
        'variant_name',
        'price',
        'quantity',
        'cogs_per_unit',
        'subtotal_cogs',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function variant()
    {
        return $this->belongsTo(Variant::class);
    }
        public function stockLotAllocations()
    {
        return $this->hasMany(StockLotAllocation::class);
    }
}
