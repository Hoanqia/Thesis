<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Voucher extends Model
{
    use HasFactory;
    protected $fillable = [
        'code',
        'type',
        'discount_percent',
        'minimum_order_amount',
        'start_date',
        'end_date',
        'max_uses',
        'used_count',
        'status',
    ];
    protected $table = 'vouchers';
}
