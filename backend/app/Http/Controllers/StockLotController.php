<?php

namespace App\Http\Controllers;

use App\Services\StockLotService;
use App\Models\Variant; 
use App\Models\Supplier; 
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse; 
use App\Exceptions\ApiExceptionHandler; 
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class StockLotController extends Controller
{
    protected StockLotService $stockLotService; // Khai báo rõ ràng kiểu dữ liệu

    public function __construct(StockLotService $stockLotService)
    {
        $this->stockLotService = $stockLotService;
    }

    /**
     * GET /api/stock-lots
     * Lấy danh sách lô hàng với bộ lọc và phân trang, trả về JSON.
     * Tương ứng với chức năng 'Danh sách Lô hàng' trong UX.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only([
            'search', 'variant_id', 'status', 'from_date', 'to_date', 'supplier_id'
        ]);
        $perPage = $request->input('per_page', 15); // Cho phép frontend gửi số lượng mỗi trang

        try {
            $stockLots = $this->stockLotService->getPaginatedStockLots($filters, $perPage);

            // Có thể thêm danh sách Variants và Suppliers cho dropdown filter nếu frontend yêu cầu cùng lúc.
            // Tuy nhiên, thông thường sẽ có các API endpoint riêng cho các danh sách này.
            // Để đơn giản, tôi chỉ trả về data của stockLots.
            // Nếu bạn muốn bao gồm, uncomment 2 dòng dưới và thêm vào data trả về.
            // $variants = Variant::orderBy('name')->get(['id', 'name']);
            // $suppliers = Supplier::orderBy('name')->get(['id', 'name']);

            return response()->json([
                'message' => 'Lấy danh sách lô hàng thành công',
                'status' => 'success',
                'data' => $stockLots->toArray() // Chuyển Paginator thành array để có meta data
            ], 200);

        } catch (\Exception $e) {
            Log::error('Lỗi khi tải danh sách lô hàng: ' . $e->getMessage());
            return ApiExceptionHandler::handleException($e); // Sử dụng ApiExceptionHandler
        }
    }

    /**
     * GET /api/stock-lots/{id}
     * Lấy thông tin chi tiết của một lô hàng cụ thể, trả về JSON.
     * Tương ứng với chức năng 'Chi tiết Lô hàng' trong UX.
     *
     * @param int $id ID của lô hàng (StockLot ID).
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        try {
            $stockLot = $this->stockLotService->getStockLotDetails($id);

            if (!$stockLot) {
                // Trả về lỗi 404 nếu không tìm thấy
                return response()->json([
                    'message' => 'Lô hàng không tìm thấy.',
                    'status' => 'error',
                    'data' => null
                ], 404);
            }

            // Lấy lịch sử giao dịch của lô hàng này
            $transactions = $this->stockLotService->getLotTransactionHistory($id);

            return response()->json([
                'message' => 'Lấy thông tin chi tiết lô hàng thành công',
                'status' => 'success',
                'data' => [
                    'stock_lot' => $stockLot,
                    'transactions' => $transactions,
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('Lỗi khi tải chi tiết lô hàng ID ' . $id . ': ' . $e->getMessage());
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * GET /api/stock-lots/{id}/adjust-form
     * Cung cấp dữ liệu cần thiết để hiển thị form điều chỉnh số lượng lô hàng.
     * Tương ứng với việc tải dữ liệu cho form "Điều chỉnh tồn kho".
     *
     * @param int $id ID của lô hàng (StockLot ID).
     * @return JsonResponse
     */
    public function adjustForm(int $id): JsonResponse
    {
        try {
            $stockLot = $this->stockLotService->getStockLotDetails($id);

            if (!$stockLot) {
                return response()->json([
                    'message' => 'Lô hàng không tìm thấy để điều chỉnh.',
                    'status' => 'error',
                    'data' => null
                ], 404);
            }

            // Các loại giao dịch điều chỉnh (có thể lấy từ config/enum nếu có)
            $transactionTypes = [
                'ADJ_INVENTORY_COUNT' => 'Điều chỉnh kiểm kê',
                'ADJ_DAMAGE' => 'Hàng hư hỏng',
                'ADJ_LOSS' => 'Hàng bị mất',
                'ADJ_FOUND' => 'Hàng tìm thấy',
            ];

            return response()->json([
                'message' => 'Lấy dữ liệu form điều chỉnh thành công',
                'status' => 'success',
                'data' => [
                    'stock_lot' => $stockLot,
                    'transaction_types_options' => $transactionTypes,
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('Lỗi khi tải dữ liệu form điều chỉnh lô hàng ID ' . $id . ': ' . $e->getMessage());
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * POST /api/stock-lots/{id}/adjust
     * Xử lý yêu cầu điều chỉnh số lượng lô hàng, trả về JSON.
     * Tương ứng với việc submit form điều chỉnh.
     *
     * @param Request $request
     * @param int $id ID của lô hàng (StockLot ID).
     * @return JsonResponse
     */
    public function updateAdjustment(Request $request, int $id): JsonResponse
    {
        try {
            // 1. Validate dữ liệu đầu vào
            $request->validate([
                'quantity_change' => 'required|integer|not_in:0', // Số lượng thay đổi, không được bằng 0
                'transaction_type' => 'required|string', // Loại giao dịch
                'notes' => 'nullable|string|max:500', // Ghi chú lý do điều chỉnh
            ], [
                'quantity_change.required' => 'Số lượng thay đổi không được để trống.',
                'quantity_change.integer' => 'Số lượng thay đổi phải là số nguyên.',
                'quantity_change.not_in' => 'Số lượng thay đổi không được bằng 0.',
                'transaction_type.required' => 'Loại điều chỉnh không được để trống.',
            ]);

            $quantityChange = (int) $request->input('quantity_change');
            $transactionType = $request->input('transaction_type');
            $notes = $request->input('notes');
            $userId = Auth::id(); // Lấy ID người dùng hiện tại

            $updatedLot = $this->stockLotService->adjustStockLotQuantity(
                $id,
                $quantityChange,
                $transactionType,
                $notes,
                $userId
            );

            return response()->json([
                'message' => 'Điều chỉnh lô hàng thành công.',
                'status' => 'success',
                'data' => $updatedLot // Trả về thông tin lô hàng sau khi cập nhật
            ], 200);

        } catch (\Exception $e) {
            Log::error('Lỗi khi điều chỉnh lô hàng ID ' . $id . ': ' . $e->getMessage());
            return ApiExceptionHandler::handleException($e); // Sử dụng ApiExceptionHandler
        }
    }
}
