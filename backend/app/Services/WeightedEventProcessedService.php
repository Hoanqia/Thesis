<?php

namespace App\Services;

use App\Models\WeightedEventProcessed;
use Illuminate\Support\Collection; // Để làm việc với Collection của Laravel
use Illuminate\Support\Facades\DB; // Để sử dụng query builder hoặc raw queries
use Illuminate\Support\Facades\Log;

class WeightedEventProcessedService
{
    /**
     * Store processed weighted events into the database.
     * Replaces existing data for the given user_ids.
     *
     * @param array $data An array of arrays, where each inner array represents a row:
     * [['user_id' => 1, 'product_id' => 101, 'implicit_score' => 0.8], ...]
     * @return bool True if successful, false otherwise.
     */
    public function storeProcessedEvents(array $data): bool
    {
        if (empty($data)) {
            return true; // Nothing to store
        }

        // Bổ sung: Tổng hợp dữ liệu đầu vào nếu có các cặp (user_id, product_id) trùng lặp
        // Ví dụ: Giữ implicit_score cao nhất cho mỗi cặp trùng lặp
        $processedData = Collection::make($data)
            ->groupBy(function($item) {
                return $item['user_id'] . '_' . $item['product_id']; // Tạo khóa duy nhất
            })
            ->map(function($group) {
                // Sắp xếp nhóm theo implicit_score giảm dần và lấy mục đầu tiên (cao nhất)
                // Hoặc chỉ lấy mục cuối cùng nếu bạn muốn giá trị cuối cùng ghi đè
                return $group->sortByDesc('implicit_score')->first();
                // Hoặc để lấy trung bình:
                // return [
                //     'user_id' => $group->first()['user_id'],
                //     'product_id' => $group->first()['product_id'],
                //     'implicit_score' => $group->avg('implicit_score'),
                // ];
            })
            ->values() // Đặt lại khóa mảng
            ->toArray();
        
        Log::debug('Processed input data to remove duplicates before upsert.', ['original_count' => count($data), 'deduplicated_count' => count($processedData)]);

        // Columns to uniquely identify a record (primary key or unique index)
        $uniqueBy = ['user_id', 'product_id']; 

        // Columns to update if a matching record is found
        $updateColumns = ['implicit_score']; 

        DB::beginTransaction();
        try {
            // KHÔNG CẦN DÒNG DELETE NỮA VÌ UPSERT SẼ XỬ LÝ VIỆC CẬP NHẬT
            // WeightedEventProcessed::whereIn('user_id', $userIds)->delete(); 

            // Insert new records or update existing ones in chunks
            $chunkSize = 5000; 
            foreach (array_chunk($processedData, $chunkSize) as $chunk) {
                // Sử dụng upsert thay cho insert
                WeightedEventProcessed::upsert($chunk, $uniqueBy, $updateColumns);
            }

            DB::commit();
            Log::info('Successfully stored/updated processed weighted events using upsert.', ['total_records_upserted' => count($processedData)]);
            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to store processed weighted events using upsert: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get a batch of implicit feedback scores for specific users.
     * Optimized for reading user interactions in chunks from the database.
     *
     * @param array $userIds An array of user IDs.
     * @return Collection A collection where each item is a WeightedEventProcessed model instance.
     * Each instance will have user_id, product_id, implicit_score.
     */
    public function getImplicitScoresForUsers(array $userIds): Collection
    {
        if (empty($userIds)) {
            return Collection::make();
        }

        return WeightedEventProcessed::select('user_id', 'product_id', 'implicit_score')
                                    ->whereIn('user_id', $userIds)
                                    ->get();
    }

    /**
     * Get unique product IDs from the weighted_events_processed table.
     * Used for the 'all_product_ids_set' in the recommendation logic.
     *
     * @return Collection A collection of unique product IDs.
     */
    public function getUniqueProductIds(): Collection
    {
        return WeightedEventProcessed::select('product_id')->distinct()->get()->pluck('product_id');
    }
    
    /**
     * Get all unique user IDs from the weighted_events_processed table.
     * Used to get the list of all users for whom recommendations should be generated.
     *
     * @return Collection A collection of unique user IDs.
     */
    public function getUniqueUserIds(): Collection
    {
        return WeightedEventProcessed::select('user_id')->distinct()->get()->pluck('user_id');
    }

    /**
     * Convert a DataFrame to an array suitable for mass insertion.
     * This is a helper function to convert Pandas DataFrame to array of arrays
     * that Laravel's insert() method expects.
     *
     * @param \Illuminate\Support\DataFrame $df The Pandas DataFrame.
     * @return array
     */
    public function convertDataFrameToArray(object $df): array
    {
        // Check if it's actually a Pandas DataFrame before proceeding
        if (!($df instanceof \Pandas\DataFrame)) { // Assuming 'Pandas\DataFrame' namespace if using Laravel's Pyxl
            // Fallback for direct Pandas usage or if not using Pyxl's wrapper
            if (get_class($df) === 'Pandas\DataFrame' || (isset($df->iloc) && isset($df->columns))) { // Basic check
                    return $df->to_dict(['orient' => 'records']);
            }
            throw new \InvalidArgumentException("Input must be a Pandas DataFrame instance.");
        }
        // If Pyxl's Pandas DataFrame
        return $df->to_array(); // Pyxl's DataFrame might have a direct to_array method
    }

}