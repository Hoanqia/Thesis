

// pages/cart.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { X, ChevronDown, Ticket , MapPin} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { CartItemApi } from "@/features/cart/api/cartApi";

import VoucherCard from "@/features/vouchers/components/VoucherCard";
import { Voucher, voucherApi, } from "@/features/vouchers/api/voucherApi";

import AddressList from "@/features/user_addresses/components/AddressList";
import { addressApi, UserAdresss } from "@/features/user_addresses/api/addressApi";

import { Variant, SpecValue } from "@/features/variants/api/variantApi";


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

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    fetchCart,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCartStore();

  // State để theo dõi các item được chọn
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const allSelected = items.length > 0 && selectedIds.length === items.length;

   const [defaultAddress, setDefaultAddress] = useState<UserAdresss | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);


 const placeOrder = () => {
  if (!defaultAddress || selectedItems.length === 0) return;

  const query = new URLSearchParams({
    addressId: defaultAddress?.id?.toString() || "",
    selectedIds: JSON.stringify(selectedIds),
    shippingVoucher: selectedShippingVoucher?.id?.toString() || "",
    orderVoucher: selectedOrderVoucher?.id?.toString() || "",
  });

  router.push(`/checkout?${query.toString()}`);
};

   useEffect(() => {
    // fetch all, rồi tìm default (is_default===1)
    addressApi.fetchAll()
      .then(list => {
        const def = list.find(a => a.is_default === 1) ?? null;
        setDefaultAddress(def);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const formatVND = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);

  // Lọc ra những item được chọn (checkbox)
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));

  // Tính tổng số lượng và tổng giá tiền chỉ cho selectedItems
  const selectedCount = selectedItems.reduce((sum, i) => sum + i.quantity, 0);
  const selectedSubtotal = selectedItems.reduce(
    (sum, i) => sum + i.price_at_time * i.quantity,
    0
  );

  // Phí ship cố định
  const shippingCost = 30000;

  // ==== State liên quan đến Voucher ====
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [shippingVouchers, setShippingVouchers] = useState<Voucher[]>([]);
  const [orderVouchers, setOrderVouchers] = useState<Voucher[]>([]);

  // Giữ 2 voucher đã chọn (shipping + product)
  const [selectedShippingVoucher, setSelectedShippingVoucher] =
    useState<Voucher | null>(null);
  const [selectedOrderVoucher, setSelectedOrderVoucher] =
    useState<Voucher | null>(null);

  const [voucherCode, setVoucherCode] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Fetch danh sách voucher từ API
  useEffect(() => {
    voucherApi
      .fetchAll()
      .then((allVouchers) => {
        // Tách 2 nhóm: freeship và giảm giá đơn hàng
        const freeshipList = allVouchers.filter(
          (v) => v.type === "shipping_discount"
        );
        const orderList = allVouchers.filter(
          (v) => v.type === "product_discount"
        );
        setShippingVouchers(freeshipList);
        setOrderVouchers(orderList);
      })
      .catch((err) => {
        console.error("Lỗi khi fetch vouchers:", err);
      });
  }, []);

  const applyCodeVoucher = async () => {
    setErrorMessage(""); // reset lỗi trước
    if (!voucherCode.trim()) {
      setErrorMessage("Vui lòng nhập mã giảm giá.");
      return;
    }
    try {
      // Gọi API validate(code, order_amount)
      const voucher: Voucher = await voucherApi.validate(
        voucherCode.trim(),
        selectedSubtotal
      );
      // Nếu server trả về voucher hợp lệ:
      if (voucher.type === "shipping_discount") {
        setSelectedShippingVoucher(voucher);
      } else if (voucher.type === "product_discount") {
        setSelectedOrderVoucher(voucher);
      }
      // Sau khi chọn mã thành công, xóa input
      setVoucherCode("");
    } catch (error: any) {
      // Nếu validate thất bại (API ném error), hiển thị thông báo
      setErrorMessage(error.response?.data?.message || "Mã không hợp lệ.");
    }
  };

  // Khi người dùng ấn Áp dụng trong modal (footer)
  const applySelectedVoucher = () => {
    // Nếu cần validate thêm, có thể gọi API validate(...)
    setIsVoucherModalOpen(false);
  };

  // ==== Tính toán số tiền giảm cho voucher ====

  // 1) Giảm phí ship (shipping_discount)
  let shippingDiscount = 0;
  if (selectedShippingVoucher) {
    // Chỉ áp dụng khi selectedSubtotal >= minimum_order_amount
    if (selectedSubtotal >= Number(selectedShippingVoucher.minimum_order_amount)) {
      if (
        selectedShippingVoucher.discount_percent !== null &&
        selectedShippingVoucher.discount_percent! > 0
      ) {
        // Giảm theo %
        shippingDiscount = Math.floor(
          (shippingCost * selectedShippingVoucher.discount_percent!) / 100
        );
      } else {
        // Nếu discount_percent = null, không giảm hoặc có thể dùng giá trị khác
        shippingDiscount = 0;
      }
      // Đảm bảo không vượt quá phí ship
      if (shippingDiscount > shippingCost) {
        shippingDiscount = shippingCost;
      }
    } else {
      // Chưa đủ điều kiện minimum_order_amount → không giảm
      shippingDiscount = 0;
    }
  }

  // 2) Giảm giá đơn hàng (product_discount)
  let productDiscount = 0;
  if (selectedOrderVoucher) {
    // Chỉ áp dụng khi selectedSubtotal >= minimum_order_amount
    if (selectedSubtotal >= Number(selectedOrderVoucher.minimum_order_amount)) {
      if (
        selectedOrderVoucher.discount_percent !== null &&
        selectedOrderVoucher.discount_percent! > 0
      ) {
        productDiscount = Math.floor(
          (selectedSubtotal * selectedOrderVoucher.discount_percent!) / 100
        );
      } else {
        productDiscount = 0;
      }
      // Không giới hạn tối đa ở đây (backend có thể đã đảm bảo max_uses...)
    } else {
      productDiscount = 0;
    }
  }

  // Tổng cuối cùng = Tổng tiền hàng + Phí ship - Giảm ship - Giảm đơn
  const finalTotal =
    selectedSubtotal + shippingCost - shippingDiscount - productDiscount;

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? [] : items.map((i) => i.id));

  return (
    <div className="container mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* ========== Cart items ========== */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Giỏ hàng của bạn</h1>
          {items.length > 0 && (
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-5 h-5"
            />
          )}
        </div>

        {items.length === 0 ? (
          <div className="border rounded-lg p-6 text-center">
            <p className="mb-4">Giỏ hàng đang trống.</p>
            <button
              onClick={() => router.push("/products")}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Mua sắm ngay
            </button>
          </div>
        ) : (
          items.map((item: CartItemApi) => (
            <div
              key={item.id}
              className="flex items-center border rounded-lg p-4"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => toggleSelect(item.id)}
                className="w-5 h-5 mr-4 flex-shrink-0"
              />

              {/* Ảnh sản phẩm */}
              <img
                src={item.variant.img?.trim() || "/placeholder.png"}
                alt={item.variant.product.name}
                className="w-24 h-24 object-cover rounded flex-shrink-0"
              />

              <div className="flex-1 ml-4 flex flex-col md:flex-row md:items-center">
                {/* Tên sản phẩm */}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {item.variant.product.name}
                  </h3>
                   {/* Hiển thị màu – RAM – storage */}
                    <p className="text-sm text-gray-500 mt-1">
                      {buildVariantLabel(item.variant)}
                    </p>
                </div>

                {/* Nút tăng/giảm số lượng */}
                <div className="mt-4 md:mt-0 md:ml-4 flex items-center">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="px-2 py-1 bg-gray-200 rounded-l hover:bg-gray-300"
                  >
                    -
                  </button>
                  <span className="border-t border-b px-4 py-1">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="px-2 py-1 bg-gray-200 rounded-r hover:bg-gray-300"
                  >
                    +
                  </button>
                </div>

                {/* Nút xóa item */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="ml-4 p-1 hover:bg-gray-100 rounded"
                  aria-label="Remove item"
                >
                  <X size={20} />
                </button>

                {/* Giá tiền của item */}
                <div className="ml-auto font-semibold">
                  {formatVND(item.price_at_time * item.quantity)}
                </div>
              </div>
            </div>
          ))
        )}

        {items.length > 0 && (
          <button
            onClick={() => clearCart()}
            className="mt-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Xóa toàn bộ
          </button>
        )}
      </div>

      {/* ========== Summary (chỉ của item được chọn + voucher) ========== */}
      <div className="bg-white border rounded-lg p-6 space-y-6 shadow">

         {/* === Nút Chọn địa chỉ mặc định === */}
        <button
          onClick={() => setIsAddressModalOpen(true)}
          className="w-full flex justify-between items-center py-3 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-100"
        >
          <MapPin size={20} className="mr-2" />
          {defaultAddress
            ? `${defaultAddress.phone} - ${defaultAddress.street_address}, ${defaultAddress.ward_name}, ${defaultAddress.district_name}, ${defaultAddress.province_name}`
            : "Chưa có địa chỉ"}
          <ChevronDown size={20} className="ml-2" />
        </button>

        {/* CHỈ giữ nút “Chọn voucher” */}
       <button
          onClick={() => setIsVoucherModalOpen(true)}
          className="w-full flex justify-center items-center py-3 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-100"
        >
          <Ticket size={20} className="mr-2" />
          Chọn voucher
        </button>

        {/* Hiển thị voucher freeship đã chọn */}
        {selectedShippingVoucher && (
          <div className="mt-4 flex items-center justify-between bg-gray-50 p-2 rounded border">
            <div className="text-sm">
              <strong>Voucher Freeship:</strong>{" "}
              <span>{selectedShippingVoucher.code}</span>
            </div>
            <button
              onClick={() => setSelectedShippingVoucher(null)}
              className="text-red-500 text-xs hover:underline"
            >
              Hủy
            </button>
          </div>
        )}

        {/* Hiển thị voucher giảm giá đơn hàng đã chọn */}
        {selectedOrderVoucher && (
          <div className="mt-2 flex items-center justify-between bg-gray-50 p-2 rounded border">
            <div className="text-sm">
              <strong>Voucher Giảm Giá:</strong>{" "}
              <span>{selectedOrderVoucher.code}</span>
            </div>
            <button
              onClick={() => setSelectedOrderVoucher(null)}
              className="text-red-500 text-xs hover:underline"
            >
              Hủy
            </button>
          </div>
        )}

        {/* Phần “Chi tiết thanh toán” */}
        <div className="border-t pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Tổng tiền hàng</span>
            <span>{formatVND(selectedSubtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tổng tiền phí vận chuyển</span>
            <span>{formatVND(shippingCost)}</span>
          </div>
          <div className="flex justify-between">
            <span>Giảm giá phí vận chuyển</span>
            <span className="text-red-500">
              -{formatVND(shippingDiscount)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Tổng cộng Voucher giảm giá</span>
            <span className="text-red-500">
              -{formatVND(productDiscount)}
            </span>
          </div>
          <div className="flex justify-between text-lg font-bold mt-2">
            <span>Tổng thanh toán</span>
            <span>{formatVND(finalTotal)}</span>
          </div>
        </div>

        <button
          onClick={placeOrder}
          disabled={selectedItems.length === 0}
          className={`w-full py-3 rounded font-semibold ${
            selectedItems.length === 0
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-yellow-500 text-black hover:bg-yellow-600"
          }`}
        >
          ĐẶT HÀNG
        </button>
      </div>

      {/* ========== Voucher Modal ========== */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white w-full max-w-xl rounded-lg shadow-lg overflow-hidden">
            {/* Header Modal */}
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Chọn Voucher</h3>
              <button onClick={() => setIsVoucherModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {/* 1) Input nhập mã voucher + nút Áp dụng */}
              <div>
                <label className="block text-sm font-medium">
                  Nhập mã giảm giá
                </label>
                <div className="mt-2 flex">
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    placeholder="Mã Voucher"
                    className="flex-1 border rounded-l px-3 py-2 focus:outline-none"
                  />
                  <button
                    onClick={applyCodeVoucher}
                    className="bg-black text-white px-4 rounded-r hover:bg-gray-800"
                  >
                    Áp dụng
                  </button>
                </div>
                {errorMessage && (
                  <p className="text-red-500 text-xs mt-1">
                    {errorMessage}
                  </p>
                )}
              </div>

              {/* 2) Danh sách Shipping Vouchers */}
              <div>
                <h4 className="font-medium mb-2">Voucher Freeship</h4>
                {shippingVouchers.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    Không có voucher freeship phù hợp.
                  </p>
                ) : (
                  shippingVouchers.map((v) => (
                    <VoucherCard
                      key={v.id}
                      voucher={v}
                      isSelected={selectedShippingVoucher?.id === v.id}
                      onSelect={(id) => {
                        const picked = shippingVouchers.find(
                          (x) => x.id === id
                        );
                        if (picked) setSelectedShippingVoucher(picked);
                      }}
                    />
                  ))
                )}
              </div>

              {/* 3) Danh sách Order Vouchers */}
              <div>
                <h4 className="font-medium mb-2">
                  Voucher Giảm Giá Đơn Hàng
                </h4>
                {orderVouchers.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    Không có voucher giảm giá đơn hàng phù hợp.
                  </p>
                ) : (
                  orderVouchers.map((v) => (
                    <VoucherCard
                      key={v.id}
                      voucher={v}
                      isSelected={selectedOrderVoucher?.id === v.id}
                      onSelect={(id) => {
                        const picked = orderVouchers.find(
                          (x) => x.id === id
                        );
                        if (picked) setSelectedOrderVoucher(picked);
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex justify-end items-center px-6 py-4 border-t space-x-2">
              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="px-4 py-2 text-sm rounded hover:bg-gray-100"
              >
                TRỞ LẠI
              </button>
              <button
                onClick={applySelectedVoucher}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                ÁP DỤNG
              </button>
            </div>
          </div>
        </div>
      )}
         {/* ========= Address Modal ========= */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white w-full max-w-lg rounded-lg overflow-hidden shadow-lg">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Chọn địa chỉ giao hàng</h3>
              <button onClick={() => setIsAddressModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto">
              <AddressList
                initialSelected={defaultAddress?.id ?? null}
                onSelect={(addr) => {
                  setDefaultAddress(addr);
                  setIsAddressModalOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
