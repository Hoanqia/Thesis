<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class UserEvent extends Model
{
    use HasFactory;

    protected $table = 'user_events';
    protected $primaryKey = 'event_id';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'product_id',
        'event_type',
        'value',
        'created_at',
    ];

    // Quan hệ
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
