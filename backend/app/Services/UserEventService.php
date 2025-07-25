<?php

namespace App\Services;

use App\Models\UserEvent;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use LogicException;

class UserEventService
{
    /** @var UserEvent */
    protected $userEvent;

    public function __construct(UserEvent $userEvent)
    {
        $this->userEvent = $userEvent;
    }




     // Các tham số cấu hình cho trọng số sự kiện.
    // Các giá trị này nên được đặt dựa trên phân tích dữ liệu và mục tiêu kinh doanh.
    // Ví dụ: view = 0.1 (ít quan trọng), purchase = 2.0 (rất quan trọng)
    const EVENT_TYPE_BASE_WEIGHTS = [
        'view'          => 0.1,  // Chỉ xem, mức độ cam kết thấp nhất
        'wishlist'      => 0.5,  // Đã thể hiện sự quan tâm, có ý định lưu lại
        'add_to_cart'   => 1.0,  // Bước rất gần đến mua hàng, ý định cao
        'purchase'      => 2.0,  // Hành động chuyển đổi cao nhất, thể hiện cam kết mạnh mẽ
        'rate_default'  => 0.3,  // Trọng số mặc định cho rating nếu không có giá trị (ví dụ: rating 3 sao)
        'rate_max_multiplier' => 0.4, // Hệ số nhân cho rating 5 sao để đưa nó về thang đo chung
        'max_rating_value' => 5.0, // Giá trị tối đa của rating (ví dụ: 5 sao)
    ];

    // Các tham số cấu hình cho việc giảm trọng số theo thời gian (Recency Decay).
    // Cũng cần được tinh chỉnh.
    const RECENCY_DECAY_RATE = 0.01; // Tốc độ giảm trọng số mỗi ngày (ví dụ: 1% mỗi ngày)
    const RECENCY_DECAY_OFFSET_DAYS = 0; // Số ngày mà trọng số không giảm ban đầu

    /**
     * Lấy trọng số cơ bản dựa trên loại sự kiện. Đây là phần "Loại sự kiện" của SAR.
     * Các giá trị được chọn để phản ánh mức độ cam kết hoặc ý định của người dùng.
     *
     * @param string $eventType Loại sự kiện ('view', 'wishlist', 'add_to_cart', 'purchase', 'rate').
     * @param mixed $value Giá trị bổ sung (ví dụ: điểm rating cho 'rate').
     * @return float Trọng số cơ bản cho loại sự kiện.
     */
    protected function getEventTypeBaseWeight(string $eventType, $value = null): float
    {
        switch ($eventType) {
            case 'view':
                return self::EVENT_TYPE_BASE_WEIGHTS['view'];
            case 'wishlist':
                return self::EVENT_TYPE_BASE_WEIGHTS['wishlist'];
            case 'add_to_cart':
                return self::EVENT_TYPE_BASE_WEIGHTS['add_to_cart'];
            case 'purchase':
                return self::EVENT_TYPE_BASE_WEIGHTS['purchase'];
            case 'rate':
                $rating = is_numeric($value) ? (float) $value : self::EVENT_TYPE_BASE_WEIGHTS['rate_default'];

                // Đảm bảo rating nằm trong khoảng hợp lệ (1 đến max_rating_value)
                $rating = max(1.0, min(self::EVENT_TYPE_BASE_WEIGHTS['max_rating_value'], $rating));

                // Scale rating để nó phù hợp với thang đo của các hành động khác.
                // Ví dụ: rating 5 sao có thể có trọng số tương đương với "purchase".
                $scaledRatingWeight = ($rating / self::EVENT_TYPE_BASE_WEIGHTS['max_rating_value'])
                                    * self::EVENT_TYPE_BASE_WEIGHTS['rate_max_multiplier']
                                    * self::EVENT_TYPE_BASE_WEIGHTS['max_rating_value'];
                return $scaledRatingWeight;
            default:
                return 0.0; // Các loại sự kiện không xác định sẽ không đóng góp trọng số
        }
    }

