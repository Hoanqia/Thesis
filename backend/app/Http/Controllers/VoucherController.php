<?php

namespace App\Http\Controllers;

use App\Services\VoucherService;
use Illuminate\Http\Request;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class VoucherController extends Controller
{
    protected $voucherService;

    public function __construct(VoucherService $voucherService)
    {
        $this->voucherService = $voucherService;
    }

    /**
     * Lấy danh sách tất cả voucher
     */
    public function index()
    {
        try {
            $vouchers = $this->voucherService->getAll();

            return response()->json([
                'message' => $vouchers->isEmpty() ? 'Không có mã giảm giá' : 'Lấy danh sách mã giảm giá thành công',
                'status' => 'success',
                'data' => $vouchers,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Lấy chi tiết voucher theo ID
     */
    public function show($id)
    {
        try {
            $voucher = $this->voucherService->findById($id);

            if (!$voucher) {
                return response()->json([
                    'message' => 'Không tìm thấy mã giảm giá',
                    'status' => 'error',
                ], 404);
            }

            return response()->json([
                'message' => 'Lấy thông tin mã giảm giá thành công',
                'status' => 'success',
                'data' => $voucher,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Tạo mới voucher
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'type' => 'required|in:product_discount,shipping_discount',
                'discount_percent' => 'nullable|integer|min:0|max:100',
                'minimum_order_amount' => 'nullable|numeric|min:0',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after:start_date',
                'max_uses' => 'nullable|integer|min:1',
                'status' => 'nullable|boolean',
            ]);
            $validated['start_date'] = Carbon::parse($validated['start_date']);
             $validated['end_date']   = Carbon::parse($validated['end_date']);
            $voucher = $this->voucherService->create($validated);

            return response()->json([
                'message' => 'Tạo mã giảm giá thành công',
                'status' => 'success',
                'data' => $voucher,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Cập nhật voucher
     */
    public function update(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'type' => 'sometimes|in:product_discount,shipping_discount',
                'discount_percent' => 'nullable|integer|min:0|max:100',
                'minimum_order_amount' => 'nullable|numeric|min:0',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after:start_date',
                'max_uses' => 'nullable|integer|min:1',
                'status' => 'nullable|boolean',
            ]);
             $validated['start_date'] = Carbon::parse($validated['start_date']);
             $validated['end_date']   = Carbon::parse($validated['end_date']);
            $voucher = $this->voucherService->update($id, $validated);

            if (!$voucher) {
                return response()->json([
                    'message' => 'Không tìm thấy mã giảm giá để cập nhật',
                    'status' => 'error',
                ], 404);
            }

            return response()->json([
                'message' => 'Cập nhật mã giảm giá thành công',
                'status' => 'success',
                'data' => $voucher,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Xoá voucher
     */
    public function destroy($id)
    {
        try {
            $deleted = $this->voucherService->delete($id);

            if (!$deleted) {
                return response()->json([
                    'message' => 'Không tìm thấy mã giảm giá để xoá',
                    'status' => 'error',
                ], 404);
            }

            return response()->json([
                'message' => 'Xoá mã giảm giá thành công',
                'status' => 'success',
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Kiểm tra mã giảm giá có hợp lệ hay không (tùy theo đơn hàng)
     */
    public function validateVoucher(Request $request)
    {
        try {
            $validated = $request->validate([
                'code' => 'required|string',
                'order_amount' => 'required|numeric|min:0',
            ]);

            $result = $this->voucherService->validateVoucher($validated['code'], $validated['order_amount']);

            if (!$result['valid']) {
                return response()->json([
                    'message' => $result['message'],
                    'status' => 'error',
                ], 400);
            }

            return response()->json([
                'message' => 'Mã giảm giá hợp lệ',
                'status' => 'success',
                'data' => $result['voucher'],
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
}
