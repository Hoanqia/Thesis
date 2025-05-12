<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpecOption extends Model
{
    protected $fillable = [
        'spec_id',
        'value',
    ];
    public function specification(){
        return $this->belongsTo(Specification::class,'spec_id');
    }
}
