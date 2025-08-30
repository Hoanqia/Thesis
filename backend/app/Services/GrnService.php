<?php

// app/Services/GrnService.php

namespace App\Services;
use App\Models\Variant;
use App\Models\Grn;
use App\Models\GrnItem;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\PurchaseOrder; 
use App\Models\PurchaseOrderItem; // Cần import PurchaseOrderItem
use App\Services\StockLotService; // Thêm import StockLotService

use Exception;


class GrnService
{
    protected StockLotService $stockLotService; 

    public function __construct(StockLotService $stockLotService)
    {
        $this->stockLotService = $stockLotService;
    }

   

    public function create(array $data, array $items): Grn
    {
        \Log::info('Starting GrnService::create transaction.'); // Log ngay khi bắt đầu hàm
        return DB::transaction(function () use ($data, $items) {
            \Log::info('Inside DB transaction for GrnService::create.');
            \Log::info('Incoming GRN data: ' . json_encode($data));
            \Log::info('Incoming GRN items count: ' . count($items)); // Log số lượng items nhận được

            $purchaseOrder = PurchaseOrder::find($data['purchase_order_id']);

            // BẮT BUỘC: Kiểm tra xem Purchase Order có được tìm thấy không
            if (!$purchaseOrder) {
                \Log::error('Không tìm thấy Purchase Order với ID: ' . $data['purchase_order_id'] . '. Throwing exception.');
                throw new Exception('Không tìm thấy Purchase Order với ID đã cung cấp.');
            }
            \Log::info("Found Purchase Order ID: {$purchaseOrder->id}, Status: {$purchaseOrder->status}.");

            if ($purchaseOrder->status === 'cancelled') {
                \Log::error('Cannot create GRN for a cancelled Purchase Order. PO ID: ' . $purchaseOrder->id . '. Throwing exception.');
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
            \Log::info("GRN created successfully with ID: {$grn->id}, initial status: {$grn->status}.");

            $totalGrnAmount = 0;
            if (empty($items)) {
                \Log::warning("No items provided for GRN {$grn->id}. GRN will be created without items.");
            }

            foreach ($items as $itemData) {
                try {
                    \Log::info("Processing itemData for GRN {$grn->id}, PO Item ID: {$itemData['purchase_order_item_id']}: " . json_encode($itemData));

                    // Sử dụng findOrFail để ném Exception nếu không tìm thấy
                    $poItem = PurchaseOrderItem::with('variant')->findOrFail($itemData['purchase_order_item_id']);
                    \Log::info("Found PO Item {$poItem->id}. Current state: Ordered={$poItem->ordered_quantity}, Received={$poItem->received_quantity}.");

                    // Kiểm tra số lượng nhận không vượt quá số lượng còn lại của PO item
                    $remainingQuantity = $poItem->ordered_quantity - $poItem->received_quantity;
                    \Log::info("Remaining quantity for PO Item {$poItem->id}: {$remainingQuantity}. Requested quantity: {$itemData['quantity']}.");

                    if ($itemData['quantity'] > $remainingQuantity) {
                        \Log::error("Received quantity for item {$poItem->id} exceeds remaining ordered quantity. Remaining: {$remainingQuantity}, Received: {$itemData['quantity']}. Throwing exception.");
                        throw new Exception("Received quantity for item {$poItem->id} exceeds remaining ordered quantity. Remaining: {$remainingQuantity}, Received: {$itemData['quantity']}");
                    }
                    $unitCost = $poItem->unit_cost;
                    $subtotal = $itemData['quantity'] * $unitCost;
                    \Log::info("Calculated subtotal for PO Item {$poItem->id}: {$subtotal}.");

                    // Tạo GrnItem
                    $grnItem = $grn->items()->create([
                        'purchase_order_item_id' => $poItem->id,
                        'quantity' => $itemData['quantity'],
                        'unit_cost' => $unitCost,
                        'subtotal' => $subtotal,
                    ]);
                    \Log::info("GRN Item created successfully for GRN {$grn->id}, PO Item {$poItem->id}. GRN Item ID: {$grnItem->id}, Quantity: {$grnItem->quantity}.");

                    $totalGrnAmount += $subtotal;
                    \Log::info("Current totalGrnAmount: {$totalGrnAmount}.");

                    // Cập nhật số lượng đã nhận của PurchaseOrderItem
                    $poItem->increment('received_quantity', $itemData['quantity']);
                    $poItem->refresh(); // Rất quan trọng để lấy giá trị mới nhất sau increment
                    \Log::info("PO Item {$poItem->id} received_quantity incremented. New received_quantity: {$poItem->received_quantity}.");

                } catch (\Exception $e) {
                    \Log::error("Error processing GRN item for GRN {$grn->id}, PO Item ID (attempted): " . ($itemData['purchase_order_item_id'] ?? 'N/A') . ". Error: " . $e->getMessage());
                    \Log::error($e->getTraceAsString()); // Ghi lại full stack trace
                    throw $e; // Re-throw để transaction bị rollback
                }
            }

            $grn->update(['total_amount' => $totalGrnAmount]);
            \Log::info("GRN {$grn->id} total_amount updated to {$totalGrnAmount}.");

            // Lấy dữ liệu mới nhất của PO sau khi các PO items đã được cập nhật
            $purchaseOrder->refresh(); 
            // Cần load lại items của purchase order để sum() có dữ liệu mới nhất
            $purchaseOrder->load('items'); // Đảm bảo mối quan hệ items đã được load lại sau khi refresh
            
            $totalOrderedQuantity = $purchaseOrder->items->sum('ordered_quantity');
            $totalReceivedQuantity = $purchaseOrder->items->sum('received_quantity');
            \Log::info("PO {$purchaseOrder->id} status check: Total Ordered Quantity: {$totalOrderedQuantity}, Total Received Quantity: {$totalReceivedQuantity}.");

            if ($totalReceivedQuantity >= $totalOrderedQuantity) {
                $purchaseOrder->update(['status' => 'received']);
                \Log::info("PO {$purchaseOrder->id} status updated to 'received'.");
            } elseif ($totalReceivedQuantity > 0) {
                $purchaseOrder->update(['status' => 'partially_received']);
                \Log::info("PO {$purchaseOrder->id} status updated to 'partially_received'.");
            } else {
                 \Log::info("PO {$purchaseOrder->id} status remains unchanged (no items received yet).");
            }

            // $grn = $grn->load(['items.purchaseOrderItem.variant', 'purchaseOrder', 'user']); // Chỉ load khi cần trả về đầy đủ data
            \Log::info('Final GRN object before returning from service, transaction should commit now: ' . json_encode($grn));
            return $grn;
        });
    }
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
                 $this->stockLotService->createLot(
                    variantId: $variant->id,
                    quantityIn: $actualReceivedQuantity,
                    unitCost: $grnItem->unit_cost,
                    grnItemId: $grnItem->id, // Liên kết trực tiếp với grn_item_id
                    referenceType: 'App\Models\GrnItem', // Hoặc 'App\Models\Grn'
                    referenceId: $grnItem->id, // Hoặc $grn->id
                    purchaseDate: $grnItem->created_at,
                    userId: $user->id,
                    transactionType: 'IN_GRN',
                    transactionNotes: "Nhập kho từ GRN #{$grn->id}, Item #{$grnItem->id}"
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
