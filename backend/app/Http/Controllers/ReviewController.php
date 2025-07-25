<?php

namespace App\Http\Controllers;

use App\Services\ReviewService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;
use App\Models\Review;

class ReviewController extends Controller
{
    protected ReviewService $reviewService;

    public function __construct(ReviewService $reviewService)
    {
        $this->reviewService = $reviewService;
    }


    public function getAll(){
        try {
            $reviews = $this->reviewService->AdminGetAllReviews();
            if($reviews->isEmpty()) {
                return response()->noContent();
            }
            return response()->json([
                'message' => 'Lấy dữ liệu thành công',
                'status' => 'success',
                'data' => $reviews,
            ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
    }
    /**
     * Lấy danh sách reviews đã duyệt cho một product
     */
    public function index(Request $request, int $productId): JsonResponse
    {
        try {
            // Get per_page from request, default to 10 if not provided
            $perPage = $request->input('per_page', 10);
            $reviews = $this->reviewService->getAllReviewsOfProduct($productId, $perPage);
            $reviewDistribution = $this->reviewService->getReviewDistribution($productId); // <-- Gọi phương thức này

            return response()->json([
                'message' => $reviews->isEmpty() ? 'Chưa có review cho sản phẩm này' : 'Lấy danh sách review thành công',
                'status'  => 'success',
                'data'    => $reviews->items(), // Get the current page items
                'meta'    => [
                    'current_page' => $reviews->currentPage(),
                    'from'         => $reviews->firstItem(),
                    'last_page'    => $reviews->lastPage(),
                    'links'        => $reviews->linkCollection(), // All pagination links
                    'path'         => $reviews->path(),
                    'per_page'     => $reviews->perPage(),
                    'to'           => $reviews->lastItem(),
                    'total'        => $reviews->total(),
                ],
                'review_distribution' => $reviewDistribution,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Lấy chi tiết review theo ID
     */
    public function show(int $id): JsonResponse
    {
        try {
            $review = Review::find($id);

            if (!$review) {
                return response()->json([
                    'message' => 'Không tìm thấy review',
                    'status'  => 'error',
                ], 404);
            }

            return response()->json([
                'message' => 'Lấy thông tin review thành công',
                'status'  => 'success',
                'data'    => $review,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Tạo review mới
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'product_id' => 'required|integer|exists:products,id',
                'variant_id' => 'nullable|integer|exists:product_variants,id',
                'message'    => 'nullable|string|max:2000',
                'rate'       => 'required|integer|between:1,5',
            ]);
            $validated['user_id'] = $request->user()->id;

            $review = $this->reviewService->createReview($validated);

            return response()->json([
                'message' => 'Tạo review thành công',
                'status'  => 'success',
                'data'    => $review,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Cập nhật review của chính user
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'message' => 'nullable|string|max:2000',
                'rate'    => 'nullable|integer|between:1,5',
                'admin_reply' => 'nullable|string|max:2000', // <-- THÊM DÒNG NÀY
            ]);

            $review = $this->reviewService->updateReview($id, $validated);

            return response()->json([
                'message' => 'Cập nhật review thành công',
                'status'  => 'success',
                'data'    => $review,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Xóa review của chính user
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $deleted = $this->reviewService->deleteReview($id);

            if (!$deleted) {
                return response()->json([
                    'message' => 'Xóa review thất bại',
                    'status'  => 'error',
                ], 400);
            }

            return response()->json([
                'message' => 'Xóa review thành công',
                'status'  => 'success',
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Admin trả lời review
     */
    public function adminReply(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'admin_reply' => 'required|string|max:2000',
                'status'      => 'sometimes|boolean',
            ]);

            $review = $this->reviewService->admin_reply($id, $validated);

            return response()->json([
                'message' => 'Trả lời review thành công',
                'status'  => 'success',
                'data'    => $review,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Admin ẩn review
     */
    public function adminDelete(int $id): JsonResponse
    {
        try {
            $this->reviewService->admin_delete_review($id);

            return response()->json([
                'message' => 'xóa review thành công',
                'status'  => 'success',
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
}
