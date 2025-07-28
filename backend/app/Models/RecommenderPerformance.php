<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RecommenderPerformance extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'recommender_performances';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'precision_at_n',
        'recall_at_n',
        'ndcg_at_n',
        'map',
        'top_n_recommendations',
        'top_k',
        'cosine_threshold',
        'hybrid_alpha',
        'batch_size',
        'product_blacklist',
        'optimal_cold_start_threshold',
        'optimal_frequency_decay_factor',
        'optimal_final_hybrid_threshold',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'precision_at_n' => 'float',
        'recall_at_n' => 'float',
        'ndcg_at_n' => 'float',
        'map' => 'float',
        'top_n_recommendations' => 'integer',
        'top_k' => 'integer',
        'cosine_threshold' => 'float',
        'hybrid_alpha' => 'float',
        'batch_size' => 'integer',
        'product_blacklist' => 'array', 
        'optimal_cold_start_threshold' => 'integer',
        'optimal_frequency_decay_factor' => 'float',
        'optimal_final_hybrid_threshold' => 'float',

    ];
}