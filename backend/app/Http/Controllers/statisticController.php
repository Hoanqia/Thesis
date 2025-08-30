<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\StatisticService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse; // Import for type hinting
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;
class StatisticController extends Controller
{
    protected StatisticService $statisticService;

    /**
     * Constructor để inject StatisticService.
     *
     * @param StatisticService $statisticService
     */
    public function __construct(StatisticService $statisticService)
    {
        $this->statisticService = $statisticService;
    }

    /**
     * Lấy các số liệu tổng quan cho HeroStatsCard.
     * Tương ứng với: GET /api/admin/dashboard-summary
     *
     * @return JsonResponse
     */
    public function getDashboardSummary(): JsonResponse
    {
        try {
            $summary = $this->statisticService->getDashboardSummary();
            return response()->json([
                'message' => 'Lấy dữ liệu tổng quan thành công',
                'status' => 'success',
                'data' => $summary
            ], 200);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Lấy dữ liệu cho biểu đồ doanh thu.
     * Tương ứng với: GET /api/admin/sales-trend-data
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getSalesTrendData(Request $request): JsonResponse
    {
        try {
            $period = $request->query('period', 'daily');
            $startDate = $request->query('startDate');
            $endDate = $request->query('endDate');

            $data = $this->statisticService->getSalesTrendData($period, $startDate, $endDate);
            return response()->json([
                'message' => 'Lấy dữ liệu xu hướng bán hàng thành công',
                'status' => 'success',
                'data' => $data
            ], 200);
        } catch (\Exception $e) {
                       return ApiExceptionHandler::handleException($e);

        }
    }
     /**
     * Lấy danh sách sản phẩm bán chạy nhất.
     * Tương ứng với: GET /api/admin/top-selling-products
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getTopSellingProducts(Request $request): JsonResponse
    {
        try {
            $perPage = (int) $request->query('per_page', 10);
            $period = $request->query('period', 'monthly');

            $products = $this->statisticService->getTopSellingProducts($perPage, $period);
            return response()->json([
                'message' => 'Lấy danh sách sản phẩm bán chạy nhất thành công',
                'status' => 'success',
                'data' => $products
            ], 200);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Lấy danh sách cảnh báo tồn kho thấp hoặc sắp hết hạn.
     * Tương ứng với: GET /api/admin/stock-alerts
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getStockAlerts(Request $request): JsonResponse
    {
        try {
            $type = $request->query('type', 'low_stock');
            $perPage = (int) $request->query('per_page', 10);
            
            $alerts = $this->statisticService->getStockAlerts($type, $perPage);
            return response()->json([
                'message' => 'Lấy cảnh báo tồn kho thành công',
                'status' => 'success',
                'data' => $alerts
            ], 200);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Lấy các hoạt động gần đây (nhập và xuất).
     * Tương ứng với: GET /api/admin/recent-activities
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getRecentActivities(Request $request): JsonResponse
    {
        try {
            $perPage = (int) $request->query('per_page', 10);
            $page = (int) $request->query('page', 1);

            $activities = $this->statisticService->getRecentActivities($perPage, $page);
            return response()->json([
                'message' => 'Lấy các hoạt động gần đây thành công',
                'status' => 'success',
                'data' => $activities
            ], 200);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
    // /**
    //  * Lấy danh sách sản phẩm bán chạy nhất.
    //  * Tương ứng với: GET /api/admin/top-selling-products
    //  *
    //  * @param Request $request
    //  * @return JsonResponse
    //  */
    // public function getTopSellingProducts(Request $request): JsonResponse
    // {
    //     try {
    //         $limit = (int) $request->query('limit', 5);
    //         $period = $request->query('period', 'monthly');

    //         $products = $this->statisticService->getTopSellingProducts($limit, $period);
    //         return response()->json([
    //             'message' => 'Lấy danh sách sản phẩm bán chạy nhất thành công',
    //             'status' => 'success',
    //             'data' => $products
    //         ], 200);
    //     } catch (\Exception $e) {
    //         return ApiExceptionHandler::handleException($e);

    //     }
    // }

    // /**
    //  * Lấy danh sách cảnh báo tồn kho thấp hoặc sắp hết hạn.
    //  * Tương ứng với: GET /api/admin/stock-alerts
    //  *
    //  * @param Request $request
    //  * @return JsonResponse
    //  */
    // public function getStockAlerts(Request $request): JsonResponse
    // {
    //     try {
    //         $type = $request->query('type'); // 'low_stock' hoặc 'expired_soon'
    //         $alerts = $this->statisticService->getStockAlerts($type);
    //         return response()->json([
    //             'message' => 'Lấy cảnh báo tồn kho thành công',
    //             'status' => 'success',
    //             'data' => $alerts
    //         ], 200);
    //     } catch (\Exception $e) {
    //                    return ApiExceptionHandler::handleException($e);

    //     }
    // }

    // /**
    //  * Lấy các hoạt động gần đây (nhập và xuất).
    //  * Tương ứng với: GET /api/admin/recent-activities
    //  *
    //  * @param Request $request
    //  * @return JsonResponse
    //  */
    // public function getRecentActivities(Request $request): JsonResponse
    // {
    //     try {
    //         $limit = (int) $request->query('limit', 10);
    //         $activities = $this->statisticService->getRecentActivities($limit);
    //         return response()->json([
    //             'message' => 'Lấy các hoạt động gần đây thành công',
    //             'status' => 'success',
    //             'data' => $activities
    //         ], 200);
    //     } catch (\Exception $e) {
    //                     return ApiExceptionHandler::handleException($e);

    //     }
    // }
}
