<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Voucher extends Model
{
    protected $fillable = [
        'code',
        'discount_percent',
        'minium_order_amount',
        'type',
        'start_date',
        'end_date',
        'max_uses',
        'used_count',
        'status',
    ];
    protected $table = 'vourchers';
}
