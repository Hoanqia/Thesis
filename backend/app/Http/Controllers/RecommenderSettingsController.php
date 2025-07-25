<?php

namespace App\Http\Controllers;

use App\Services\RecommenderSettingService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse; // Import cho kiểu trả về JsonResponse
use Illuminate\Support\Facades\Log; // Để ghi log lỗi
use App\Exceptions\ApiExceptionHandler; // Giả định ApiExceptionHandler đã tồn tại và xử lý lỗi

class RecommenderSettingsController extends Controller
{
    protected RecommenderSettingService $recommenderSettingService;

    /**
     * Constructor để inject RecommenderSettingService.
     *
     * @param RecommenderSettingService $recommenderSettingService
     */
    public function __construct(RecommenderSettingService $recommenderSettingService)
    {
        $this->recommenderSettingService = $recommenderSettingService;
    }

    /**
     * Lấy tất cả các tham số cấu hình của hệ thống gợi ý.
     * Tương ứng với: GET /api/admin/recommender/settings
     *
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        try {
            $settings = $this->recommenderSettingService->getAllSettings();
            return response()->json([
                'message' => 'Lấy dữ liệu cấu hình thành công',
                'status' => 'success',
                'data' => $settings
            ], 200);
        } catch (\Exception $e) {
            Log::error("Lỗi khi lấy cấu hình hệ thống gợi ý: " . $e->getMessage(), ['exception' => $e]);
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Cập nhật một hoặc nhiều tham số của hệ thống gợi ý.
     * Tương ứng với: POST /api/admin/recommender/settings
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function update(Request $request): JsonResponse
    {
        try {
            // Lấy tất cả dữ liệu từ request.
            // Giả định body request là JSON chứa các cặp key-value của settings.
            $inputSettings = $request->json()->all(); // Lấy dữ liệu từ JSON body

            if (empty($inputSettings)) {
                return response()->json([
                    'message' => 'Không có tham số nào được cung cấp để cập nhật.',
                    'status' => 'error',
                    'errors' => ['No settings provided.']
                ], 400);
            }

            $results = $this->recommenderSettingService->updateMultipleSettings($inputSettings);

            $successCount = 0;
            $errorMessages = [];
            $failedSettings = [];

            foreach ($results as $key => $result) {
                if ($result['success']) {
                    $successCount++;
                } else {
                    $errorMessage = "Tham số '{$key}': " . ($result['message'] ?? 'Lỗi không xác định.');
                    // Đã bỏ kiểm tra 'python_error' vì service không còn trả về nữa
                    $errorMessages[] = $errorMessage;
                    $failedSettings[$key] = $errorMessage;
                }
            }

            if ($successCount === count($inputSettings)) {
                return response()->json([
                    'message' => 'Tất cả tham số đã được cập nhật thành công.', // Bỏ "và đã thông báo cho Python."
                    'status' => 'success',
                    'data' => $results // Có thể trả về kết quả chi tiết của từng setting
                ], 200);
            } elseif ($successCount > 0) {
                return response()->json([
                    'message' => 'Một số tham số đã được cập nhật, nhưng có lỗi xảy ra với các tham số khác.',
                    'status' => 'warning',
                    'data' => $results,
                    'errors' => $errorMessages,
                    'failed_settings' => $failedSettings
                ], 200); // Vẫn trả về 200 OK nếu có một phần thành công
            } else {
                return response()->json([
                    'message' => 'Không thể cập nhật bất kỳ tham số nào.',
                    'status' => 'error',
                    'data' => $results,
                    'errors' => $errorMessages,
                    'failed_settings' => $failedSettings
                ], 500); // Trả về 500 Internal Server Error nếu tất cả đều thất bại
            }

        } catch (\Exception $e) {
            Log::error("Lỗi hệ thống khi cập nhật tham số gợi ý: " . $e->getMessage(), ['exception' => $e, 'request_data' => $request->all()]);
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Lấy giá trị của một tham số cụ thể.
     * Tương ứng với: GET /api/admin/recommender/settings/{key}
     *
     * @param string $key
     * @return JsonResponse
     */
    public function show(string $key): JsonResponse
    {
        try {
            $setting = $this->recommenderSettingService->getSetting($key);
            if ($setting !== null) {
                return response()->json([
                    'message' => 'Lấy tham số thành công',
                    'status' => 'success',
                    'data' => [
                        'key' => $key,
                        'value' => $setting
                    ]
                ], 200);
            }
            return response()->json([
                'message' => 'Tham số không tìm thấy',
                'status' => 'error'
            ], 404);
        } catch (\Exception $e) {
            Log::error("Lỗi khi lấy tham số '{$key}': " . $e->getMessage(), ['exception' => $e]);
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Cập nhật một tham số cụ thể.
     * Tương ứng với: PUT/PATCH /api/admin/recommender/settings/{key}
     *
     * @param Request $request
     * @param string $key
     * @return JsonResponse
     */
    public function updateSingle(Request $request, string $key): JsonResponse
    {
        try {
            $newValue = $request->json('value'); // Lấy giá trị từ JSON body

            if ($newValue === null) {
                return response()->json([
                    'message' => 'Thiếu tham số "value" trong request body.',
                    'status' => 'error',
                    'errors' => ['Value parameter is missing.']
                ], 400);
            }

            $result = $this->recommenderSettingService->updateSetting($key, $newValue);

            if ($result['success']) {
                return response()->json([
                    'message' => "Tham số '{$key}' đã được cập nhật thành công.", // Bỏ "và đã thông báo cho Python."
                    'status' => 'success',
                    'data' => ['key' => $key, 'new_value' => $newValue]
                    // Đã bỏ 'python_output'
                ], 200);
            } else {
                $errorMessage = ($result['message'] ?? 'Lỗi không xác định.');
                // Đã bỏ kiểm tra 'python_error'
                return response()->json([
                    'message' => "Không thể cập nhật tham số '{$key}'.",
                    'status' => 'error',
                    'errors' => [$errorMessage]
                    // Đã bỏ 'python_output'
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error("Lỗi hệ thống khi cập nhật tham số đơn '{$key}': " . $e->getMessage(), ['exception' => $e, 'request_data' => $request->all()]);
            return ApiExceptionHandler::handleException($e);
        }
    }
}
