<?php

namespace App\Services;
use App\Models\StockLotAllocation;
use App\Services\StockLotSerivce;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\Variant;
use App\Models\Voucher;
use App\Models\Order;
use App\Models\ShippingMethod;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Services\UserEventService;
use App\Jobs\SendOrderConfirmationEmail; // Import Job gửi 
use App\Services\NotificationService;
use Exception;
class CustomerOrderService
{   

     protected $userEventService;
    protected $notificationService;
    protected $stockLotService;
    public function __construct(UserEventService $userEventService, NotificationService $notificationService, StockLotService $stockLotService )
    {
        $this->userEventService = $userEventService;
        $this->notificationService = $notificationService;
        $this->stockLotService = $stockLotService;
    }


    public function createOrder(array $data){
        $user = Auth::user();

        // Lấy mảng items từ frontend
        $orderItemsData = collect($data['items']);
        if ($orderItemsData->isEmpty()) {
            throw new \Exception("Bạn chưa chọn sản phẩm để đặt.");
        }

        // Kiểm tra địa chỉ giao hàng
        if (!empty($data['address_id'])) {
            $address = $user->addresses()->where('id', $data['address_id'])->first();
            if (!$address) {
                throw new \Exception("Địa chỉ không hợp lệ.");
            }
        } else {
            $address = $user->addresses()->where('is_default', true)->first();
            if (!$address) {
                throw new \Exception("Bạn chưa chọn địa chỉ giao hàng mặc định.");
            }
        }

        // Tính tổng giá sản phẩm (subtotal)
        $subtotal = $orderItemsData->sum(function ($i) {
            return $i['price_at_time'] * $i['quantity'];
        });

        // Validate phương thức thanh toán
        if (empty($data['payment_method'])) {
            throw new \Exception("Vui lòng chọn phương thức thanh toán.");
        }

        $productVoucherId = $data['product_voucher_id'] ?? null;
        $shippingVoucherId = $data['shipping_voucher_id'] ?? null;
        $discountOnProducts = 0;
        $discountOnShipping = 0;
        // Tạm lưu voucher (nếu có)
        $productVoucher = null;
        $shippingVoucher = null;
       
        // Kiểm tra voucher sản phẩm
        if ($productVoucherId) {
            $productVoucher = Voucher::where('id', $productVoucherId)
                ->where('type', 'product_discount')
                ->where('status', true)
                ->where('start_date', '<=', now())
                ->where('end_date', '>=', now())
                ->where(function ($q) {
                    $q->whereNull('max_uses')->orWhereColumn('used_count', '<', 'max_uses');
                })
                ->first();

            if (!$productVoucher || ($productVoucher->minimum_order_amount && $subtotal < $productVoucher->minimum_order_amount)) {
                throw new \Exception("Đơn hàng chưa đạt mức tối thiểu để áp voucher.");
            }

            $discountOnProducts = $subtotal * ($productVoucher->discount_percent / 100);
        }

        // Phí vận chuyển
        $shippingFee = 0;
        $shippingId = $data['shipping_id'] ?? null;

        if ($shippingId) {
            $ship = ShippingMethod::find($shippingId);
            if (!$ship) throw new \Exception("Phương thức vận chuyển không hợp lệ.");
            $shippingFee = $ship->fee;
        }

        // Kiểm tra voucher vận chuyển
        if ($shippingVoucherId) {
            $shippingVoucher = Voucher::where('id', $shippingVoucherId)
                ->where('type', 'shipping_discount')
                ->where('status', true)
                ->where('start_date', '<=', now())
                ->where('end_date', '>=', now())
                ->where(function ($q) {
                    $q->whereNull('max_uses')->orWhereColumn('used_count', '<', 'max_uses');
                })
                ->first();

            if (!$shippingVoucher) {
                throw new \Exception("Voucher giảm giá vận chuyển không hợp lệ.");
            }

            $discountOnShipping = $shippingFee * ($shippingVoucher->discount_percent / 100);
        }

        // Tính tổng tiền sau cùng
        $shippingAfterDiscount = max(0, $shippingFee - $discountOnShipping);
        $finalTotal = max(0, $subtotal - $discountOnProducts + $shippingAfterDiscount);

        // Kiểm tra tồn kho
        foreach ($orderItemsData as $i) {
            $variant = Variant::findOrFail($i['variant_id']);
            if ($variant->stock < $i['quantity']) {
                throw new \Exception("Sản phẩm '{$variant->product->name}' không đủ hàng. Còn lại: {$variant->stock}");
            }
        }

        // Tạo order trong transaction
        return DB::transaction(function () use (
            $user, $orderItemsData, $data, $finalTotal,
            $discountOnProducts, $discountOnShipping, $shippingFee,
            $shippingId, $address, $productVoucher, $shippingVoucher,
            $productVoucherId, $shippingVoucherId
        ) {
            $order = $user->orders()->create([
                'recipient_name'       => $user->name,
                'recipient_phone'      => $address->phone,
                'recipient_address'    => $address->street_address,
                'province'             => $address->province_name,
                'district'             => $address->district_name,
                'ward'                 => $address->ward_name,
                'shipping_id'          => $shippingId,
                'shipping_fee'         => $shippingFee,
                'total_price'          => $finalTotal,             // giá sau cùng
                'product_voucher_id'   => $productVoucherId,
                'shipping_voucher_id'  => $shippingVoucherId,
                'discount_on_products' => $discountOnProducts,
                'discount_on_shipping' => $discountOnShipping,
                'status'               => 'pending',
                'payment_method'       => $data['payment_method'],
                'is_paid'              => false,
            ]);

            $variantIds = [];

            foreach ($orderItemsData as $i) {
                $variant = Variant::findOrFail($i['variant_id']);

                $order->orderItems()->create([
                    'variant_id'   => $variant->id,
                    'variant_name' => $variant->full_name,
                    'price'        => $i['price_at_time'],
                    'quantity'     => $i['quantity'],
                ]);
                $variantIds[] = $variant->id;

                 $this->userEventService->logEvent(
                    $user->id,
                    $variant->product_id,    
                    'purchase',             
                );
            }

            // Cập nhật lượt dùng voucher
            if ($productVoucher) {
                $productVoucher->increment('used_count');
            }
            if ($shippingVoucher) {
                $shippingVoucher->increment('used_count');
            }

            $cart = $user->cart;
            if ($cart) {
                $cart->cartItems()
                    ->whereIn('variant_id', $variantIds)
                    ->delete();
            }

            SendOrderConfirmationEmail::dispatch($order->load('orderItems', 'user'));
             if ($user) {
            // Tạo thông báo cho người dùng
            $this->notificationService->createNotification(
                $user,
                "order",
                "Đặt hàng thành công. Mã đơn hàng ." .$order->id,
            );
        }

        // Tạo thông báo cho admin
        $this->notificationService->createAdminNotification(
            "order",
            "Đơn đặt hàng mới từ " . ($user->name ?? 'Khách hàng ẩn danh') . ". Mã đơn hàng " . $order->id,
        );
            return $order->load('orderItems');
        });
    }

    

