<?php

namespace App\Services;

use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use Illuminate\Database\Eloquent\ModelNotFoundException; // Import ModelNotFoundException
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class PurchaseOrderService
{
    protected $purchaseOrder;
    protected $purchaseOrderItem;

    /**
     * Khởi tạo service với các model PurchaseOrder và PurchaseOrderItem.
     *
     * @param PurchaseOrder $purchaseOrder
     * @param PurchaseOrderItem $purchaseOrderItem
     */
    public function __construct(PurchaseOrder $purchaseOrder, PurchaseOrderItem $purchaseOrderItem)
    {
        $this->purchaseOrder = $purchaseOrder;
        $this->purchaseOrderItem = $purchaseOrderItem;
    }

    /**
     * Lấy tất cả các đơn đặt hàng, có tùy chọn phân trang và tải quan hệ.
     *
     * @param int $perPage Số lượng mục trên mỗi trang.
     * @param array $with Các quan hệ cần tải.
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    public function getAllPurchaseOrders( array $with = ['user', 'supplier', 'items.variant'])
    {
        return $this->purchaseOrder->with($with)->get();
    }

    /**
     * Tìm một đơn đặt hàng cụ thể theo ID, có tùy chọn tải quan hệ.
     *
     * @param int $id ID của đơn đặt hàng.
     * @param array $with Các quan hệ cần tải.
     * @return PurchaseOrder|null
     */
    public function findPurchaseOrderById(int $id, array $with = ['user', 'supplier', 'items.variant'])
    {
        return $this->purchaseOrder->with($with)->find($id);
    }

    public function createPurchaseOrder(array $data): ?PurchaseOrder
    {
        // Bắt đầu giao dịch cơ sở dữ liệu
        DB::beginTransaction();
        try { // <-- THÊM KHỐI TRY Ở ĐÂY
            // Lấy ID người dùng hiện tại từ Auth
            if (Auth::check()) {
                $data['user_id'] = Auth::id(); // Gán ID người dùng đang đăng nhập
            } else {
                Log::warning("Cố gắng tạo đơn đặt hàng mà không có người dùng đăng nhập.");
                // Quan trọng: rollback nếu return sớm do lỗi logic
                DB::rollBack(); 
                return null; 
            }

            // Tách các mặt hàng ra khỏi dữ liệu đơn đặt hàng chính
            $itemsData = $data['items'] ?? [];
            unset($data['items']);

            // GÁN GIÁ TRỊ MẶC ĐỊNH LÀ 0.00 CHO total_amount TRƯỚC KHI TẠO ĐƠN HÀNG
            // Đây là giải pháp cho lỗi "Field 'total_amount' doesn't have a default value"
            $data['total_amount'] = 0.00; 

            // Tạo đơn đặt hàng chính
            $purchaseOrder = $this->purchaseOrder->create($data);

            // Thêm các mặt hàng vào đơn đặt hàng
            $this->syncPurchaseOrderItems($purchaseOrder, $itemsData);

            // Cập nhật tổng số tiền sau khi thêm/cập nhật các mặt hàng
            $this->updatePurchaseOrderTotalAmount($purchaseOrder);

            // Commit giao dịch
            DB::commit();
            // Tải lại quan hệ để trả về đầy đủ thông tin
            return $purchaseOrder->load(['items.variant', 'user', 'supplier']);
        } catch (Throwable $e) { // <-- KHỐI CATCH ĐÃ ĐƯỢC CHUYỂN VÀO ĐÂY
            // Rollback giao dịch nếu có lỗi
            DB::rollBack();
            Log::error("Lỗi khi tạo đơn đặt hàng: " . $e->getMessage(), ['exception' => $e]);
            throw $e; // Re-throw để controller xử lý hoặc ghi log thêm
        }
    }
    /**
     * Cập nhật một đơn đặt hàng hiện có cùng với các mặt hàng của nó dựa trên ID.
     * Hoạt động trong một giao dịch cơ sở dữ liệu.
     *
     * @param int $id ID của đơn đặt hàng cần cập nhật.
     * @param array $data Dữ liệu cập nhật cho đơn đặt hàng (bao gồm 'items').
     * @return PurchaseOrder
     * @throws ModelNotFoundException Nếu không tìm thấy đơn đặt hàng.
     * @throws Throwable
     */
    public function updatePurchaseOrder(int $id, array $data): PurchaseOrder
    {
        $purchaseOrder = $this->findPurchaseOrderById($id);

        if (!$purchaseOrder) {
            throw new ModelNotFoundException("Không tìm thấy đơn đặt hàng với ID: {$id}");
        }

        DB::beginTransaction();
        try {
            // Tách các mặt hàng ra khỏi dữ liệu đơn đặt hàng chính
            $itemsData = $data['items'] ?? [];
            unset($data['items']);

            // Cập nhật đơn đặt hàng chính
            $purchaseOrder->update($data);

            // Đồng bộ hóa các mặt hàng của đơn đặt hàng (thêm, cập nhật, xóa)
            $this->syncPurchaseOrderItems($purchaseOrder, $itemsData);

            // Cập nhật tổng số tiền sau khi thêm/cập nhật các mặt hàng
            $this->updatePurchaseOrderTotalAmount($purchaseOrder);

            DB::commit();
            return $purchaseOrder->load(['items.variant', 'user', 'supplier']); // Tải lại quan hệ để trả về đầy đủ
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("Lỗi khi cập nhật đơn đặt hàng {$purchaseOrder->id}: " . $e->getMessage(), ['exception' => $e]);
            throw $e;
        }
    }

    /**
     * Đồng bộ hóa các mặt hàng của đơn đặt hàng.
     * Xóa các mặt hàng không còn trong danh sách mới, thêm các mặt hàng mới, cập nhật các mặt hàng hiện có.
     *
     * @param PurchaseOrder $purchaseOrder
     * @param array $itemsData Danh sách các mặt hàng (mỗi mặt hàng là một mảng dữ liệu).
     */
    protected function syncPurchaseOrderItems(PurchaseOrder $purchaseOrder, array $itemsData): void
    {
        $existingItemIds = $purchaseOrder->items->pluck('id')->toArray();
        $itemIdsToKeep = [];

        foreach ($itemsData as $itemData) {
            // Tính toán subtotal nếu chưa có
            if (!isset($itemData['subtotal']) && isset($itemData['ordered_quantity']) && isset($itemData['unit_cost'])) {
                $itemData['subtotal'] = (float)$itemData['ordered_quantity'] * (float)$itemData['unit_cost'];
            }

            if (isset($itemData['id']) && in_array($itemData['id'], $existingItemIds)) {
                // Cập nhật mặt hàng hiện có
                $item = $this->purchaseOrderItem->find($itemData['id']);
                if ($item) {
                    $item->update($itemData);
                    $itemIdsToKeep[] = $item->id;
                }
            } else {
                // Thêm mặt hàng mới
                $item = $purchaseOrder->items()->create($itemData);
                $itemIdsToKeep[] = $item->id;
            }
        }

        // Xóa các mặt hàng không còn trong danh sách mới
        $itemsToDelete = array_diff($existingItemIds, $itemIdsToKeep);
        if (!empty($itemsToDelete)) {
            $purchaseOrder->items()->whereIn('id', $itemsToDelete)->delete();
        }
    }

    /**
     * Cập nhật tổng số tiền của đơn đặt hàng dựa trên các mặt hàng của nó.
     *
     * @param PurchaseOrder $purchaseOrder
     * @return bool True nếu cập nhật thành công, False nếu không.
     */
    public function updatePurchaseOrderTotalAmount(PurchaseOrder $purchaseOrder): bool
    {
        // Tải lại các mặt hàng để đảm bảo tính toán chính xác sau khi đồng bộ hóa
        $purchaseOrder->load('items');
        $totalAmount = $purchaseOrder->items->sum('subtotal');
        $purchaseOrder->total_amount = $totalAmount;
        return $purchaseOrder->save();
    }

    /**
     * Xóa một đơn đặt hàng và các mặt hàng liên quan của nó dựa trên ID.
     * Hoạt động trong một giao dịch cơ sở dữ liệu.
     *
     * @param int $id ID của đơn đặt hàng cần xóa.
     * @return bool True nếu xóa thành công, False nếu không.
     * @throws ModelNotFoundException Nếu không tìm thấy đơn đặt hàng.
     * @throws Throwable
     */
    public function deletePurchaseOrder(int $id): bool
    {
        $purchaseOrder = $this->findPurchaseOrderById($id);

        if (!$purchaseOrder) {
            throw new ModelNotFoundException("Không tìm thấy đơn đặt hàng với ID: {$id}");
        }

        DB::beginTransaction();
        try {
            $purchaseOrder->items()->delete(); // Xóa tất cả các mặt hàng liên quan
            $purchaseOrder->delete(); // Xóa đơn đặt hàng chính

            DB::commit();
            return true;
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("Lỗi khi xóa đơn đặt hàng {$purchaseOrder->id}: " . $e->getMessage(), ['exception' => $e]);
            throw $e;
        }
    }

    /**
     * Cập nhật trạng thái của một đơn đặt hàng dựa trên ID.
     *
     * @param int $id ID của đơn đặt hàng cần cập nhật trạng thái.
     * @param string $newStatus Trạng thái mới.
     * @return bool True nếu cập nhật thành công, False nếu không.
     * @throws ModelNotFoundException Nếu không tìm thấy đơn đặt hàng.
     * @throws \InvalidArgumentException Nếu trạng thái không hợp lệ.
     */
    public function updatePurchaseOrderStatus(int $id, string $newStatus): bool
    {
        $purchaseOrder = $this->findPurchaseOrderById($id);

        if (!$purchaseOrder) {
            throw new ModelNotFoundException("Không tìm thấy đơn đặt hàng với ID: {$id}");
        }

        // Kiểm tra xem trạng thái mới có hợp lệ không
        if (!in_array($newStatus, PurchaseOrder::getStatuses())) {
            throw new \InvalidArgumentException("Trạng thái '$newStatus' không hợp lệ.");
        }

        $purchaseOrder->status = $newStatus;
        return $purchaseOrder->save();
    }
}
