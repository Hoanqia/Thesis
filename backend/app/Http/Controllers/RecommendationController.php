<?php

namespace App\Http\Controllers;
use Illuminate\Support\Facades\Auth;
use App\Services\RecommendationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;
use App\Models\Product;
class RecommendationController extends Controller
{
    protected RecommendationService $recommendationService;

    public function __construct(RecommendationService $recommendationService)
    {
        $this->recommendationService = $recommendationService;
    }

    /**
     * GET /api/users/{user}/recommendations
     *
     * @param Request \$request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    { 
        try {
            $user = Auth::user();
            $limit = (int) $request->query('limit', 10);
            $recs = $this->recommendationService->getRecommendations($user->id, $limit);

            return response()->json([
                'message' => 'Lấy danh sách gợi ý thành công',
                'status' => 'success',
                'data' => $recs,
            ]);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
       
    }

      /**
     * GET /api/products/{productId}/similar
     * Lấy danh sách sản phẩm tương đồng với một sản phẩm cụ thể (cho người dùng chưa đăng nhập hoặc khách vãng lai).
     *
     * @param Request $request
     * @param int $productId ID của sản phẩm gốc.
     * @return JsonResponse
     */
    public function getSimilarItems(Request $request, $productSlug): JsonResponse
    {
        try {
            $product = Product::where('slug',$productSlug)->first();

            $limit = (int) $request->query('limit', 10); // Mặc định 10 sản phẩm tương đồng
            // Giới hạn giá trị của limit để tránh query quá lớn
            $limit = max(1, min(20, $limit)); // Ví dụ: giới hạn từ 1 đến 20

            $similarProducts = $this->recommendationService->get_similar_items_for_product($product->id, $limit);

            return response()->json([
                'message' => 'Lấy danh sách sản phẩm tương đồng thành công',
                'status' => 'success',
                'data' => $similarProducts,
            ]);
        } catch (\InvalidArgumentException $e) {
            // Xử lý lỗi validation cho tham số đầu vào
            return response()->json([
                'message' => $e->getMessage(),
                'status' => 'error',
                'code' => $e->getCode(),
            ], $e->getCode());
        } catch (\Exception $e) {
            Log::error("Error in getSimilarItems for product {$productSlug}: " . $e->getMessage(), ['exception' => $e]);
            return ApiExceptionHandler::handleException($e);
        }
    }
}
