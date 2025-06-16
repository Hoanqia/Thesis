<?php

// app/Services/GrnService.php

namespace App\Services;

use App\Models\Grn;
use App\Models\GrnItem;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use App\Services\InventoryTransactionService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class GrnService
{
    protected InventoryTransactionService $inventoryService;

    public function __construct(InventoryTransactionService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    /**
     * Create a new GRN with items.
     *
     * @param array $data  includes user_id, supplier_id, type, expected_delivery_date, notes
     * @param array $items each item: variant_id, ordered_quantity, unit_cost
     * @return Grn
     */
    public function create(array $data, array $items): Grn
    {
        return DB::transaction(function () use ($data, $items) {
            $grn = Grn::create(array_merge($data, ['status' => 'pending', 'total_amount' => 0]));

            $total = 0;
            foreach ($items as $itemData) {
                $subtotal = $itemData['ordered_quantity'] * $itemData['unit_cost'];
                $grnItem = new GrnItem(array_merge($itemData, ['subtotal' => $subtotal]));
                $grn->items()->save($grnItem);
                $total += $subtotal;
            }

            $grn->update(['total_amount' => $total]);
            return $grn;
        });
    }

    /**
     * Confirm a GRN: set status to confirmed and record inventory transactions.
     *
     * @param int $grnId
     * @return Grn
     * @throws \Exception
     */
    // public function confirm(int $grnId): Grn
    // {
    //     return DB::transaction(function () use ($grnId) {
    //         $grn = Grn::with('items')->findOrFail($grnId);
    //         if ($grn->status !== 'pending') {
    //             throw new \Exception('Only pending GRNs can be confirmed.');
    //         }
    //                 \Log::info("GRN ID: {$grn->id}, Status: {$grn->status}, Number of items: " . $grn->items->count());

    //         $grn->update(['status' => 'confirmed']);
    //         $user = Auth::user();
    //         foreach ($grn->items as $item) {
    //             // Record inventory transaction for each item
    //                 $quantityToRecord = $item->received_quantity ?: $item->ordered_quantity;
    //                 \Log::info("Attempting to record inventory for variant: {$item->variant_id}, quantity: {$quantityToRecord}");

    //             $this->inventoryService->recordInGrn(
    //                 $item->variant_id,
    //                 $item->received_quantity ?: $item->ordered_quantity,
    //                 'GRN',
    //                 $grn->id,
    //                 $user->id,
    //             );
    //         }

    //         return $grn;
    //     });
    // }


           public function confirm(int $grnId, array $itemsData): Grn
    {
        return DB::transaction(function () use ($grnId, $itemsData) {
            $grn = Grn::with('items.variant')->findOrFail($grnId);

            if ($grn->status !== 'pending') {
                throw new Exception('Only pending GRNs can be confirmed.');
            }

            \Log::info("GRN ID: {$grn->id}, Status: {$grn->status}, Number of items (from DB initial load): " . $grn->items->count());

            $user = Auth::user();
            if (!$user) {
                throw new Exception('Authenticated user not found.', 401);
            }

            $newTotalAmount = 0; // Khởi tạo biến để tính tổng tiền mới cho GRN

            foreach ($itemsData as $itemData) {
                $itemId = $itemData['id'];
                $receivedQuantity = $itemData['received_quantity'];

                $item = $grn->items->firstWhere('id', $itemId);

                if (!$item) {
                    throw new Exception("GRN Item with ID {$itemId} not found for GRN {$grnId}.");
                }

                // Tính toán lại subtotal dựa trên received_quantity
                $newSubtotal = $receivedQuantity * $item->unit_cost;

                // Cập nhật received_quantity và subtotal cho item
                $item->update([
                    'received_quantity' => $receivedQuantity,
                    'subtotal' => $newSubtotal, // CẬP NHẬT SUBTOTA
                ]);

                // Cộng vào tổng tiền mới của GRN
                $newTotalAmount += $newSubtotal;

                \Log::info("Attempting to record inventory for variant: {$item->variant_id}, quantity: {$receivedQuantity}");

                // Ghi nhận giao dịch tồn kho với số lượng thực tế nhận được
                $this->inventoryService->recordInGrn(
                    $item->variant_id,
                    $receivedQuantity,
                    'GRN',
                    $grn->id,
                    $user->id,
                );
            }

            // Cập nhật trạng thái và tổng tiền mới của GRN
            $grn->update([
                'status' => 'confirmed',
                'total_amount' => $newTotalAmount, // CẬP NHẬT TOTAL_AMOUNT
            ]);

            return $grn->fresh(['items.variant', 'supplier', 'user']);
        });
    }
    /**
     * Cancel a GRN: only pending allowed.
     *
     * @param int $grnId
     * @return Grn
     * @throws \Exception
     */
    public function cancel(int $grnId): Grn
    {
        $grn = Grn::findOrFail($grnId);
        if ($grn->status !== 'pending') {
            throw new \Exception('Only pending GRNs can be cancelled.');
        }
        $grn->update(['status' => 'cancelled']);

        return $grn;
    }

    /**
     * List all GRNs.
     *
     * @return Collection
     */
    public function all(): Collection
    {
        return Grn::with(['supplier', 'user'])->orderBy('created_at', 'desc')->get();
    }

    /**
     * Find a GRN by id.
     *
     * @param int $id
     * @return Grn
     */
    public function find(int $id): Grn
    {
        $grn = Grn::with(['items.variant', 'supplier', 'user'])->findOrFail($id);

       // Loop through each item in the GRN
        // foreach ($grn->items as $item) {
        //     // Access the variant through the item's relationship
        //     $variant = $item->variant;

        //     // Access the image from the variant
        //     $item->variant->img = $variant->image ? asset('storage/' . $variant->image) : null;
        // }

        return $grn;
    }

    public function deleteGrn(int $id){
        return Grn::destroy($id);
    }
}
