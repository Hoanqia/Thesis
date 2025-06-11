<?php

namespace App\Services;
use App\Models\Variant;
use App\Models\Wishlist;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use App\Services\CartService;
class WishlistService {
        public function __construct(CartService $cartService, UserEventService $userEventService)
    {
        $this->cartService = $cartService;
        $this->userEventService = $userEventService;
    }
     public function getAll(?int $user_id = null)
    {
        $query = Wishlist::query();
        if (isset($user_id)) {
            $query->where('user_id', $user_id);
        }
        $wishlists = $query->with([
            'variant' => function ($query) {
                $query->select('id', 'product_id', 'image','price','stock')
                      ->with([
                          'product:id,name', 
                          'variantSpecValues' => function ($query) {
                              $query->select('id', 'variant_id', 'spec_id', 'option_id', 'value_int', 'value_text')
                                    ->with([
                                        'specification:id,name', 
                                        'spec_options:id,value', 
                                    ]);
                          }
                      ]);
            }
        ])->get();
        return $wishlists;
    }

   public function addWishListToCart($wishlistId){
        $wishlistItem = Wishlist::find($wishlistId); 
        if (!$wishlistItem) {
            return false; 
        }
        $variantId = $wishlistItem->variant_id;
        $result = $this->cartService->addItem($variantId, 1); 
        
         if ($result) {
            // Log hành động add_to_cart
            $userId = Auth::id();
            $productId = $wishlistItem->variant->product_id;
            $this->userEventService->logEvent($userId, $productId, 'add_to_cart');
            $wishlistItem->delete();
        }
        return $result;
    }
    public function addFullWishListToCart(){
        $user = Auth::user();
        if (!$user) {
            return false;
        }

        $wishlistItems = Wishlist::where('user_id', $user->id)->get();
        $results = [];

        foreach ($wishlistItems as $item) {
            $added = $this->cartService->addItem($item->variant_id, 1);
            $results[] = $added;
            if ($added) {
                // Log add_to_cart
                $this->userEventService->logEvent(
                    $user->id,
                    $item->variant->product_id,
                    'add_to_cart'
                );
                $item->delete();
            }
        }
        return $results; 
    }

    public function addToWishlist(array $data){
        $validated = Validator::make($data,[
            'variant_id' => 'required|integer|exists:product_variants,id',
        ])->validate();
        $user = Auth::user();
        $exists = Wishlist::where('user_id', $user->id)
                      ->where('variant_id', $validated['variant_id'])
                      ->exists();

         if ($exists) {
            throw ValidationException::withMessages([
                'variant_id' => ['This item is already in your wishlist.'],
            ]);
        }
        $wishlist = Wishlist::create([
            'user_id' => $user->id,
            'variant_id' => $validated['variant_id'],
        ]);
         // Log wishlist event
        $productId = Variant::find($validated['variant_id'])->product_id;
        $this->userEventService->logEvent($user->id, $productId, 'wishlist');

        return $wishlist;
    }
    public function deleteWishlist($wishlistId){
            return Wishlist::destroy($wishlistId);
         }
}