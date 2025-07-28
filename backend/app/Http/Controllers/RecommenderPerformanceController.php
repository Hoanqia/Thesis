<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\RecommenderPerformanceService;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;
class RecommenderPerformanceController extends Controller
{
     protected $performanceService;

    public function __construct(RecommenderPerformanceService $performanceService)
    {
        $this->performanceService = $performanceService;
    }

    public function getPerformanceData()
    {   
        try {

        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
        $data = $this->performanceService->getLatest10PerformancesWithComparison(); // Gọi hàm mới

        // Chuyển đổi Collection các đối tượng Eloquent Model thành một mảng các mảng
        // để đảm bảo tất cả thuộc tính được serialize trong JSON.
        $latest10PerformancesArray = $data['latest_10_performances']->map(function ($performance) {
            return $performance->toArray();
        })->all(); // Dùng all() để chuyển Collection thành PHP array

        return response()->json([
            'status' => 'success',
            'latest_10_performances' => $latest10PerformancesArray, // Danh sách 10 bản ghi đầy đủ
            'comparison' => $data['comparison'] // Kết quả so sánh giữa bản mới nhất và bản ngay trước đó
        ]);
    }

    public function storePerformance(Request $request)
    {   

        try {
            $validatedData = $request->validate([
                'precision_at_n' => 'required|numeric',
                'recall_at_n' => 'required|numeric',
                'ndcg_at_n' => 'required|numeric',
                'map' => 'required|numeric',
                'top_n_recommendations' => 'required|integer',
                'top_k' => 'required|integer',
                'cosine_threshold' => 'required|numeric',
                'hybrid_alpha' => 'required|numeric',
                'batch_size' => 'required|integer',
                'product_blacklist' => 'nullable|string',
                'optimal_cold_start_threshold' => 'required|integer',
                'optimal_frequency_decay_factor' => 'required|numeric',
                'optimal_final_hybrid_threshold' => 'required|numeric',
            ]);
            
            if (isset($validatedData['product_blacklist']) && is_string($validatedData['product_blacklist'])) {
                
                        $decodedBlacklist = json_decode($validatedData['product_blacklist'], true);
                        if (json_last_error() === JSON_ERROR_NONE) {
                            $validatedData['product_blacklist'] = $decodedBlacklist;
                        
                }

                $performance = $this->performanceService->recordPerformance($validatedData);

                if ($performance) {
                    return response()->json(['message' => 'Hiệu suất mô hình đã được ghi lại thành công.', 'status' => 'success' ,'data' => $performance->toArray()], 201);
                } else {
                    return response()->json(['message' => 'Không thể ghi hiệu suất mô hình.','status' => 'error'], 500);
                }
            }
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
    }
}
