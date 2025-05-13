<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;  // Thêm dòng này

class VariantSpecValue extends Model
{
    use HasFactory;
    protected $fillable = [
        'variant_id',
        'spec_id',
        'value_text',
        'value_int',
        'value_decimal',
        'option_id',
    ];
    protected $table = 'variant_spec_values';
    public function spec_options(){
        return $this->belongsTo(SpecOption::class,'option_id');
    }
    public function variant(){
        return $this->belongsTo(Variant::class,'variant_id');
    }
    public function specification(){
        return $this->belongsTo(Specification::class,'spec_id');
    }
}
