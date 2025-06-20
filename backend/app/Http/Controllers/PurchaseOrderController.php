<?php

namespace App\Http\Controllers;

use App\Models\PurchaseOrder;
use App\Services\PurchaseOrderService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;
class PurchaseOrderController extends Controller
{
    protected $purchaseOrderService;

    /**
     * Khởi tạo controller với PurchaseOrderService.
     *
     * @param PurchaseOrderService $purchaseOrderService
     */
    public function __construct(PurchaseOrderService $purchaseOrderService)
    {
        $this->purchaseOrderService = $purchaseOrderService;
    }

    /**
     * Hiển thị danh sách các đơn đặt hàng.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $purchaseOrders = $this->purchaseOrderService->getAllPurchaseOrders();
            return response()->json([
                'message' => 'Lấy thông tin thành công',
                'status' => 'success',
                'data' => $purchaseOrders,
            ],200);
        } catch(\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Lưu một đơn đặt hàng mới vào cơ sở dữ liệu.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // Sử dụng validation inline cho ví dụ, nhưng khuyến khích Form Request riêng biệt.
            $validatedData = $request->validate([
                'supplier_id' => 'required|exists:suppliers,id',
                'expected_delivery_date' => 'nullable|date',
                'actual_delivery_date' => 'nullable|date',
                'notes' => 'nullable|string|max:1000',
                'status' => 'nullable|string|in:' . implode(',', PurchaseOrder::getStatuses()),
                'items' => 'required|array|min:1',
                'items.*.variant_id' => 'required|exists:product_variants,id',
                'items.*.ordered_quantity' => 'required|integer|min:1',
                'items.*.unit_cost' => 'required|numeric|min:0',
                'items.*.received_quantity' => 'nullable|integer|min:0|lte:items.*.ordered_quantity',
            ]);

            $purchaseOrder = $this->purchaseOrderService->createPurchaseOrder($validatedData);

            return response()->json([
                'message' => 'Đơn đặt hàng đã được tạo thành công.',
                'status' => 'success',
                'data' => $purchaseOrder
            ], 201);
        } catch (\Exception $e) {
         return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Hiển thị chi tiết của một đơn đặt hàng cụ thể.
     *
     * @param int $id ID của đơn đặt hàng.
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        try {
            $purchaseOrder = $this->purchaseOrderService->findPurchaseOrderById($id);

            if (!$purchaseOrder) {
                return response()->json(['message' => 'Không tìm thấy đơn đặt hàng.'], 404);
            }

            return response()->json([
                'message' => 'Lấy dữ liệu thành công',
                'status' => 'success',
                'data' => $purchaseOrder,
            ],200);
        } catch (\Exception $e) {
          return ApiExceptionHandler::handleException($e);

        }
    }

  
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            // Sử dụng validation inline cho ví dụ, nhưng khuyến khích Form Request riêng biệt.
            $validatedData = $request->validate([
                'user_id' => 'sometimes|required|exists:users,id',
                'supplier_id' => 'sometimes|required|exists:suppliers,id',
                'expected_delivery_date' => 'nullable|date',
                'actual_delivery_date' => 'nullable|date',
                'notes' => 'nullable|string|max:1000',
                'status' => 'sometimes|required|string|in:' . implode(',', PurchaseOrder::getStatuses()),
                'items' => 'sometimes|required|array|min:1',
                // Quy tắc validation cho các mặt hàng con
                'items.*.id' => 'nullable|exists:purchase_order_items,id', // ID là tùy chọn khi thêm mới
                'items.*.variant_id' => 'required|exists:variants,id',
                'items.*.ordered_quantity' => 'required|integer|min:1',
                'items.*.unit_cost' => 'required|numeric|min:0',
                'items.*.received_quantity' => 'nullable|integer|min:0|lte:items.*.ordered_quantity',
            ]);

            $updatedPurchaseOrder = $this->purchaseOrderService->updatePurchaseOrder($id, $validatedData);

            return response()->json([
                'message' => 'Đơn đặt hàng đã được cập nhật thành công.',
                'status' => 'success',
                'data' => $updatedPurchaseOrder
            ]);
        
       } catch (\Exception $e) {
          return ApiExceptionHandler::handleException($e);
          
        }
    }

    /**
     * Xóa một đơn đặt hàng khỏi cơ sở dữ liệu.
     *
     * @param PurchaseOrder $purchaseOrder Model binding của đơn đặt hàng.
     * @return JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $this->purchaseOrderService->deletePurchaseOrder($id);
            return response()->json(['message' => 'Đơn đặt hàng đã được xóa thành công.',
                                    'status' => 'success',                                 
        ], 204); // 204 No Content
       } catch (\Exception $e) {
          return ApiExceptionHandler::handleException($e);
          
        }
    }

    /**
     * Cập nhật trạng thái của một đơn đặt hàng.
     *
     * @param Request $request
     * @param PurchaseOrder $purchaseOrder Model binding của đơn đặt hàng.
     * @return JsonResponse
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'status' => 'required|string|in:' . implode(',', PurchaseOrder::getStatuses()),
            ]);

            $this->purchaseOrderService->updatePurchaseOrderStatus($id, $validatedData['status']);

            return response()->json([
                'message' => 'Trạng thái đơn đặt hàng đã được cập nhật thành công.',
                'status' => 'success',
            ]);
        }  catch (\Exception $e) {
          return ApiExceptionHandler::handleException($e);
        }
    }
    
}
