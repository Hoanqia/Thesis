<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\CartService;
use App\Exceptions\ApiExceptionHandler;

class CartController extends Controller
{
    protected $cartService;
    public function __construct(CartService $cartService)
    {
        $this->cartService = $cartService;
    }
    public function getCart()
    {
        try {
            $cartData = $this->cartService->getCartWithItems();
            if ($cartData) {
                return response()->json([
                    'message' => !$cartData || $cartData['cart']->cartItems->isEmpty() ? 'Giỏ hàng trống' : 'Lấy giỏ hàng thành công',
                    'status' => 'success',
                    'data' => $cartData['cart'] ?? [],
                    'total_price' => $cartData['total_price'],
                ]);
            }

            return response()->json([
                'message' => 'Không tìm thấy giỏ hàng',
                'status' => 'error',
            ], 404);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function addToCart(Request $request)
    {
        try {
            $validated = $request->validate([
                'variant_id' => 'required|exists:product_variants,id',
                'quantity' => 'required|integer|min:1',
            ]);

            $result = $this->cartService->addItem($validated['variant_id'], $validated['quantity']);

            if (isset($result['error'])) {
                return response()->json([
                    'message' => $result['error'],
                    'status' => 'error',
                ], 400);
            }
           
            return response()->json([
                'message' => 'Thêm vào giỏ hàng thành công',
                'status' => 'success',
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function updateItem(Request $request, $itemId)
    {
        try {
            $validated = $request->validate([
                'quantity' => 'required|integer|min:1',
            ]);

            $result = $this->cartService->updateItemQuantity($itemId, $validated['quantity']);

            if (isset($result['error'])) {
                return response()->json([
                    'message' => $result['error'],
                    'status' => 'error',
                ], 400);
            }

            return response()->json([
                'message' => 'Cập nhật số lượng thành công',
                'status' => 'success',
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
    

   public function removeItem($itemId)
    {
        try {
            $this->cartService->removeItem($itemId);

            return response()->json([
                'message' => 'Xoá sản phẩm khỏi giỏ hàng thành công',
                'status' => 'success',
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }   

     public function clearCart()
    {
        try {
            $this->cartService->clearCart();

            return response()->json([
                'message' => 'Đã xoá toàn bộ giỏ hàng',
                'status' => 'success',
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
}
