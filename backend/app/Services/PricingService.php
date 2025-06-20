<?php
// app/Services/PricingService.php

namespace App\Services;

use App\Models\Variant;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException; // Thêm vào để sử dụng exception rõ ràng hơn

class PricingService
{
    /**
     * Tính toán giá bán gợi ý dựa trên giá vốn bình quân và tỷ lệ lợi nhuận mục tiêu.
     *
     * @param float $averageCost Giá vốn bình quân hiện tại của sản phẩm.
     * @param float $profitPercent Tỷ lệ lợi nhuận mong muốn (ví dụ: 25 cho 25%).
     * @return float Giá bán gợi ý.
     */
    public function calculateSuggestedPrice(float $averageCost, float $profitPercent): float
    {
        if ($averageCost < 0) {
            throw new InvalidArgumentException("Average cost cannot be negative.");
        }
        if ($profitPercent < 0) {
            // Có thể cho phép profitPercent âm nếu muốn tính giá lỗ
            // Nhưng nếu không, hãy ném exception hoặc đặt lại = 0
            throw new InvalidArgumentException("Profit percentage cannot be negative for calculation.");
        }

        // Đảm bảo không chia cho 0 hoặc tính toán không hợp lệ nếu averageCost là 0
        if ($averageCost === 0.0) {
            // Nếu giá vốn là 0, giá bán cũng có thể là 0, hoặc một giá trị mặc định.
            // Tùy thuộc vào nghiệp vụ của bạn. Ở đây giả định là 0.
            return 0.0;
        }

        $price = $averageCost * (1 + $profitPercent / 100);

        // Bạn có thể thêm logic làm tròn giá ở đây nếu cần, ví dụ:
        // $price = round($price, 0); // Làm tròn đến số nguyên
        // $price = ceil($price / 1000) * 1000 - 10; // Ví dụ làm tròn 990k
        return round($price, 2); // Làm tròn 2 chữ số thập phân cho giá tiền
    }

    /**
     * Tính toán lại tỷ lệ lợi nhuận dựa trên giá bán và giá vốn bình quân.
     * Hữu ích khi giá bán được đặt thủ công hoặc điều chỉnh.
     *
     * @param float $price Giá bán hiện tại.
     * @param float $averageCost Giá vốn bình quân.
     * @return float Tỷ lệ lợi nhuận (%). Trả về 0 nếu averageCost là 0.
     */
    public function calculateActualProfitPercent(float $price, float $averageCost): float
    {
        if ($averageCost <= 0) {
            return 0.0; // Không thể tính tỷ lệ lợi nhuận nếu giá vốn là 0 hoặc âm
        }
        return (($price / $averageCost) - 1) * 100;
    }


    
      public function setPricesByTargetProfit(array $variantIds, float $targetProfitPercent, ?string $psychologicalStrategy = "charm_vnd_990"): int
    {
        if (!is_array($variantIds) || empty($variantIds)) {
            throw new InvalidArgumentException("Variant IDs array cannot be empty.");
        }
        if ($targetProfitPercent < -100) { // Cho phép lợi nhuận âm nhưng không thấp hơn -100%
            throw new InvalidArgumentException("Target profit percentage cannot be less than -100%.");
        }

        return DB::transaction(function () use ($variantIds, $targetProfitPercent, $psychologicalStrategy) {
            $updatedCount = 0;

            $variants = Variant::whereIn('id', $variantIds)
                               ->lockForUpdate()
                               ->get();

            foreach ($variants as $variant) {
                $suggestedPrice = $this->calculateSuggestedPrice((float) $variant->average_cost, $targetProfitPercent);

                $finalPriceToSet = $suggestedPrice; 

                if ($psychologicalStrategy) {
                    $finalPriceToSet = $this->calculatePsychologicalPrice($suggestedPrice, $psychologicalStrategy);
                }

                // Đảm bảo giá cuối cùng không âm và làm tròn
                $finalPriceToSet = max(0.0, round($finalPriceToSet, 2));

                // Cập nhật giá bán và profit_percent
                $variant->update([
                    'price' => $finalPriceToSet,
                    'profit_percent' => $targetProfitPercent, // Profit_percent được đặt theo giá trị mục tiêu
                ]);
                $updatedCount++;
            }
            return $updatedCount;
        });
    }




