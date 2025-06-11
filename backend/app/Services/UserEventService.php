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
