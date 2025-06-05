<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class UserAddress extends Model
{
    use HasFactory;
    protected $fillable = [
        'user_id',
        'province',
        'district',
        'ward',
        'street_address',
        'phone',
        'is_default',
        'created_at',
        'updated_at',
        'province_name',
        'district_name',
        'ward_name',
    ];
    protected $table = 'user_addresses';
    public function user(){
       return $this->belongsTo(User::class,'user_id');
    }
}
