<?php

// app/Services/GrnService.php

namespace App\Services;
use App\Models\Variant;
use App\Models\Grn;
use App\Models\GrnItem;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use App\Services\InventoryTransactionService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\PurchaseOrder; 
use App\Models\PurchaseOrderItem; // Cần import PurchaseOrderItem
use Exception;


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


            $purchaseOrder = PurchaseOrder::find($data['purchase_order_id']);

        // BẮT BUỘC: Kiểm tra xem Purchase Order có được tìm thấy không
        if (!$purchaseOrder) {
            \Log::error('Không tìm thấy Purchase Order với ID: ' . $data['purchase_order_id']);
            throw new Exception('Không tìm thấy Purchase Order với ID đã cung cấp.');
        }



            // $purchaseOrder = PurchaseOrder::findOrFail($data['purchase_order_id']);
              if ($purchaseOrder->status === 'cancelled') {
                 throw new Exception('Cannot create GRN for a cancelled Purchase Order.');
             }
            
            $grn = Grn::create([
                'user_id' => $data['user_id'], 
                'purchase_order_id' => $data['purchase_order_id'],
                'type' => $data['type'] ?? 'purchase', 
                'notes' => $data['notes'] ?? null,
                'status' => 'pending', 
                'total_amount' => 0, 
            ]);

            $totalGrnAmount = 0;
            foreach ($items as $itemData) {
                $poItem = PurchaseOrderItem::with('variant')->findOrFail($itemData['purchase_order_item_id']);
                // Kiểm tra số lượng nhận không vượt quá số lượng còn lại của PO item
                $remainingQuantity = $poItem->ordered_quantity - $poItem->received_quantity;
                if ($itemData['quantity'] > $remainingQuantity) {
                    throw new Exception("Received quantity for item {$poItem->id} exceeds remaining ordered quantity. Remaining: {$remainingQuantity}, Received: {$itemData['quantity']}");
                }
                $unitCost = $poItem->unit_cost;
                $subtotal = $itemData['quantity'] * $unitCost;

                // Tạo GrnItem
                $grnItem = $grn->items()->create([
                    'purchase_order_item_id' => $poItem->id,
                    'quantity' => $itemData['quantity'],
                    'unit_cost' => $unitCost,
                    'subtotal' => $subtotal,
                ]);
                $totalGrnAmount += $subtotal;
                $poItem->increment('received_quantity', $itemData['quantity']);
            }

            $grn->update(['total_amount' => $totalGrnAmount]);
            // $purchaseOrder->refresh(); // Lấy dữ liệu mới nhất của PO sau khi các PO items đã được cập nhật
            $totalOrderedQuantity = $purchaseOrder->items->sum('ordered_quantity');
            $totalReceivedQuantity = $purchaseOrder->items->sum('received_quantity');

             if ($totalReceivedQuantity >= $totalOrderedQuantity) {
                $purchaseOrder->update(['status' => 'received']);
            } elseif ($totalReceivedQuantity > 0) {
                $purchaseOrder->update(['status' => 'partially_received']);
            }


            // $grn = $grn->load(['items.purchaseOrderItem.variant', 'purchaseOrder', 'user']);
            \Log::info('Final GRN object before returning from service: ' . json_encode($grn));
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
            $grn = Grn::with('items.purchaseOrderItem.variant')->findOrFail($grnId); // Eager load variant

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
                $grnItemId = $itemData['id'];
                $actualReceivedQuantity = $itemData['quantity'];

                $grnItem = $grn->items->firstWhere('id', $grnItemId);

                 if (!$grnItem) {
                    throw new Exception("GRN Item with ID {$grnItemId} not found for GRN {$grnId}.");
                }


                 // Lấy PurchaseOrderItem và ProductVariant thông qua quan hệ
                $purchaseOrderItem = $grnItem->purchaseOrderItem;
                if (!$purchaseOrderItem) {
                    throw new Exception("Associated Purchase Order Item not found for GRN Item {$grnItemId}.");
                }

                $variant = $purchaseOrderItem->variant; // Lấy variant từ purchase_order_item
                if (!$variant) {
                    throw new Exception("Variant not found for Purchase Order Item {$purchaseOrderItem->id}.");
                }


                $newSubtotal = $actualReceivedQuantity * $grnItem->unit_cost;

                // Cập nhật received_quantity và subtotal cho item
                 $grnItem->update([
                    'quantity' => $actualReceivedQuantity,
                    'subtotal' => $newSubtotal, // CẬP NHẬT SUBTOTA
                ]);

                // Cộng vào tổng tiền mới của GRN
                $newTotalAmount += $newSubtotal;

            \Log::info("Attempting to record inventory for variant: {$grnItem->variant_id}, quantity: {$actualReceivedQuantity}"); 
    

                // Ghi nhận giao dịch tồn kho với số lượng thực tế nhận được
                $this->inventoryService->recordInGrn(
                    $variant->id,
                    $actualReceivedQuantity,
                    $grnItem->unit_cost,
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

            return $grn->fresh(['items.purchaseOrderItem.variant', 'purchaseOrder', 'user']);
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
        return Grn::with(['purchaseOrder', 'user'])->orderBy('created_at', 'desc')->get();
    }

    /**
     * Find a GRN by id.
     *
     * @param int $id
     * @return Grn
     */
    public function find(int $id): Grn
    {
        $grn = Grn::with(['items.purchaseOrderItem.variant', 'purchaseOrder', 'user'])->findOrFail($id);


        return $grn;
    }

    public function deleteGrn(int $id){
        return Grn::destroy($id);
    }
}
