<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ItemSimilarity extends Model
{
    protected $fillable = [
        'sim_id',
        'product_id_1',
        'product_id_2',
        'score',
    ];
    protected $table = 'item_similarity';
    protected $keyType = 'int';
    protected $primaryKey = 'sim_id';
    
}
