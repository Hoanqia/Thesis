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
            // $total_price = 0;
            // if($cart && $cart->cart_items){
            //     foreach($cart->cart_items as $cartItem){
            //         $product = $cartItem->product;
            //         if($product && $product->status === 'active'){
            //             $total_price +=  $product->price *  $cartItem->quantity;
            //         }
            //     }
            // }
            if($cartData){
                return response()->json([
                    'message' => !$cartData || $cartData['cart']->cart_items->isEmpty() ? 'Giỏ hàng trống' : 'Lấy giỏ hàng thành công',
                    'status' => 'success',
                    'data' => $cartData['cart'] ?? [],
                    'total_price' => $cartData['total_price'],
                ]);
            }
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function addToCart(Request $request)
    {
        try {
            $validated = $request->validate([
                'product_id' => 'required|exists:products,id',
                'quantity' => 'required|integer|min:1',
            ]);

            $this->cartService->addItem($validated['product_id'], $validated['quantity']);

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

            $this->cartService->updateItemQuantity($itemId, $validated['quantity']);

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
