<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BayesianOptimizationSpace extends Model
{
    protected $fillable = [
        'param_name',
        'param_type',
        'min_value',
        'max_value',
    ];
    protected $table = 'bayesian_optimization_spaces';
    protected $casts = [
        'min_value' => 'float',
        'max_value' => 'float',
    ];
}
