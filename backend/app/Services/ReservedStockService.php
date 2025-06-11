<?php

namespace App\Services;
use App\Models\Variant;

use App\Models\ReservedStock;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;

class ReservedStockService {
    /**
     * Reserve stock for each item before order creation.
     *
     * @param  \App\Models\User  $user
     * @param  array  $cartItems  // each item: ['variant_id' => int, 'quantity' => int]
     * @return void
     * @throws \Exception
     */
    public function reserveStockBeforeOrder($user, array $cartItems): void
    {
        foreach ($cartItems as $item) {
            $variantId = $item['variant_id'];
            $qty = $item['quantity'];

            $variant = Variant::findOrFail($variantId);

            if ($variant->stock < $qty) {
                throw new \Exception("Sản phẩm {$variant->product->name} không đủ hàng.");
            }

           ReservedStock::updateOrCreate([
                'user_id'    => $user->id,
                'variant_id' => $variantId,
                'order_id'   => null,
                ],
                [
                    'quantity'   => $qty,
                    'expires_at' => Carbon::now('Asia/Ho_Chi_Minh')->addDays(3),
                ]
            );

        }
    }

    /**
     * Release (delete) all reserved stock entries for the given user that have not been confirmed.
     *
     * @param  \App\Models\User  $user
     * @return void
     */
    public function releaseReservedStockForUser($user): void
    {
        ReservedStock::where('user_id', $user->id)
            ->whereNull('order_id')
            ->delete();
    }

    /**
     * Assign all reserved stock entries of a user to a specific order, preventing them from expiring.
     *
     * @param  \App\Models\User  $user
     * @param  int  $orderId
     * @return void
     * @throws \Exception
     */
    public function assignReservedStockToOrder($user, int $orderId): void
    {
        $records = ReservedStock::where('user_id', $user->id)
            ->whereNull('order_id')
            ->where('expires_at', '>=', Carbon::now())
            ->get();

        if ($records->isEmpty()) {
            throw new \Exception('Không có bản ghi giữ hàng hợp lệ.');
        }

        foreach ($records as $record) {
            $record->order_id = $orderId;
            $record->save();
        }
    }

    /**
     * Remove expired reserved stock entries.
     *
     * @return int  // number of deleted records
     */
    public function removeExpired(): int
    {
        return ReservedStock::where('expires_at', '<', Carbon::now())->delete();
    }

    /**
     * Trả về số lượng còn bán cho một variant.
     *
     * @param  int  $variantId
     * @return int
     */
    public function getAvailableStock(int $variantId): int
    {
        $variant = Variant::findOrFail($variantId);

        // Tổng đã reserve (chưa có order_id và chưa hết hạn)
        $reserved = ReservedStock::where('variant_id', $variantId)
            ->whereNull('order_id')
            ->where('expires_at', '>=', Carbon::now())
            ->sum('quantity');

        return $variant->stock - $reserved;
    }
}
