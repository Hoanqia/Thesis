<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserRecommendation extends Model
{
    protected $fillable = [
        'rec_id',
        'user_id',
        'product_id',
        'score',
        'updated_at',
        'created_at',
    ];
    protected $table = 'user_recommendations';
    protected $keyType = 'int';
    protected $primaryKey = 'rec_id';

    public function user(){
        return $this->belongsTo(User::class,'user_id');
    }
     public function product()
    {
        return $this->belongsTo(Product::class, 'product_id')
                    ->with(['variants.variantSpecValues.spec_options']);
    }
}
