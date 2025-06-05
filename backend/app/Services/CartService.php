<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\Variant;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CartService
{   
    public function removeExpiredItems(){
        $now = Carbon::now('Asia/Ho_Chi_Minh');
        DB::table('cart_items')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', $now)
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
        'cartItems:id,cart_id,variant_id,quantity,price_at_time,expires_at',
        'cartItems.variant:id,product_id,image',
        'cartItems.variant.product:id,name',
         // Lấy tất cả VariantSpecValue cho mỗi variant
        'cartItems.variant.variantSpecValues:id,variant_id,spec_id,value_text,value_int,value_decimal,option_id',
        // Với mỗi VariantSpecValue, load luôn đối tượng Specification để lấy tên spec
        'cartItems.variant.variantSpecValues.specification:id,name,data_type,unit',
        'cartItems.variant.variantSpecValues.spec_options:id,spec_id,value',

    ])
    ->select('id','user_id')
    ->where('user_id', Auth::id())
    ->first();

    if (! $cart) {
        return null;
    }

    // Tính tổng
    $total = $cart->cartItems->sum(fn($item) => $item->quantity * $item->price_at_time);

    // Gắn full URL cho ảnh variant
    foreach ($cart->cartItems as $item) {
        $variant = $item->variant;
        // nếu cột image lưu đường dẫn relative trong storage, dùng asset()
        $variant->img = $variant->image
            ? asset('storage/' . $variant->image)
            : null;
         // — 2) Khởi tạo các trường ram/storage/color (mặc định null)
        $variant->ram     = null;
        $variant->storage = null;
        $variant->color   = null;

        // — 3) Duyệt qua variantSpecValues để kiểm tra tên spec và gán giá trị
            foreach ($variant->variantSpecValues as $vs) {
                // Lấy tên spec (lowercase để dễ so sánh, ví dụ: "ram", "dung lượng bộ nhớ", "màu sắc")
                $specName = mb_strtolower($vs->specification->name);

                // Xác định giá trị cần lấy: ưu tiên value_text, nếu data_type là số có thể dùng value_int hoặc value_decimal
                // Ở đây minh họa đơn giản: nếu value_text không null thì dùng, ngược lại thử dùng value_int hoặc value_decimal
                if (!is_null($vs->value_text) && $vs->value_text !== '') {
                    $value = $vs->value_text;
                } elseif (!is_null($vs->value_int)) {
                    $value = (string) $vs->value_int;
                } elseif (!is_null($vs->value_decimal)) {
                    $value = (string) $vs->value_decimal;
                } else {
                    $value = null;
                }

                // Nếu spec là RAM
                if (str_contains($specName, 'ram')) {
                    $variant->ram = $value;
                }

                // Nếu spec là Dung lượng bộ nhớ (có thể tên là "dung lượng bộ nhớ", "storage", "rom", v.v)
                if (
                    str_contains($specName, 'dung lượng bộ nhớ') ||
                    str_contains($specName, 'storage') ||
                    str_contains($specName, 'bộ nhớ') ||
                    str_contains($specName, 'rom')
                ) {
                    $variant->storage = $value;
                }

                // Nếu spec là Màu sắc (hoặc "color")
                if (str_contains($specName, 'màu sắc') || str_contains($specName, 'color')) {
                    $variant->color = $value;
                }
            }
    }
        return [
            'cart'        => $cart,
            'total_price' => $total,
        ];
}


    /**
     * Tạo mới hoặc lấy giỏ hàng của người dùng.
     *
     * @return \App\Models\Cart
     */
   public function getOrCreateCart(User $user = null)
{   
            $user = $user ?? Auth::user();
    return Cart::firstOrCreate(['user_id' => $user->id]);
}


    /**
     * Thêm một sản phẩm vào giỏ hàng.
     *
     * @param int $productId
     * @param int $quantity
     * @return void
     */
   public function addItem($variantId, $quantity)
{
    // Tìm biến thể sản phẩm
    $variant = Variant::findOrFail($variantId);

    // Kiểm tra tồn kho
    if (!$this->checkStock($variantId, $quantity)) {
        return ['error' => 'Vượt quá số lượng hàng tồn kho'];
    }

    // Lấy hoặc tạo giỏ hàng
    $cart = $this->getOrCreateCart();

    // Kiểm tra item đã tồn tại trong giỏ hay chưa
    $cartItem = CartItem::where('cart_id', $cart->id)
        ->where('variant_id', $variantId)
        ->first();

    if ($cartItem) {
        // ✅ Nếu đã có, cập nhật số lượng và gia hạn thời gian hết hạn
        $cartItem->quantity += $quantity;
        $cartItem->expires_at = Carbon::now('Asia/Ho_Chi_Minh')->addDays(1); // reset lại hạn
        $cartItem->save();
    } else {
        // ✅ Nếu chưa có thì tạo mới
        $cart->cartItems()->create([
            'variant_id'    => $variantId,
            'quantity'      => $quantity,
            'price_at_time' => $variant->price,
            'expires_at'    => Carbon::now('Asia/Ho_Chi_Minh')->addDays(1),
        ]);
    }

    return ['success' => true];
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
    $cartItem->expires_at = Carbon::now('Asia/Ho_Chi_Minh')->addDays(1);
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
            $cart->cartItems()->delete();
        }
    }
}