    /**
     * Tính toán yếu tố giảm dần trọng số theo độ gần đây của sự kiện.
     * Đây là phần "Độ gần đây" của SAR, giúp hệ thống thích ứng.
     *
     * @param int $eventTimestamp Timestamp (UNIX) của sự kiện.
     * @return float Yếu tố giảm dần (từ 0.0 đến 1.0).
     */
    protected function getRecencyDecayFactor(int $eventTimestamp): float
    {
        if ($eventTimestamp <= 0) {
            // Nếu không có timestamp hợp lệ, coi như sự kiện gần nhất (không bị giảm trọng số)
            return 1.0;
        }

        $now = time(); // Thời gian hiện tại theo timestamp
        $secondsPassed = max(0, $now - $eventTimestamp); // Thời gian đã trôi qua (giây)
        $daysPassed = $secondsPassed / (60 * 60 * 24); // Chuyển đổi sang số ngày

        // Áp dụng offset: Trọng số chỉ bắt đầu giảm sau một số ngày nhất định.
        $effectiveDaysPassed = max(0, $daysPassed - self::RECENCY_DECAY_OFFSET_DAYS);

        // Công thức hàm mũ giảm dần: exp(-decayRate * effective_days_passed)
        $recencyFactor = exp(-self::RECENCY_DECAY_RATE * $effectiveDaysPassed);

        // Đảm bảo giá trị nằm trong khoảng hợp lý [0, 1]
        return max(0.0, min(1.0, $recencyFactor));
    }

    /**
     * Tính toán điểm ưu thích (Affinity) của một người dùng đối với một mục cụ thể.
     * Đây chính là "hàm getWeight của SAR" theo đúng nghĩa tổng hợp.
     * Nó kết hợp trọng số loại sự kiện, độ gần đây và tần suất.
     *
     * @param array $userItemEvents Một mảng các sự kiện (tương tác) của MỘT người dùng với MỘT mục cụ thể.
     * Mỗi phần tử của mảng phải chứa:
     * [
     * 'event_type' => string,
     * 'value' => mixed|null, // Dành cho rating
     * 'timestamp' => int,    // Timestamp UNIX của sự kiện
     * ]
     * @return float Tổng trọng số Affinity của người dùng đó với mục đã cho.
     */
    public function calculateUserItemAffinity(array $userItemEvents): float
    {
        $totalAffinity = 0.0;

        // Yếu tố "Tần suất" được xử lý ở đây: mỗi sự kiện được cộng dồn vào tổng Affinity
        foreach ($userItemEvents as $event) {
            $eventType = $event['event_type'] ?? 'unknown';
            $value = $event['value'] ?? null;
            $timestamp = $event['timestamp'] ?? 0;

            // Lấy trọng số cơ bản theo loại sự kiện
            $baseWeight = $this->getEventTypeBaseWeight($eventType, $value);

            // Lấy yếu tố giảm dần theo độ gần đây
            $recencyFactor = $this->getRecencyDecayFactor($timestamp);

            // Trọng số của sự kiện đơn lẻ này
            $eventWeight = $baseWeight * $recencyFactor;

            // Cộng dồn vào tổng Affinity.
            $totalAffinity += $eventWeight;
        }

        return $totalAffinity;
    }

    
  /**
     * Truy vấn trọng số (weight) cho từng loại event.
     */
    protected function getEventWeight(string $eventType, $value = null): int
    {
        switch ($eventType) {
            case 'view':
                return 1;
            case 'wishlist':
                return 2;
            case 'add_to_cart':
                return 3;
            case 'purchase':
                return 5;
            case 'rate':
                // nếu rating không truyền thì mặc định 3 sao
                $rating = is_numeric($value) ? (int) $value : 3;
                return $rating;
            default:
                return 0;
        }
    }

    /**
     * Ghi nhận một event của người dùng và gán trọng số tương ứng.
     */
    public function logEvent(int $userId, int $productId, string $eventType, $value = null): UserEvent
    {
        $validTypes = ['view', 'add_to_cart', 'purchase', 'rate', 'wishlist'];
        if (!in_array($eventType, $validTypes, true)) {
            throw new InvalidArgumentException("Event type '$eventType' không hợp lệ.");
        }

        // Only allow rate if purchased
        if ($eventType === 'rate') {
            $hasPurchased = $this->userEvent->newQuery()
                ->where('user_id', $userId)
                ->where('product_id', $productId)
                ->where('event_type', 'purchase')
                ->exists();

            if (!$hasPurchased) {
                throw new LogicException('Không thể đánh giá khi chưa mua sản phẩm.');
            }
            // Remove duplicate rate
            $existingRate = $this->userEvent->newQuery()
                ->where('user_id', $userId)
                ->where('product_id', $productId)
                ->where('event_type', 'rate')
                ->first();

            if ($existingRate) {
                $weight = $this->getEventWeight('rate', $value);
                $existingRate->update([
                    'value'      => $weight,
                    'created_at' => now(),
                ]);
                return $existingRate;
            }
        }

        // Handle view: increment weight
        if ($eventType === 'view') {
            $existingView = $this->userEvent->newQuery()
                ->where('user_id', $userId)
                ->where('product_id', $productId)
                ->where('event_type', 'view')
                ->first();

            $weight = $this->getEventWeight('view');
            if ($existingView) {
                // Tăng value, cap nếu cần
                $newValue = $existingView->value + $weight;
                $existingView->update([
                    'value'      => $newValue,
                    'created_at' => now(),
                ]);
                return $existingView;
            }
            return $this->userEvent->create([
                'user_id'    => $userId,
                'product_id' => $productId,
                'event_type' => 'view',
                'value'      => $weight,
                'created_at' => now(),
            ]);
        }

        // Các event khác: tạo mới với weight tương ứng
        $weight = $this->getEventWeight($eventType, $value);

        // Với wishlist, tránh duplicate
        if ($eventType === 'wishlist') {
            $existingWishlist = $this->userEvent->newQuery()
                ->where('user_id', $userId)
                ->where('product_id', $productId)
                ->where('event_type', 'wishlist')
                ->first();
            if ($existingWishlist) {
                return $existingWishlist;
            }
        }

        return $this->userEvent->create([
            'user_id'    => $userId,
            'product_id' => $productId,
            'event_type' => $eventType,
            'value'      => $weight,
            'created_at' => now(),
        ]);
    }


