<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Specification extends Model
{
    protected $fillable = [
        'category_id',
        'name',
        'data_type',
        'unit',
        'description',
    ];

    public function category(){
        return $this->belongsTo(Category::class,'category_id');
    }
    public function spec_options (){
        return $this->hasMany(SpecOption::class);
    }
}
