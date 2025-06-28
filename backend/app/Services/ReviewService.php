<?php

namespace App\Services;

use App\Models\Review;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Collection;

class ReviewService
{   


    public function AdminGetAllReviews()
    {
        $reviews = Review::with([
            'user:id,name',
            'variant'  
        ])->get();
        $result = $reviews->map(function (Review $r) {
            return [
                'id'               => $r->id,
                'user_id'          => $r->user_id,
                'user_name'        => $r->user?->name,
                'variant_id'       => $r->variant_id,
                'variant_full_name'=> $r->variant?->full_name,
                'message'          => $r->message,
                'rate'             => $r->rate,
                'admin_reply'      => $r->admin_reply,
                'status'           => $r->status,
                'created_at'       => $r->created_at->toDateTimeString(),
                'updated_at'       => $r->updated_at->toDateTimeString(),
            ];
        });
       return $result;
    }
    public function getAllReviewsOfProduct(int $productId){
           $reviews = Review::with([
            'user:id,name',
            'variant'  
        ])->where('product_id',$productId)->get();
        $result = $reviews->map(function (Review $r) {
            return [
                'id'               => $r->id,
                'user_id'          => $r->user_id,
                'user_name'        => $r->user?->name,
                'variant_id'       => $r->variant_id,
                'variant_full_name'=> $r->variant?->full_name,
                'message'          => $r->message,
                'rate'             => $r->rate,
                'admin_reply'      => $r->admin_reply,
                'status'           => $r->status,
                'created_at'       => $r->created_at->toDateTimeString(),
                'updated_at'       => $r->updated_at->toDateTimeString(),
            ];
        });
       return $result;
    }
    /**
     * Tạo review mới.
     *
     * @param  array  $data  Các key: user_id, product_id, variant_id (nullable), message, rate
     * @return Review
     */
    public function createReview(array $data): Review
    {
        return DB::transaction(function () use ($data) {

            /** @var Review $review */
            $review = Review::create([
                'user_id'      => $data['user_id'],
                'product_id'   => $data['product_id'],
                'variant_id'   => $data['variant_id'] ?? null,
                'message'      => $data['message'] ?? null,
                'rate'         => $data['rate'],
                // Khi tạo mặc định hiển thị (nếu không cần duyệt) hoặc pending
                'status'       => $data['status'] ?? true,
            ]);


            return $review;
        });
    }

    /**
     * User tự xóa review của mình.
     *
     * @param  int  $idReview
     * @return bool
     */
    public function deleteReview(int $idReview): bool
    {
        /** @var Review $review */
        $review = Review::findOrFail($idReview);

        // Nếu cần kiểm tra quyền (ví dụ chỉ owner mới được xóa)
        // if ($review->user_id !== auth()->id()) {
        //     throw new \Exception('Unauthorized');
        // }

        return $review->delete();
    }

    /**
     * User cập nhật review của mình.
     *
     * @param  int    $idReview
     * @param  array  $data
     * @return Review
     */
    public function updateReview(int $idReview, array $data): Review
    {
        /** @var Review $review */
        $review = Review::findOrFail($idReview);

        // Quyền: chỉ owner mới sửa
        // if ($review->user_id !== auth()->id()) {
        //     throw new \Exception('Unauthorized');
        // }

        $review->fill([
            'message'    => $data['message'] ?? $review->message,
            'rate'       => $data['rate'] ?? $review->rate,
            'admin_reply' => $data['admin_reply'] ?? null,
            // Có thể reset status về pending nếu muốn duyệt lại sau sửa
            // 'status'   => 'pending',
        ]);
        $review->save();


        return $review;
    }

    /**
     * Admin trả lời review.
     *
     * @param  int    $idReview
     * @param  array  $data  ['admin_reply' => '...', 'status' => true|false]
     * @return Review
     */
    public function admin_reply(int $idReview, array $data): Review
    {
        /** @var Review $review */
        $review = Review::findOrFail($idReview);

        $review->admin_reply = $data['admin_reply'] ?? $review->admin_reply;
        // Nếu muốn admin có thể bật/tắt hiển thị review
        if (isset($data['status'])) {
            $review->status = (bool) $data['status'];
        }
        $review->save();


        return $review;
    }

  
    public function admin_delete_review(int $idReview)
    {
        /** @var Review $review */
        $review = Review::findOrFail($idReview);

        $review->delete();
    }
}
