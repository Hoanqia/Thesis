<?php

// app/Http/Controllers/GrnController.php

namespace App\Http\Controllers;

use App\Services\GrnService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;  

class GrnController extends Controller
{
    protected GrnService $grnService;

    public function __construct(GrnService $grnService)
    {
        $this->grnService = $grnService;
    }

    /**
     * GET /api/grns
     */
    public function index(): JsonResponse
    {
        try {
            $grns = $this->grnService->all();
            return response()->json([
                'message' => 'Lấy thông tin thành công',
                'status' => 'success',
                'data' => $grns
            ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
       
    }

    /**
     * GET /api/grns/{id}
     */
    public function show(int $id): JsonResponse
    {
        try {
            $grn = $this->grnService->find($id);
            return response()->json([
                'message' => 'Lấy thông tin chi tiết thành công',
                'status' => 'success',
                'data' => $grn,
            ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
    
    }

    /**
     * POST /api/grns
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
            // 'user_id' => 'required|exists:users,id',
            'supplier_id' => 'required|exists:suppliers,id',
            'type' => 'required|in:purchase',
            'expected_delivery_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'items' => 'required|array',
            'items.*.variant_id' => 'required|exists:product_variants,id',
            'items.*.ordered_quantity' => 'required|integer|min:1',
            'items.*.unit_cost' => 'required|numeric|min:0',
        ]);
        $user = Auth::user();
        $data['user_id'] = $user->id;
        $grn = $this->grnService->create(
            collect($data)->except('items')->toArray(),
            $data['items']
        );

        return response()->json([
            'message' => 'Tạo phiếu nhập hàng thành công',
            'status' => 'success',
            'data' => $grn,
        ],201);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * POST /api/grns/{id}/confirm
     */
    public function confirm(int $id,Request $request): JsonResponse
    {   
        try {
             // Validate the incoming request data for items
            $request->validate([
                'items' => 'required|array',
                'items.*.id' => 'required|integer|exists:grn_items,id',
                'items.*.received_quantity' => 'required|integer|min:0',
            ]);
            $itemsData = $request->input('items');

             $grn =$this->grnService->confirm($id, $itemsData);
            return response()->json([
                'message' => 'Xác nhận phiếu nhập hàng thành công',
                'status' => 'success',
            ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
       
    }

    /**
     * POST /api/grns/{id}/cancel
     */
    public function cancel(int $id): JsonResponse
    {   
        try {
            $grn = $this->grnService->cancel($id);
            return response()->json([
                'message' => 'Hủy phiếu nhập hàng thành công',
                'status' => 'success'
            ],200);
        }catch(\Excepton $e){
            return ApiExceptionHandler::handleException($e);
        }
        
    }
    public function destroy($id): JsonResponse{
        try {
            $grn = $this->grnService->deleteGrn($id);
             return response()->json([
                'message' => 'Xóa phiếu nhập hàng thành công',
                'status' => 'success'
            ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
    }
}
