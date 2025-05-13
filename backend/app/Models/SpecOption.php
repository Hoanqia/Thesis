<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;  // Thêm dòng này

class SpecOption extends Model
{
    use HasFactory;
    protected $fillable = [
        'spec_id',
        'value',
    ];
    public function specification(){
        return $this->belongsTo(Specification::class,'spec_id');
    }
}
