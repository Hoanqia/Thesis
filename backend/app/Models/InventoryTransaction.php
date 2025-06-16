<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class InventoryTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'variant_id',
        'transaction_type',
        'quantity',
        'reference_type',
        'reference_id',
        'user_id',
        'notes',
    ];

    public function variant()
    {
        return $this->belongsTo(Variant::class, 'variant_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}