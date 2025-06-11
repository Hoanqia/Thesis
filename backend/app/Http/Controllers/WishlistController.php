<?php

namespace App\Http\Controllers;

use App\Services\WishlistService;
use Illuminate\Http\Request;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class WishlistController extends Controller
{
    protected $wishlistService;

    public function __construct(WishlistService $wishlistService)
    {
        $this->wishlistService = $wishlistService;
    }

    /**
     * Lấy danh sách wishlist của người dùng (hoặc tất cả nếu truyền user_id).
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        try {
            // Nếu có query param user_id, sẽ lấy cho user đó; ngược lại lấy cho user đang login
            $userId = $request->query('user_id', Auth::id());
            $items = $this->wishlistService->getAll($userId);

            return response()->json([
                'message' => $items->isEmpty() ? 'Không có mục nào trong wishlist' : 'Lấy danh sách wishlist thành công',
                'status' => 'success',
                'data' => $items,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Thêm một variant vào wishlist.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        try {
            // Validate dữ liệu đầu vào
            $validated = $request->validate([
                'variant_id' => 'required|integer|exists:product_variants,id',
            ]);

            $wishlist = $this->wishlistService->addToWishlist($validated);

            return response()->json([
                'message' => 'Thêm vào wishlist thành công',
                'status' => 'success',
                'data' => $wishlist,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Xóa một mục trong wishlist.
     *
     * @param  int  $id  (wishlist_id)
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        try {
            $deleted = $this->wishlistService->deleteWishlist($id);

            if (! $deleted) {
                return response()->json([
                    'message' => 'Xóa wishlist thất bại hoặc không tìm thấy',
                    'status' => 'error',
                ], 404);
            }

            return response()->json([
                'message' => 'Xóa wishlist thành công',
                'status' => 'success',
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Thêm một mục wishlist vào giỏ hàng.
     *
     * @param  int  $id  (wishlist_id)
     * @return \Illuminate\Http\Response
     */
    public function addToCart($id)
    {
        try {
            $result = $this->wishlistService->addWishListToCart($id);

            if (! $result) {
                return response()->json([
                    'message' => 'Không thể thêm mục wishlist vào giỏ hàng',
                    'status' => 'error',
                ], 400);
            }

            return response()->json([
                'message' => 'Thêm mục wishlist vào giỏ hàng thành công',
                'status' => 'success',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Thêm toàn bộ wishlist của user đang đăng nhập vào giỏ hàng.
     *
     * @return \Illuminate\Http\Response
     */
    public function addAllToCart()
    {
        try {
            $results = $this->wishlistService->addFullWishListToCart();

            return response()->json([
                'message' => empty($results) ? 'Không có mục nào để thêm' : 'Thêm toàn bộ wishlist vào giỏ hàng thành công',
                'status' => 'success',
                'data' => $results,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
}
