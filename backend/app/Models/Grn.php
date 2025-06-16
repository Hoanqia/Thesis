<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Grn extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'supplier_id',
        'type',
        'expected_delivery_date',
        'total_amount',
        'status',
        'notes',
    ];

    public function user()
    {
        return $this->belongsTo(User::class,'user_id');
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class,'supplier_id');
    }

    public function items()
    {
        return $this->hasMany(GrnItem::class);
    }
}