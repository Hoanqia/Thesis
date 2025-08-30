<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\BayesianOptimizationSpaceService;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;
class BayesianOptimizationSpaceController extends Controller
{
    protected $bayesianOptimizationService;
    public function __construct(BayesianOptimizationSpaceService $bayesianOptimizationService){
        $this->bayesianOptimizationService = $bayesianOptimizationService;
    }
    public function index(){
        try {
            $spaces = $this->bayesianOptimizationService->getALl();
            return response()->json([
                'message'=>'Lấy dữ liệu thành công',
                'status' => 'success',
                'data' => $spaces,
            ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
    }
    public function edit(Request $request,$id){
        try {
            $validated = $request->validate([
            'min_value' => 'required|numeric|min:0|max:1',
            'max_value' => 'required|numeric|min:0|max:1',
            ]);
            $space = $this->bayesianOptimizationService->update($validated);
            return response()->json([
                'message' => 'Cập nhật thành công',
                'status' => 'success',
                'data' => $validated,
            ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
        
    }

     public function bulkUpdate(Request $request)
    {
        // Yêu cầu từ client phải chứa một mảng có tên 'updates'
        // Mỗi phần tử trong mảng có cấu trúc: ['id' => 1, 'data' => [...]]
        $validated = $request->validate([
            'updates' => 'required|array',
            'updates.*.id' => 'required|integer|exists:bayesian_optimization_spaces,id',
            'updates.*.data.min_value' => 'nullable|numeric|min:0',
            'updates.*.data.max_value' => 'nullable|numeric|min:0',
        ]);

        try {
            $this->bayesianOptimizationService->bulkUpdate($validated['updates']);
            
            return response()->json([
                'message' => 'Cập nhật hàng loạt thành công',
                'status' => 'success',
            ], 200);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }


}
