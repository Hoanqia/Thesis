<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\AdminOrderService;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;      

class AdminOrderController extends Controller
{
    protected $orderService;

    public function __construct(AdminOrderService $orderService)
    {
        $this->orderService = $orderService;

    }

    /**
     * GET /admin/orders
     * Lấy tất cả đơn hàng (mới nhất đến cũ nhất)
     */
    public function index()
    {
        try {
            $orders = $this->orderService->getAllOrders();
            return response()->json([
                'message' => 'Lấy dữ liệu thành công',
                'status' => 'success',
                'data'    => $orders
            ], 200);
        } catch (\Exception $e) {
            Log::error("AdminOrderController@index error: " . $e->getMessage());
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * GET /admin/orders/{id}
     * Lấy chi tiết một đơn hàng theo ID
     */
    public function show($id)
    {
        try {
            $order = $this->orderService->getOrderById($id);
            return response()->json([
                'message' => 'Lấy dữ liệu thành công',
                'status' => 'success',
                'data'    => $order
            ], 200);
        } catch (\Exception $e) {
            Log::error("AdminOrderController@show error: " . $e->getMessage());
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * POST /admin/orders/{id}/confirm
     * Xác nhận đơn hàng (từ pending => confirmed)
     */
    public function confirm($id)
    {
        try {
            $order = $this->orderService->confirmOrder($id);
            return response()->json([
               'message' => 'Xác nhận đơn hàng thành công',
                'status' => 'success',
                'data'    => $order
            ], 200);
        } catch (\Exception $e) {
            Log::error("AdminOrderController@confirm error: " . $e->getMessage());
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * PUT /admin/orders/{id}/status
     * Cập nhật trạng thái đơn hàng (ví dụ: shipping, completed, canceled,…)
     * Request body phải có trường "status"
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|string'
        ]);

        $newStatus = $request->input('status');

        try {
            $order = $this->orderService->updateOrderStatus($id, $newStatus);
            return response()->json([
               'message' => 'Cập nhật thành công',
                'status' => 'success',
                'data'    => $order
            ], 200);
        } catch (\Exception $e) {
            Log::error("AdminOrderController@updateStatus error: " . $e->getMessage());
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * PUT /admin/orders/{id}/paid
     * Đánh dấu đơn hàng đã thanh toán
     */
    public function markAsPaid($id)
    {
        try {
            $order = $this->orderService->markAsPaid($id);
            return response()->json([
                'message' => 'Cập nhật thành công',
                'status' => 'success',
                'data'    => $order
            ],200);
        } catch (\Exception $e) {
            Log::error("AdminOrderController@markAsPaid error: " . $e->getMessage());
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * DELETE /admin/orders/{id}
     * Xóa đơn hàng
     */
    public function destroy($id)
    {
        try {
            $deleted = $this->orderService->deleteOrder($id);

            if ($deleted) {
                return response()->json([
                   'message' => 'Xóa thành công',
                    'status' => 'success',
                ], 200);
            }

            // Nếu xóa không thành công nhưng không ném exception, trả về lỗi chung
            return response()->json([
                'message' => 'Xóa thành công',
                'status' => 'success',
            ], 200);
        } catch (\Exception $e) {
            Log::error("AdminOrderController@destroy error: " . $e->getMessage());
            return ApiExceptionHandler::handleException($e);
        }
    }
}