    public function updatePricesByCurrentAverageCostAndProfit(array $variantIds, ?string $psychologicalStrategy = "charm_vnd_990"): int
    {
        if (!is_array($variantIds) || empty($variantIds)) {
            throw new InvalidArgumentException("Variant IDs array cannot be empty.");
        }

        return DB::transaction(function () use ($variantIds, $psychologicalStrategy) {
            $updatedCount = 0;

            $variants = Variant::whereIn('id', $variantIds)
                               ->lockForUpdate() // Đảm bảo không có cập nhật đồng thời
                               ->get();

            foreach ($variants as $variant) {
                $currentAverageCost = (float) $variant->average_cost;
                $currentProfitPercent = (float) $variant->profit_percent;

                // 1. Tính giá gợi ý ban đầu dựa trên average_cost và profit_percent hiện tại
                $suggestedPrice = $this->calculateSuggestedPrice($currentAverageCost, $currentProfitPercent);

                $finalPriceToSet = $suggestedPrice; // Mặc định là giá gợi ý

                // 2. Áp dụng giá tâm lý nếu có chiến lược được cung cấp
                if ($psychologicalStrategy) {
                    $finalPriceToSet = $this->calculatePsychologicalPrice($suggestedPrice, $psychologicalStrategy);
                }

                // Đảm bảo giá cuối cùng không âm
                $finalPriceToSet = max(0.0, round($finalPriceToSet, 2));

                // 3. Cập nhật giá bán của biến thể
                $variant->update([
                    'price' => $finalPriceToSet,
                    // profit_percent KHÔNG thay đổi ở đây, vì chúng ta muốn duy trì
                    // tỷ lệ lợi nhuận ban đầu so với average_cost MỚI.
                    // Nếu bạn muốn profit_percent được tính lại dựa trên finalPriceToSet
                    // và currentAverageCost, bạn có thể thêm dòng này:
                    // 'profit_percent' => $this->calculateActualProfitPercent($finalPriceToSet, $currentAverageCost),
                    // nhưng hãy cẩn thận với mục đích của hàm này. Theo yêu cầu, nó là "profit_percent hiện tại".
                ]);
                $updatedCount++;
            }
            return $updatedCount;
        });
    }






    /**
     * Điều chỉnh giá bán hiện tại của các biến thể theo phần trăm hoặc số tiền cố định.
     * Tỷ lệ lợi nhuận sẽ được tính toán lại dựa trên giá bán mới.
     *
     * @param array $variantIds Mảng ID của các Variant cần điều chỉnh.
     * @param float $adjustmentValue Giá trị điều chỉnh (ví dụ: 10 cho 10%, hoặc 50000 cho 50.000đ).
     * @param string $adjustmentType 'percentage' hoặc 'amount'.
     * @param string $operation 'increase' hoặc 'decrease'.
     * @return int Số lượng variant đã được cập nhật thành công.
     * @throws InvalidArgumentException
     */
    public function adjustPrices(array $variantIds, float $adjustmentValue, string $adjustmentType = 'percentage', string $operation = 'increase'): int
    {
        if (!is_array($variantIds) || empty($variantIds)) {
            throw new InvalidArgumentException("Variant IDs array cannot be empty.");
        }
        if (!in_array($adjustmentType, ['percentage', 'amount'])) {
            throw new InvalidArgumentException("Adjustment type must be 'percentage' or 'amount'.");
        }
        if (!in_array($operation, ['increase', 'decrease'])) {
            throw new InvalidArgumentException("Operation must be 'increase' or 'decrease'.");
        }
        if ($adjustmentValue < 0) {
            throw new InvalidArgumentException("Adjustment value cannot be negative.");
        }

        return DB::transaction(function () use ($variantIds, $adjustmentValue, $adjustmentType, $operation) {
            $updatedCount = 0;
            $sign = ($operation === 'increase') ? 1 : -1;

            $variants = Variant::whereIn('id', $variantIds)
                                      ->lockForUpdate()
                                      ->get();

            foreach ($variants as $variant) {
                $oldPrice = $variant->price;
                $newPrice = $oldPrice;

                if ($adjustmentType === 'percentage') {
                    $newPrice = $oldPrice * (1 + ($sign * $adjustmentValue / 100));
                } else { // 'amount'
                    $newPrice = $oldPrice + ($sign * $adjustmentValue);
                }

                // Đảm bảo giá không âm
                if ($newPrice < 0) {
                    $newPrice = 0.0;
                }
                $newPrice = round($newPrice, 2); // Làm tròn giá mới

                // Tính toán lại profit_percent dựa trên giá mới (nếu average_cost > 0)
                $newProfitPercent = $this->calculateActualProfitPercent($newPrice, $variant->average_cost);

                $variant->update([
                    'price' => $newPrice,
                    'profit_percent' => $newProfitPercent,
                ]);
                $updatedCount++;
            }
            return $updatedCount;
        });
    }