    public function getUserOrders()
    {
        $orders = Auth::user()->orders()->latest()->with('orderItems.variant')->withCount('reviews')->get();
        $orders->each(function($order) {
            $order->orderItems->each(function($item) {
                $item->img = $item->variant && $item->variant->image
                    ? asset('storage/' . $item->variant->image)
                    : null;
            });
                    $order->hasReviewed = ($order->reviews_count > 0);
        });
        return $orders;
    }

    public function getOrderDetails($orderId)
    {
        return Auth::user()->orders()->with('orderItems')->findOrFail($orderId);
    }

    public function cancelOrder($orderId)
    {
        $order = Auth::user()->orders()->whereIn('status', ['pending','confirmed','shipping'])->where('id',$orderId)->first();
        $newStatus = 'canceled';
        $currentStatus = $order->status;
          // Bắt đầu transaction để đảm bảo tính toàn vẹn dữ liệu
        DB::beginTransaction();
    
        // 4. Xử lý logic tồn kho hoặc giữ hàng dựa trên trạng thái mới
        if ($newStatus === 'canceled') {
         
            if (in_array($currentStatus, ['confirmed', 'shipping'])) {
               
                foreach ($order->orderItems as $item) {
                    // Lấy tất cả các bản ghi phân bổ cho order_item này
                    $allocations = StockLotAllocation::where('order_item_id', $item->id)->get();

                    if ($allocations->isEmpty()) {             
                        \Log::warning("Không tìm thấy StockLotAllocations cho OrderItem ID: " . $item->id);
                        continue; 
                    }

                    foreach ($allocations as $allocation) {
                        // Tạo StockLot mới cho phần hàng được hoàn lại từ mỗi lô đã phân bổ
                        $this->stockLotService->createLot( // Gọi service của bạn
                            $item->variant_id, // ID biến thể sản phẩm
                            $allocation->allocated_quantity, // Số lượng được hoàn lại từ lô này
                            $allocation->unit_cost_at_allocation, // **Giá vốn chính xác tại thời điểm xuất kho**
                            null, // grnItemId
                            'App\Models\StockLotAllocation', // referenceType: tham chiếu đến bản ghi phân bổ
                            $allocation->id, // referenceId: ID của bản ghi phân bổ
                            now('Asia/Ho_Chi_Minh'), // purchaseDate: Ngày nhập lại
                            Auth::id(), // userId của người thực hiện hủy
                            'ADJ_RETURN_FROM_CUSTOMER', // transactionType
                            "Hàng trả lại từ đơn hàng hủy #" . $order->id . " (Phân bổ từ Lot #" . $allocation->stock_lot_id . ")"
                        );
                        // Tùy chọn: Bạn có thể đánh dấu allocation là đã hoàn trả hoặc xóa nó
                        // $allocation->delete(); // hoặc $allocation->update(['is_returned' => true]);
                    }
                }
            } elseif ($currentStatus === 'pending') {
                ReservedStock::where('order_id', $order->id)->delete();
            }
        }

        // 5. Cập nhật trạng thái đơn hàng
        $order->update(['status' => $newStatus]);

        DB::commit(); // Hoàn tất giao dịch

        
            // Tạo thông báo cho người dùng
            $this->notificationService->createNotification(
                Auth::user(),
                "order",
                "Đặt hàng đã bị hủy. Mã đơn hàng ." .$order->id,
            );
        

        $this->notificationService->createAdminNotification(
            "order",
            "Đơn hàng bị hủy. "."Mã đơn hàng: " . $order->id,
        );
        return $order;
    }

    public function confirmReceived($orderId)
    {
        $user = Auth::user();
        $order = $user->orders()->where('status', 'shipping')->where('id',$orderId)->first();
         if (!$order) {
            return null; // để controller xử lý 404
        }
        $updateData = ['status' => 'completed'];
        if ($order->payment_method === 'cod') {
            $updateData['is_paid'] = true;
        }

        $order->update($updateData);
         $this->notificationService->createAdminNotification(
            "order",
            "Đơn hàng hoàn thành. "."Mã đơn hàng: " . $order->id,
        );
        return $order;
    }
}
