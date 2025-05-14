<?php

namespace App\Http\Controllers;

use App\Services\CustomerOrderService;
use Illuminate\Http\Request;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;

class CustomerOrderController extends Controller
{
    protected $customerOrderService;

    public function __construct(CustomerOrderService $customerOrderService)
    {
        $this->customerOrderService = $customerOrderService;
    }

    /**
     * Tạo đơn hàng mới từ giỏ hàng.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function createOrder(Request $request){
        try {
            // Validate dữ liệu đầu vào
            $validated = $request->validate([
                'shipping_id' => 'required|exists:shipping_methods,id',
                'payment_method' => 'required|string',
                'product_voucher_id' => 'nullable|integer',
                'shipping_voucher_id' => 'nullable|integer',
                'address_id' => 'nullable|exists:user_addresses,id',
            ]);

            // Gọi service để tạo đơn hàng
            $order = $this->customerOrderService->createOrder($validated);

            return response()->json([
                'message' => 'Tạo đơn hàng thành công',
                'status' => 'success',
                'data' => $order,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }


    /**
     * Lấy tất cả đơn hàng của người dùng.
     *
     * @return \Illuminate\Http\Response
     */
    public function getUserOrders()
    {
        try {
            // Lấy danh sách đơn hàng
            $orders = $this->customerOrderService->getUserOrders();

            return response()->json([
                'message' => $orders->isEmpty() ? 'Không có đơn hàng' : 'Lấy danh sách đơn hàng thành công',
                'status' => 'success',
                'data' => $orders,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Lấy chi tiết đơn hàng của người dùng.
     *
     * @param  int  $orderId
     * @return \Illuminate\Http\Response
     */
    public function getOrderDetails($orderId)
    {
        try {
            // Lấy chi tiết đơn hàng
            $order = $this->customerOrderService->getOrderDetails($orderId);

            return response()->json([
                'message' => 'Lấy chi tiết đơn hàng thành công',
                'status' => 'success',
                'data' => $order,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Hủy đơn hàng của người dùng.
     *
     * @param  int  $orderId
     * @return \Illuminate\Http\Response
     */
    public function cancelOrder($orderId)
    {
        try {
            // Hủy đơn hàng
            $order = $this->customerOrderService->cancelOrder($orderId);

            return response()->json([
                'message' => 'Đơn hàng đã được hủy thành công',
                'status' => 'success',
                'data' => $order,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Xác nhận đã nhận hàng.
     *
     * @param  int  $orderId
     * @return \Illuminate\Http\Response
     */
    public function confirmReceived($orderId)
    {
        try {
            // Xác nhận đã nhận hàng
            $order = $this->customerOrderService->confirmReceived($orderId);
            if(!$order){
                return response()->json([
                    'message' => 'Không tìm thấy đơn hàng có trạng thái shipping theo id này',
                    'status' => 'error',
                ],404);
            }
            return response()->json([
                'message' => 'Đơn hàng đã được xác nhận nhận thành công',
                'status' => 'success',
                'data' => $order,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
}
