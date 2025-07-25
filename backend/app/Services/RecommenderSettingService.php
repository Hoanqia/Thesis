<?php

namespace App\Services;

use App\Models\RecommenderSetting;
use Illuminate\Support\Facades\Log; // Giữ lại Log nếu bạn vẫn muốn ghi log

class RecommenderSettingService
{
    // Không còn cần các thuộc tính liên quan đến Python executable hay script path nữa
    // protected string $pythonScriptPath;
    // protected string $pythonExecutable;

    public function __construct()
    {
        // Không còn cần khởi tạo các thuộc tính liên quan đến Python nữa
        // $this->pythonScriptPath = base_path('scripts/Hybrid_RS.py');
        // $this->pythonExecutable = env('PYTHON_EXECUTABLE', 'python3');
    }

    /**
     * Lấy tất cả các tham số cấu hình từ database.
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getAllSettings()
    {
        return RecommenderSetting::all();
    }

    /**
     * Lấy giá trị của một tham số cụ thể.
     *
     * @param string $key
     * @return mixed|null
     */
    public function getSetting(string $key)
    {
        return RecommenderSetting::getValueByKey($key);
    }

    /**
     * Cập nhật một tham số cấu hình trong database.
     * Không còn thông báo cho script Python nữa, Python sẽ tự lấy cấu hình từ DB.
     *
     * @param string $key Tên của tham số.
     * @param mixed $newValue Giá trị mới của tham số.
     * @return array Kết quả của quá trình cập nhật.
     */
    public function updateSetting(string $key, $newValue): array
    {
        // 1. Cập nhật giá trị tham số trong database
        $updatedInDb = RecommenderSetting::updateValueByKey($key, $newValue);

        if (!$updatedInDb) {
            Log::error("Failed to update recommender setting '{$key}' in database.");
            return [
                'success' => false,
                'message' => "Không thể cập nhật tham số '{$key}' trong database."
                // Không còn 'python_output' hay 'python_error' nữa
            ];
        }

        // Không còn bước 2: Gọi script Python để truyền tham số nữa.
        // Python giờ đây sẽ chủ động lấy dữ liệu từ DB khi cần.

        Log::info("Recommender setting '{$key}' updated to '{$newValue}' in database.");

        return [
            'success' => true,
            'message' => "Cập nhật tham số '{$key}' thành công trong database."
            // Không còn 'python_output' hay 'python_error' nữa
        ];
    }

    /**
     * Cập nhật nhiều tham số cấu hình cùng lúc.
     *
     * @param array $settings Mảng các cặp key-value (e.g., ['TOP_K' => 15, 'HYBRID_ALPHA' => 0.7])
     * @return array Kết quả của quá trình cập nhật.
     */
    public function updateMultipleSettings(array $settings): array
    {
        $results = [];
        foreach ($settings as $key => $value) {
            $results[$key] = $this->updateSetting($key, $value);
        }
        return $results;
    }
}
