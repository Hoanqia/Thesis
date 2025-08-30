"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MapPin, CreditCard, DollarSign, Ticket, X } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import AddressList from "@/features/user_addresses/components/AddressList";
import { addressApi, UserAdresss } from "@/features/user_addresses/api/addressApi";
import { voucherApi, Voucher } from "@/features/vouchers/api/voucherApi";
import { CartItemApi } from "@/features/cart/api/cartApi";
import VoucherCard from "@/features/vouchers/components/VoucherCard";
import { Variant, SpecValue } from "@/features/variants/api/variantApi";
import { reservedStockApi } from "@/features/reservedStock/api/reservedStockApi";
import {CreateOrderPayload, customerOrderApi} from "@/features/orders/api/orderApi"

export const formatSpecValue = (sv?: Partial<SpecValue>): string => {
  if (!sv || !sv.specification) return "";

  // Nếu kiểu option
  if (sv.specification.data_type === "option" && sv.spec_options?.value) {
    return sv.spec_options.value;
  }
  // Kiểm value_int trước
  if (sv.value_int != null) {
    return `${sv.value_int}${sv.specification.unit ?? ""}`.trim();
  }
  // Rồi đến value_decimal
  if (sv.value_decimal != null) {
    return `${sv.value_decimal}${sv.specification.unit ?? ""}`.trim();
  }
  // Cuối cùng value_text
  if (sv.value_text) {
    return sv.value_text;
  }
  return "";
};

/**
 * Lấy giá trị spec theo tên, dùng optional chaining và partial để tránh lỗi thiếu dữ liệu
 */
export const getSpecValue = (
  variant: Partial<Variant> = {},
  specName: string
): string | null => {
  if (!variant.variant_spec_values?.length) return null;

  const key = specName.trim().toLowerCase();
  const found = variant.variant_spec_values.find((sv) =>
    sv.specification?.name?.trim().toLowerCase().includes(key)
  );
  return found ? formatSpecValue(found) : null;
};

/**
 * Ghép nhãn variant: đảm bảo dù thiếu trường nào cũng không lỗi, vẫn trả về string
 */
export const buildVariantLabel = (variant: Partial<Variant>): string => {
  const color = getSpecValue(variant, "Màu sắc") ?? "N/A";
  const ramRaw = getSpecValue(variant, "RAM");
  const storageRaw = getSpecValue(variant, "Dung lượng bộ nhớ") ?? getSpecValue(variant, "Storage");

  const ram = ramRaw ? `Ram ${ramRaw}` : "N/A";
  const storage = storageRaw ? storageRaw : "N/A";

  return `${color} – ${ram} – ${storage}`;
};

