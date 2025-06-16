<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'address',
    ];

    /**
     * Get the GRNs for the supplier.
     */
    public function grns()
    {
        return $this->hasMany(Grn::class);
    }
}
