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
            'purchase_order_id' => 'required|exists:purchase_orders,id',
            'type' => 'nullable',
            'notes' => 'nullable|string',
            'items' => 'required|array',
            'items.*.purchase_order_item_id' => 'required|exists:purchase_order_items,id', // Phải là PO item ID
            'items.*.quantity' => 'required|integer|min:1',
        ]);
        $user = Auth::user();
        $data['user_id'] = $user->id;

        $grnData = collect($data)->except('items')->toArray();
        $itemsData = $data['items'];
        $grn = $this->grnService->create($grnData, $itemsData);

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
                'items.*.id' => 'required|integer|exists:grn_items,id', // ID của GRN Item
                'items.*.quantity' => 'required|integer|min:0', // Số lượng thực tế nhận được
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
