<?php

// app/Services/InventoryTransactionService.php

namespace App\Services;

use App\Models\InventoryTransaction;
use App\Models\Variant;
use Illuminate\Support\Facades\DB;
use Illuminate\Auth\AuthenticationException;

class InventoryTransactionService
{
    // Transaction types that increase stock
    private const POSITIVE_TYPES = [
        'IN_GRN',
        'ADJ_RETURN_FROM_CUSTOMER',
        'ADJ_FOUND',
    ];

    // Transaction types that decrease stock
    private const NEGATIVE_TYPES = [
        'OUT_SALE',
        'ADJ_DAMAGE',
        'ADJ_LOSS',
        'ADJ_RETURN_TO_SUPPLIER',
    ];

    /**
     * Record a generic inventory transaction and update stock.
     *
     * @param int $variantId
     * @param string $type
     * @param int $quantity
     * @param string|null $referenceType
     * @param int|null $referenceId
     * @param int $userId
     * @param string|null $notes
     * @return InventoryTransaction
     * @throws \Exception
     */
    public function recordTransaction(
        int $variantId,
        string $type,
        int $quantity,
        ?string $referenceType = null,
        ?int $referenceId = null,
        int $userId,
        ?string $notes = null
    ): InventoryTransaction {
        if (!in_array($type, array_merge(self::POSITIVE_TYPES, self::NEGATIVE_TYPES))) {
            throw new \InvalidArgumentException("Invalid transaction type: {$type}");
        }

        return DB::transaction(function () use (
            $variantId, $type, $quantity, $referenceType, $referenceId, $userId, $notes) {
            $variant = Variant::where('id', $variantId)->lockForUpdate()->first();

            // Determine adjustment sign
            $sign = in_array($type, self::POSITIVE_TYPES) ? 1 : -1;
            $adjustedQty = $sign * $quantity;

            // Update variant stock (assuming 'stock' column exists)
            $newStock = $variant->stock + $adjustedQty;
            if ($newStock < 0) {
                throw new \Exception('Insufficient stock: cannot reduce below zero.');
            }
            $variant->stock = $newStock;
            $variant->save();

            // Create transaction record
            return InventoryTransaction::create([
                'variant_id'     => $variantId,
                'transaction_type' => $type,
                'quantity'         => $quantity,
                'reference_type'  => $referenceType,
                'reference_id'    => $referenceId,
                'user_id'         => $userId,
                'notes'           => $notes,
            ]);
        });
    }

    /**
     * Convenience: record GRN entry (incoming stock).
     */
    public function recordInGrn(int $variantId, int $quantity, string $referenceType, int $referenceId, int $userId): InventoryTransaction
    {
        return $this->recordTransaction($variantId, 'IN_GRN', $quantity, $referenceType, $referenceId, $userId);
    }

    /**
     * Convenience: record sale (stock out).
     */
    public function recordOutSale(int $variantId, int $quantity, string $referenceType, int $referenceId, int $userId): InventoryTransaction
    {
        return $this->recordTransaction($variantId, 'OUT_SALE', $quantity, $referenceType, $referenceId, $userId);
    }

    /**
     * Convenience: record adjustment (other types).
     * e.g. 'ADJ_DAMAGE', 'ADJ_LOSS', 'ADJ_RETURN_FROM_CUSTOMER', etc.
     */
    public function recordAdjustment(int $variantId, string $type, int $quantity, ?string $referenceType, ?int $referenceId, int $userId, ?string $notes = null): InventoryTransaction
    {
        return $this->recordTransaction($variantId, $type, $quantity, $referenceType, $referenceId, $userId, $notes);
    }
}
