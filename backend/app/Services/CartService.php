<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\Variant;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CartService
{   
    public function removeExpiredItems(){
        DB::table('cart_items')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->delete();
    }

    public function checkStock($variantId, $quantity){
        $variant = Variant::findOrFail($variantId);
        return $quantity <= $variant->stock;
    }

    /**
     * Lấy giỏ hàng của người dùng và các item trong giỏ hàng.
     *
     * @return \App\Models\Cart
     */
    public function getCartWithItems(){
        $this->removeExpiredItems();
        $cart = Cart::with([
            'cart_items.variant.product:id,name',
            'cart_items' => function ($query) {
                $query->select('id','cart_id','variant_id','quantity','price_at_time','expires_at');
            }
        ])
        ->select('id','user_id')
        ->where('user_id', Auth::id())
        ->first();

        if ($cart) {
            $total = $cart->cart_items->sum(function ($item) {
                return $item->quantity * $item->price_at_time;
            });

            return [
                'cart' => $cart,
                'total_price' => $total
            ];
        }
        return null;
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
    public function addItem($variantId, $quantity){
            $this->removeExpiredItems();
            $variant = Variant::findOrFail($variantId);

            if (!$this->checkStock($variantId, $quantity)) {
                return ['error' => 'Vượt quá số lượng hàng tồn kho'];
            }

            $cart = $this->getOrCreateCart();

            $cartItem = CartItem::where('cart_id', $cart->id)
                ->where('variant_id', $variantId)
                ->first();

            if ($cartItem) {
                $cartItem->quantity += $quantity;
                $cartItem->save();
            } else {
                $cart->cart_items()->create([
                    'variant_id' => $variantId,
                    'quantity' => $quantity,
                    'price_at_time' => $variant->price,
                    'expires_at' => Carbon::now()->addDays(1),
                ]);
            }
    }


    /**
     * Cập nhật số lượng sản phẩm trong giỏ hàng.
     *
    
     */
    public function updateItemQuantity($itemId, $quantity)
{
    $cartItem = CartItem::findOrFail($itemId);

    if (!$this->checkStock($cartItem->variant_id, $quantity)) {
        return ['error' => 'Vượt quá số lượng tồn kho'];
    }

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
            $cart->cart_items()->delete();
        }
    }
}