    /**
     * Lấy tất cả event của một user, có thể lọc theo loại.
     */
    public function getUserEvents(int $userId, string $filterType = null): Collection
    {
        $query = $this->userEvent->newQuery()->where('user_id', $userId);
        if ($filterType) {
            $query->where('event_type', $filterType);
        }
        return $query->orderBy('created_at', 'desc')->get();
    }

    /**
     * Đếm số event theo loại cho một sản phẩm.
     */
    public function countEventsForProduct(int $productId, string $eventType): int
    {
        return $this->userEvent->newQuery()
            ->where('product_id', $productId)
            ->where('event_type', $eventType)
            ->count();
    }

    /**
     * Xóa các event cũ hơn số ngày nhất định để dọn dẹp cơ sở dữ liệu.
     */
    public function pruneOldEvents(int $days): int
    {
        $threshold = now()->subDays($days);

        return $this->userEvent->newQuery()
            ->where('created_at', '<', $threshold)
            ->delete();
    }

    /**
     * Build user-item matrix cho event type chỉ định (mặc định purchase).
     * Trả về mảng [userId => [productId => count], ...]
     */
    public function buildUserItemMatrix(string $eventType = 'purchase'): array
    {
        $rows = $this->userEvent->newQuery()
            ->select('user_id', 'product_id', DB::raw('count(*) as cnt'))
            ->where('event_type', $eventType)
            ->groupBy('user_id', 'product_id')
            ->get();

        $matrix = [];
        foreach ($rows as $row) {
            $matrix[$row->user_id][$row->product_id] = $row->cnt;
        }

        return $matrix;
    }

    /**
     * Tính toán ma trận tương đồng item-item (cosine similarity) dựa trên user-item matrix.
     * Trả về mảng [itemId1 => [itemId2 => similarity, ...], ...]
     */
    public function computeItemSimilarities(string $eventType = 'purchase'): array
    {
        $matrix = $this->buildUserItemMatrix($eventType);
        $itemVectors = [];

        // Chuyển sang item-centric
        foreach ($matrix as $userId => $items) {
            foreach ($items as $itemId => $cnt) {
                $itemVectors[$itemId][$userId] = $cnt;
            }
        }

        $similarities = [];
        $itemIds = array_keys($itemVectors);

        foreach ($itemIds as $i => $itemId1) {
            foreach (array_slice($itemIds, $i + 1) as $itemId2) {
                $vec1 = $itemVectors[$itemId1];
                $vec2 = $itemVectors[$itemId2];

                // Tính cosine similarity
                $dot = 0; $norm1 = 0; $norm2 = 0;
                foreach ($vec1 as $userId => $val1) {
                    $norm1 += $val1 * $val1;
                    if (isset($vec2[$userId])) {
                        $dot += $val1 * $vec2[$userId];
                    }
                }
                foreach ($vec2 as $val2) {
                    $norm2 += $val2 * $val2;
                }
                if ($norm1 > 0 && $norm2 > 0) {
                    $sim = $dot / (sqrt($norm1) * sqrt($norm2));
                } else {
                    $sim = 0;
                }

                $similarities[$itemId1][$itemId2] = $sim;
                $similarities[$itemId2][$itemId1] = $sim;
            }
        }

        return $similarities;
    }

    /**
     * Lấy top N sản phẩm tương đồng với item đã cho.
     */
    public function getTopNSimilarItems(int $itemId, int $n = 10, string $eventType = 'purchase'): array
    {
        $sims = $this->computeItemSimilarities($eventType);
        if (!isset($sims[$itemId])) {
            return [];
        }

        arsort($sims[$itemId]);
        return array_slice($sims[$itemId], 0, $n, true);
    }
}