export default function CheckoutPage() {
  const router = useRouter();
  const params = useSearchParams();

  const addressId = params.get("addressId");
  const selectedIdsParam = params.get("selectedIds");
  const shippingVoucherId = params.get("shippingVoucher");
  const orderVoucherId = params.get("orderVoucher");

  const { items } = useCartStore();

  const [defaultAddress, setDefaultAddress] = useState<UserAdresss | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<CartItemApi[]>([]);
 const [paymentMethod, setPaymentMethod] = useState<"cod" | "bank_transfer">("cod");
    const [shippingVoucher, setShippingVoucher] = useState<Voucher | null>(null);
  const [orderVoucher, setOrderVoucher] = useState<Voucher | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [shippingVouchers, setShippingVouchers] = useState<Voucher[]>([]);
  const [orderVouchers, setOrderVouchers] = useState<Voucher[]>([]);

  const [reserveError, setReserveError] = useState<string | null>(null);
    const [confirmed, setConfirmed] = useState(false);

   // Tạo reservationId một lần duy nhất
  const [reservationId] = useState<string>(() => {
    const existing = sessionStorage.getItem("reservationId");
    if (existing) return existing;
    const newId = crypto.randomUUID();
    sessionStorage.setItem("reservationId", newId);
    return newId;
  });

  // CHỈ PHẦN RELEASE
  useEffect(() => {
    const cancel = () => {
      if (confirmed) return;           // <— nếu đã confirm thì skip
      reservedStockApi
        .release()            // your DELETE /reserved-stock/release
        .catch(err => console.error("Release error:", err));
      sessionStorage.removeItem("reservationId");
    };

    // 1. Trước khi reload hoặc đóng tab
    window.addEventListener("beforeunload", cancel);
    // 2. Khi back/forward
    window.addEventListener("popstate", cancel);

    return () => {
      // Khi component unmount hoặc effect re-run
      cancel();
      window.removeEventListener("beforeunload", cancel);
      window.removeEventListener("popstate", cancel);
    };
  }, [confirmed]);  // Chạy một lần sau mount

const placeOrder = async () => {
  if (!defaultAddress) return;
  try {
    const payload: CreateOrderPayload = {
      shipping_id: 3,
      address_id: defaultAddress.id,
      payment_method: paymentMethod === "cod" ? "cod" : "bank_transfer",
      product_voucher_id: orderVoucher?.id,
      shipping_voucher_id: shippingVoucher?.id,
      items: selectedItems.map(i => ({
        variant_id: i.variant.id,
        quantity: i.quantity,
        price_at_time: i.price_at_time,
      })),
    };

    // Tạo order; service sẽ gọi assignReservedStockToOrder dựa vào reservation_id
    const order = await customerOrderApi.createOrder(payload);
    const orderId = order.id;
    if (paymentMethod === "cod") {
      await reservedStockApi.confirm(orderId);
      setConfirmed(true);
        router.push(`/checkout/order_success?orderId=${orderId}`);
        return;
      }
      
    await reservedStockApi.confirm(orderId);
    setConfirmed(true);
  //  router.push(`/checkout/order_success?orderId=${order.id}`);

   const token = sessionStorage.getItem('access_token');

    const res = await fetch('http://localhost:8000/api/customer/vnpay/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        orderId,
        description: null,
        bankCode: 'NCB',
        language: 'vn',
      }),
    });

    if (!res.ok) {
      throw new Error('Tạo payment thất bại');
    }

    const data = await res.json();
    const paymentUrl = data.paymentUrl;
    console.log("Url trả về:", paymentUrl);
    window.location.href = paymentUrl;  

  } catch (err) {
    console.error("Place order error:", err);
    // TODO: show toast cho người dùng
  }
};



  useEffect(() => {
    if (addressId) {
      addressApi.fetchById(Number(addressId))
        .then(setDefaultAddress)
        .catch(console.error);
    }
    if (selectedIdsParam) {
      try {
        const ids = JSON.parse(selectedIdsParam);
        // setSelectedItems(items.filter(i => ids.includes(i.id)));
        const filtered = items.filter(i => ids.includes(i.id));
        setSelectedItems(filtered);
        // Reserve stock immediately
        const payload = filtered.map(i => ({ variant_id: i.variant.id, quantity: i.quantity }));
        reservedStockApi.reserve(payload).catch(err => {
          console.error("Reserve error", err);
          setReserveError(err.message);
        });
      } catch {
        setSelectedItems([]);
      }
    }
    if (shippingVoucherId) {
      voucherApi.fetchById(Number(shippingVoucherId))
        .then(setShippingVoucher)
        .catch(console.error);
    }
    if (orderVoucherId) {
      voucherApi.fetchById(Number(orderVoucherId))
        .then(setOrderVoucher)
        .catch(console.error);
    }
    voucherApi.fetchAll()
      .then(list => {
        setShippingVouchers(list.filter(v => v.type === "shipping_discount"));
        setOrderVouchers(list.filter(v => v.type === "product_discount"));
      })
      .catch(console.error);

      
  }, [addressId, selectedIdsParam, items, shippingVoucherId, orderVoucherId]);

  const formatVND = (value: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

  const shippingCost = 30000;
  const subtotal = selectedItems.reduce((sum, i) => sum + i.price_at_time * i.quantity, 0);

  let shippingDiscount = 0;
  if (shippingVoucher && subtotal >= Number(shippingVoucher.minimum_order_amount)) {
    if (shippingVoucher.discount_percent! > 0) {
      shippingDiscount = Math.floor((shippingCost * shippingVoucher.discount_percent!) / 100);
    }
    shippingDiscount = Math.min(shippingDiscount, shippingCost);
  }

  let productDiscount = 0;
  if (orderVoucher && subtotal >= Number(orderVoucher.minimum_order_amount)) {
    if (orderVoucher.discount_percent! > 0) {
      productDiscount = Math.floor((subtotal * orderVoucher.discount_percent!) / 100);
    }
  }

  const total = subtotal + shippingCost - shippingDiscount - productDiscount;

  

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      {/* Address */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Địa chỉ giao hàng</h2>
        <button onClick={() => setIsAddressModalOpen(true)} className="w-full flex items-center p-4 border rounded hover:bg-gray-50">
          <MapPin className="mr-2" />
          {defaultAddress
            ? `${defaultAddress.phone} - ${defaultAddress.street_address}, ${defaultAddress.ward_name}, ${defaultAddress.district_name}, ${defaultAddress.province_name}`
            : "Chưa chọn địa chỉ"}
        </button>
        {isAddressModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
            <div className="bg-white w-full max-w-lg rounded-lg shadow-lg overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b">
                <h3 className="text-lg font-semibold">Chọn địa chỉ</h3>
                <button onClick={() => setIsAddressModalOpen(false)}><X /></button>
              </div>
              <div className="p-4 max-h-[70vh] overflow-auto">
                <AddressList initialSelected={defaultAddress?.id ?? null} onSelect={addr => { setDefaultAddress(addr); setIsAddressModalOpen(false); }} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Cart Items */}
      <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Danh sách sản phẩm</h2>
            <div className="space-y-4">
                {selectedItems.map(item => (
                <div key={item.id} className="flex items-center border rounded p-4 relative">
                    <img
                    src={item.variant.img || "/placeholder.png"}
                    alt={item.variant.product.name}
                    className="w-20 h-20 object-cover rounded mr-4"
                    />
                    <div className="flex-1">
                    <h3 className="font-semibold">{item.variant.product.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{buildVariantLabel(item.variant)}</p>
                    </div>

                    {/* Hiển thị số lượng ở góc trên bên phải của giá */}
                    <div className="text-right relative">
                    <span className="absolute -top-4 right-0 text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        x{item.quantity}
                    </span>
                    <div className="font-semibold">{formatVND(item.quantity * item.price_at_time)}</div>
                    </div>
                </div>
                ))}
            </div>
            </section>


      {/* Voucher (moved under items) */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Voucher</h2>
        <button onClick={() => setIsVoucherModalOpen(true)} className="w-full flex items-center p-4 border rounded hover:bg-gray-50">
          <Ticket className="mr-2" /> Chọn voucher
        </button>
        {shippingVoucher && (
          <div className="mt-2 p-2 bg-gray-50 rounded flex justify-between">
            <span>Freeship: {shippingVoucher.code}</span>
            <button onClick={() => setShippingVoucher(null)} className="text-red-500"><X size={16} /></button>
          </div>
        )}
        {orderVoucher && (
          <div className="mt-2 p-2 bg-gray-50 rounded flex justify-between">
            <span>Giảm đơn: {orderVoucher.code}</span>
            <button onClick={() => setOrderVoucher(null)} className="text-red-500"><X size={16} /></button>
          </div>
        )}
        {isVoucherModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
            <div className="bg-white w-full max-w-xl rounded-lg shadow-lg overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b">
                <h3 className="text-lg font-semibold">Chọn Voucher</h3>
                <button onClick={() => setIsVoucherModalOpen(false)}><X /></button>
              </div>
              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                <h4 className="font-medium">Voucher Freeship</h4>
                {shippingVouchers.map(v => (
                  <VoucherCard key={v.id} voucher={v} isSelected={shippingVoucher?.id === v.id} onSelect={id => setShippingVoucher(shippingVouchers.find(x => x.id === id)!)} />
                ))}
                <h4 className="font-medium mt-4">Voucher Giảm Giá</h4>
                {orderVouchers.map(v => (
                  <VoucherCard key={v.id} voucher={v} isSelected={orderVoucher?.id === v.id} onSelect={id => setOrderVoucher(orderVouchers.find(x => x.id === id)!)} />
                ))}
              </div>
              <div className="flex justify-end px-6 py-4 border-t">
                <button onClick={() => setIsVoucherModalOpen(false)} className="px-4 py-2 bg-blue-500 text-white rounded">Áp dụng</button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Payment */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Phương thức thanh toán</h2>
        <div className="space-y-2">
          <label className="flex items-center">
            <input type="radio" name="pay" value="cash" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} className="mr-2" />
            <DollarSign className="mr-1" /> Thanh toán khi nhận hàng
          </label>
          <label className="flex items-center">
            <input type="radio" name="pay" value="card" checked={paymentMethod === "bank_transfer"} onChange={() => setPaymentMethod("bank_transfer")} className="mr-2" />
            <CreditCard className="mr-1" /> Thanh toán bằng thẻ
          </label>
        </div>
      </section>

      {/* Summary */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Tóm tắt thanh toán</h2>
        <div className="border rounded p-4 space-y-2">
          <div className="flex justify-between"><span>Tổng tiền hàng</span><span>{formatVND(subtotal)}</span></div>
          <div className="flex justify-between"><span>Phí vận chuyển</span><span>{formatVND(shippingCost)}</span></div>
          <div className="flex justify-between"><span>Giảm phí vận chuyển</span><span className="text-red-500">-{formatVND(shippingDiscount)}</span></div>
          <div className="flex justify-between"><span>Giảm giá đơn hàng</span><span className="text-red-500">-{formatVND(productDiscount)}</span></div>
          <div className="flex justify-between text-lg font-bold"><span>Thanh toán</span><span>{formatVND(total)}</span></div>
        </div>
      </section>

      <button
        onClick={placeOrder}
        disabled={!defaultAddress || selectedItems.length === 0}
        className={`w-full py-3 rounded font-semibold ${!defaultAddress || selectedItems.length === 0 ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-green-500 text-white hover:bg-green-600"}`}
      >
        XÁC NHẬN ĐẶT HÀNG
      </button>
    </div>
  );
}