    /**
     * Đặt một giá bán cố định cho một tập hợp các biến thể.
     * Tỷ lệ lợi nhuận sẽ được tính toán lại dựa trên giá bán mới.
     *
     * @param array $variantIds Mảng ID của các Variant cần cập nhật.
     * @param float $newFixedPrice Giá bán cố định mới.
     * @return int Số lượng variant đã được cập nhật thành công.
     * @throws InvalidArgumentException
     */
    public function setFixedPrices(array $variantIds, float $newFixedPrice): int
    {
        if (!is_array($variantIds) || empty($variantIds)) {
            throw new InvalidArgumentException("Variant IDs array cannot be empty.");
        }
        if ($newFixedPrice < 0) {
            throw new InvalidArgumentException("New fixed price cannot be negative.");
        }

        return DB::transaction(function () use ($variantIds, $newFixedPrice) {
            $updatedCount = 0;
            $newFixedPrice = round($newFixedPrice, 2); // Làm tròn giá cố định

            $variants = Variant::whereIn('id', $variantIds)
                                      ->lockForUpdate()
                                      ->get();

            foreach ($variants as $variant) {
                // Tính toán lại profit_percent dựa trên giá mới
                $newProfitPercent = $this->calculateActualProfitPercent($newFixedPrice, $variant->average_cost);

                $variant->update([
                    'price' => $newFixedPrice,
                    'profit_percent' => $newProfitPercent,
                ]);
                $updatedCount++;
            }
            return $updatedCount;
        });
    }

    public function calculatePsychologicalPrice(float $basePrice, string $strategy): float
    {
        // Đảm bảo giá không âm
        if ($basePrice < 0) {
            throw new InvalidArgumentException("Base price cannot be negative for psychological pricing.");
        }

        $adjustedPrice = $basePrice; // Mặc định giữ nguyên nếu không có chiến lược hoặc không phù hợp

        switch ($strategy) {
            case 'charm_vnd_990':
                // Chiến lược giá tâm lý phổ biến ở VN (kết thúc bằng X.990, X9.900, X.990.000)
                // Mục tiêu: Làm giá thấp hơn mốc tròn tiếp theo và kết thúc bằng X.990 (hoặc tương tự)
                // Luôn cố gắng làm giảm hoặc giữ nguyên giá, tránh tăng giá lớn.

                $unit = 0;
                $charm_suffix = 0;

                if ($basePrice >= 1000000) { // Từ 1 triệu trở lên (X.990.000)
                    $unit = 1000000;
                    $charm_suffix = 990000;
                } elseif ($basePrice >= 100000) { // Từ 100 nghìn đến dưới 1 triệu (X9.900)
                    $unit = 100000;
                    $charm_suffix = 99000;
                } elseif ($basePrice >= 1000) { // Từ 1 nghìn đến dưới 100 nghìn (X.990)
                    $unit = 1000;
                    $charm_suffix = 990;
                } else {
                    // Với các giá trị nhỏ hơn 1000, chiến lược .990 không phổ biến ở VND
                    // Giữ nguyên giá hoặc bạn có thể định nghĩa một quy tắc khác (ví dụ: làm tròn đến hàng trăm gần nhất)
                    return round($basePrice, 2); // Trả về giá gốc (làm tròn)
                }

                // Logic chung cho tất cả các ngưỡng:
                // Tìm mốc đơn vị tròn ngay dưới hoặc bằng basePrice.
                $floorUnit = floor($basePrice / $unit) * $unit;

                // Tính giá mục tiêu X.990 của mốc hiện tại
                $targetPriceCurrentUnit = $floorUnit + $charm_suffix;

                // Tính giá mục tiêu X.990 của mốc đơn vị phía trên
                $targetPriceNextUnit = ($floorUnit + $unit) + $charm_suffix;


                // So sánh basePrice với các mốc X.990 để chọn giá phù hợp
                if ($basePrice >= $targetPriceCurrentUnit) {
                    // Nếu basePrice đã lớn hơn hoặc bằng mốc X.990 của đơn vị hiện tại
                    // Ví dụ: basePrice = 20.990.000 -> targetPriceCurrentUnit = 20.990.000 -> adjustedPrice = 20.990.000
                    // Ví dụ: basePrice = 20.995.000 -> targetPriceCurrentUnit = 20.990.000 -> adjustedPrice = 20.990.000 (giảm 5.000)
                    $adjustedPrice = $targetPriceCurrentUnit;
                } else {
                    // Nếu basePrice nhỏ hơn mốc X.990 của đơn vị hiện tại (nghĩa là nó nằm ở khoảng đầu/giữa của đơn vị)
                    // Ví dụ: basePrice = 22.255.000, targetPriceCurrentUnit = 22.990.000 (lớn hơn basePrice)
                    // -> Trong trường hợp này, chúng ta muốn lùi về mốc X.990 của đơn vị PHÍA DƯỚI
                    // Tức là 21.990.000
                    $adjustedPrice = ($floorUnit - $unit) + $charm_suffix;

                    // Đảm bảo giá không âm nếu floorUnit - unit làm giá quá thấp
                    if ($adjustedPrice < 0) {
                        $adjustedPrice = 0;
                    }
                }
                break;

            case 'charm_99': // Kết thúc bằng .99 (phổ biến ở thị trường USD)
                $adjustedPrice = floor($basePrice) + 0.99;
                break;

            default:
                // Nếu không có chiến lược cụ thể, trả về giá cơ sở
                $adjustedPrice = $basePrice;
                break;
        }

        // Luôn làm tròn giá cuối cùng đến 2 chữ số thập phân (để tránh sai số thập phân)
        return round($adjustedPrice, 2);
    }
    


}



?>