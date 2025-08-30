<?php

namespace App\Services;

use App\Models\RecommenderPerformance;
use Illuminate\Support\Collection; 
use Illuminate\Support\Facades\Log; 
use Symfony\Component\Process\Process;
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


  

}