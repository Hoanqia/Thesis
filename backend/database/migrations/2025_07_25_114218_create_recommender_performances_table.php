<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('recommender_performances', function (Blueprint $table) {
            $table->id(); // Primary key (auto-incrementing ID)

            // Các chỉ số hiệu suất
            $table->float('precision_at_n')->comment('Precision@N score of the model evaluation.');
            $table->float('recall_at_n')->comment('Recall@N score of the model evaluation.');
            $table->float('ndcg_at_n')->comment('NDCG@N score of the model evaluation.');
            $table->float('map')->comment('Mean Average Precision (MAP) score of the model evaluation.');
            
            $table->integer('top_n_recommendations')->comment('The N value (number of recommendations) displayed to the user and used for calculating Precision@N, Recall@N, NDCG@N.'); //
            $table->integer('top_k')->comment('The K value, representing the number of top similar items stored for each product (e.g., for item-item similarity).'); //
            
            $table->float('cosine_threshold')->comment('Cosine similarity threshold used in collaborative filtering, influencing which similar items are considered.');
            $table->float('hybrid_alpha')->comment('Alpha parameter for hybrid recommendation model, balancing the influence between content-based and collaborative filtering components.');
            $table->integer('batch_size')->comment('Batch size used during model training or data processing, affecting performance and memory usage.');
            
           
            $table->text('product_blacklist')->nullable()->comment('Comma-separated product IDs or JSON array of product IDs that were explicitly excluded from recommendations during this evaluation run.');

            // Các tham số "optimal" đã được thêm
            $table->integer('optimal_cold_start_threshold')->comment('The threshold for cold-start items used in the recommendation process.');
            $table->float('optimal_frequency_decay_factor')->comment('Decay factor applied to item frequency for recency or popularity bias.');
            $table->float('optimal_final_hybrid_threshold')->comment('Threshold applied to the final score of hybrid recommendations for filtering.');

            $table->timestamps(); // `created_at` và `updated_at` (mặc định của Laravel)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema->dropIfExists('recommender_performances');
    }
};