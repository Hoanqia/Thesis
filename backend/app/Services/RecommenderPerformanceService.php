<?php

namespace App\Services;

use App\Models\RecommenderPerformance;
use Illuminate\Support\Collection; 
use Illuminate\Support\Facades\Log; 

class RecommenderPerformanceService
{
     /**
     * Lấy 10 bản ghi hiệu suất mô hình gần đây nhất, sắp xếp từ mới nhất trở xuống.
     * Đồng thời, so sánh hiệu suất của bản ghi mới nhất với bản ghi ngay trước đó.
     *
     * @return array {
     * 'latest_10_performances': Collection<RecommenderPerformance>, // 10 bản ghi
     * 'comparison': array {
     * 'ndcg_change': float|null,
     * 'precision_change': float|null,
     * 'recall_change': float|null,
     * 'map_change': float|null,
     * 'status': string // 'improved', 'decreased', 'no_change', 'not_enough_data', 'only_one_record_in_top10', 'no_data', 'error'
     * }
     * }
     */
    public function getLatest10PerformancesWithComparison(): array // Đổi tên hàm cho rõ ràng
    {
        $latest10Performances = new Collection(); // Khởi tạo một Collection rỗng
        $latestPerformance = null;
        $previousPerformance = null;
        $comparison = [
            'ndcg_change' => null,
            'precision_change' => null,
            'recall_change' => null,
            'map_change' => null,
            'status' => 'not_enough_data' // Mặc định
        ];

        try {
            // Lấy 10 bản ghi hiệu suất gần nhất, sắp xếp từ mới nhất trở xuống
            $latest10Performances = RecommenderPerformance::orderBy('created_at', 'desc')->take(10)->get();

            if ($latest10Performances->isNotEmpty()) {
                $latestPerformance = $latest10Performances->first(); // Bản ghi mới nhất
                
                // Kiểm tra xem có bản ghi thứ hai để so sánh không
                if ($latest10Performances->count() >= 2) {
                    $previousPerformance = $latest10Performances->skip(1)->first(); // Bản ghi ngay trước đó

                    // Logic so sánh vẫn giữ nguyên
                    $metrics = ['ndcg_at_n', 'precision_at_n', 'recall_at_n', 'map'];
                    $hasDecrease = false;
                    $hasImprovement = false;

                    foreach ($metrics as $metric) {
                        $latestValue = $latestPerformance->{$metric};
                        $previousValue = $previousPerformance->{$metric};

                        $change = $latestValue - $previousValue;
                        $comparison[str_replace('_at_n', '', $metric) . '_change'] = round($change, 4);

                        if ($change < 0) {
                            $hasDecrease = true;
                        } elseif ($change > 0) {
                            $hasImprovement = true;
                        }
                    }

                    if ($hasDecrease) {
                        $comparison['status'] = 'decreased';
                    } elseif ($hasImprovement) {
                        $comparison['status'] = 'improved';
                    } else {
                        $comparison['status'] = 'no_change';
                    }

                } else {
                    $comparison['status'] = 'only_one_record_in_top10'; // Chỉ có 1 bản ghi trong 10 bản mới nhất
                }
            } else {
                $comparison['status'] = 'no_data'; // Không có bản ghi nào trong DB
            }

        } catch (\Exception $e) {
            Log::error('Lỗi khi lấy 10 hiệu suất mô hình gần nhất và so sánh: ' . $e->getMessage(), ['exception' => $e]);
            $comparison['status'] = 'error';
        }

        return [
            'latest_10_performances' => $latest10Performances, // Trả về toàn bộ 10 bản ghi (hoặc ít hơn nếu không đủ)
            'comparison' => $comparison
        ];
    }


    /**
     * Ghi lại một bản ghi hiệu suất mới.
     *
     * @param array $data Dữ liệu hiệu suất để lưu.
     * @return RecommenderPerformance|null
     */
    public function recordPerformance(array $data): ?RecommenderPerformance
    {
        try {
            // Đảm bảo các khóa khớp với $fillable trong Model
            return RecommenderPerformance::create($data);
        } catch (\Exception $e) {
            Log::error('Lỗi khi ghi hiệu suất mô hình: ' . $e->getMessage(), ['data' => $data, 'exception' => $e]);
            return null;
        }
    }


    //     composer require symfony/process

    /**
     * Chạy một tệp Python cụ thể và trả về kết quả.
     *
     * @param string $scriptName Tên của tệp Python (ví dụ: 'my_script.py').
     * @param array $args Mảng các đối số để truyền vào script Python.
     * @return array {
     * 'success': bool,
     * 'output': string|null,
     * 'error': string|null,
     * 'exit_code': int|null
     * }
     */
    public function runPythonScript(string $scriptName, array $args = []): array
    {
        $scriptPath = base_path('backend/script/Complete-Thesis/' . $scriptName);

        // Kiểm tra xem tệp script có tồn tại không
        if (!file_exists($scriptPath)) {
            Log::error('Tệp Python không tìm thấy: ' . $scriptPath);
            return [
                'success' => false,
                'output' => null,
                'error' => 'Tệp Python không tồn tại tại: ' . $scriptPath,
                'exit_code' => null
            ];
        }

        // Xây dựng lệnh với các đối số
        // Đảm bảo rằng bạn có Python trong PATH hoặc cung cấp đường dẫn đầy đủ đến executable của Python.
        // Ví dụ: '/usr/bin/python3' hoặc 'C:\Python\Python39\python.exe'
        $command = ['python3', $scriptPath]; // Giả sử 'python3' là lệnh của bạn
        $command = array_merge($command, $args); // Thêm các đối số

        try {
            $process = new Process($command);
            $process->setTimeout(3600); // Đặt thời gian chờ là 1 giờ (có thể điều chỉnh)

            Log::info('Đang chạy script Python: ' . implode(' ', $command));

            $process->run();

            // Kiểm tra xem lệnh đã chạy thành công chưa
            if ($process->isSuccessful()) {
                Log::info('Script Python chạy thành công.', ['output' => $process->getOutput()]);
                return [
                    'success' => true,
                    'output' => $process->getOutput(),
                    'error' => null,
                    'exit_code' => $process->getExitCode()
                ];
            } else {
                Log::error('Script Python chạy thất bại.', [
                    'output' => $process->getOutput(),
                    'error' => $process->getErrorOutput(),
                    'exit_code' => $process->getExitCode()
                ]);
                return [
                    'success' => false,
                    'output' => $process->getOutput(),
                    'error' => $process->getErrorOutput(),
                    'exit_code' => $process->getExitCode()
                ];
            }
        } catch (\Exception $e) {
            Log::error('Lỗi khi thực thi script Python: ' . $e->getMessage(), ['exception' => $e]);
            return [
                'success' => false,
                'output' => null,
                'error' => 'Ngoại lệ khi thực thi script Python: ' . $e->getMessage(),
                'exit_code' => null
            ];
        }
    }

}