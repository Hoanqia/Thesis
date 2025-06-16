<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class GrnItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'GRN_id',
        'variant_id',
        'ordered_quantity',
        'unit_cost',
        'subtotal',
        'received_quantity',
    ];

    public function grn()
    {
        return $this->belongsTo(Grn::class,'GRN_id');
    }

    public function variant()
    {
        return $this->belongsTo(Variant::class, 'variant_id');
    }
}
