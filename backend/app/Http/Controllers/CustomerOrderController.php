<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\CustomerOrderService;
use App\Exceptions\ApiExceptionHandler;

class CustomerOrderController extends Controller
{
    protected $customerOrderService;

    public function __construct(CustomerOrderService $customerOrderService)
    {
        $this->customerOrderService = $customerOrderService;
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'payment_method' => 'required|string',
                'address_id' => 'nullable|integer|exists:addresses,id',
                'shipping_fee' => 'nullable|numeric|min:0',
            ]);

            $order = $this->customerOrderService->createOrder($validated);

            return response()->json([
                'message' => 'Đặt hàng thành công',
                'status' => 'success',
                'data' => $order
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function get($id)
    {
        try {
            $order = $this->customerOrderService->getOrderDetails($id);

            return response()->json([
                'message' => 'Lấy chi tiết đơn hàng thành công',
                'status' => 'success',
                'data' => $order
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function getAll()
    {
        try {
            $orders = $this->customerOrderService->getUserOrders();

            return response()->json([
                'message' => 'Lấy danh sách đơn hàng thành công',
                'status' => 'success',
                'data' => $orders
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function cancel_order($id)
    {
        try {
            $order = $this->customerOrderService->cancelOrder($id);

            return response()->json([
                'message' => 'Huỷ đơn hàng thành công',
                'status' => 'success',
                'data' => $order
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
    public function confirmReceived($id){
        try {
            $order = $this->customerOrderService->confirmReceived($id);

            return response()->json([
                'message' => 'Xác nhận đã nhận hàng thành công.',
                'status' => 'success',
                'data' => $order,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    
}
