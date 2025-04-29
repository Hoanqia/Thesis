<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = [
        'name',
        'id_parent',
        'status',
    ];
    protected $table = 'categories';
}
