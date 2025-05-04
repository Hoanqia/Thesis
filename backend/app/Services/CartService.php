<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class CartService
{
    /**
     * Lấy giỏ hàng của người dùng và các item trong giỏ hàng.
     *
     * @return \App\Models\Cart
     */
    public function getCartWithItems()
    {
        // Lấy giỏ hàng của người dùng kèm các item trong giỏ hàng
        return Cart::with('items.product')->where('user_id', Auth::user()->id)->first();
    }

    /**
     * Tạo mới hoặc lấy giỏ hàng của người dùng.
     *
     * @return \App\Models\Cart
     */
    public function getOrCreateCart()
    {
        // Lấy hoặc tạo mới giỏ hàng cho người dùng hiện tại
        return Cart::firstOrCreate(['user_id' => Auth::user()->id]);
    }

    /**
     * Thêm một sản phẩm vào giỏ hàng.
     *
     * @param int $productId
     * @param int $quantity
     * @return void
     */
    public function addItem($productId, $quantity)
    {
        // Tìm sản phẩm theo ID
        $product = Product::findOrFail($productId);

        // Lấy hoặc tạo mới giỏ hàng cho người dùng
        $cart = $this->getOrCreateCart();

        // Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
        $cartItem = CartItem::where('cart_id', $cart->id)
            ->where('product_id', $productId)
            ->first();

        // Nếu có sản phẩm trong giỏ hàng, tăng số lượng lên
        if ($cartItem) {
            $cartItem->quantity += $quantity;
            $cartItem->save();
        } else {
            // Nếu chưa có sản phẩm trong giỏ hàng, thêm mới sản phẩm vào giỏ
            $cart->items()->create([
                'product_id' => $productId,
                'quantity' => $quantity,
                'price_at_time' => $product->price,
                'expires_at' => Carbon::now()->addMinutes(30), // Giới hạn thời gian giỏ hàng
            ]);
        }
    }

    /**
     * Cập nhật số lượng sản phẩm trong giỏ hàng.
     *
     * @param int $itemId
     * @param int $quantity
     * @return void
     */
    public function updateItemQuantity($itemId, $quantity)
    {
        // Tìm sản phẩm trong giỏ hàng theo ID
        $cartItem = CartItem::findOrFail($itemId);
        
        // Cập nhật số lượng sản phẩm
        $cartItem->quantity = $quantity;
        $cartItem->save();
    }

    /**
     * Xoá một sản phẩm khỏi giỏ hàng.
     *
     * @param int $itemId
     * @return void
     */
    public function removeItem($itemId)
    {
        // Tìm sản phẩm trong giỏ hàng theo ID
        $cartItem = CartItem::findOrFail($itemId);
        
        // Xoá sản phẩm khỏi giỏ hàng
        $cartItem->delete();
    }

    /**
     * Xoá toàn bộ giỏ hàng của người dùng.
     *
     * @return void
     */
    public function clearCart()
    {
        // Lấy giỏ hàng của người dùng hiện tại và xoá tất cả các item
        $cart = Cart::where('user_id', Auth::user()->id)->first();
        if ($cart) {
            $cart->items()->delete();
        }
    }
}
