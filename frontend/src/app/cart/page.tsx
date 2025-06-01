"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { CartItemApi } from '@/features/cart/api/cartApi';

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    totalPrice,      // Lấy totalPrice từ store (tuy nhiên, summary sẽ dùng selectedItems)
    fetchCart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    getTotalItems,
  } = useCartStore();

  // State để theo dõi các item được chọn
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const formatVND = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  // Lọc ra những item được chọn (checkbox)
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));

  // Tính tổng số lượng và tổng giá tiền chỉ cho selectedItems
  const selectedCount = selectedItems.reduce((sum, i) => sum + i.quantity, 0);
  const selectedSubtotal = selectedItems.reduce(
    (sum, i) => sum + i.price_at_time * i.quantity,
    0
  );

  // Các thiết lập phí ship, ngưỡng freeship... tùy giữ nguyên, nhưng tính trên selectedSubtotal
  const shippingCost = 50000;
  const freeShipThreshold = 1000000;
  const shippingDiscount = selectedSubtotal >= freeShipThreshold ? shippingCost : 0;
  const estimatedTotal = selectedSubtotal + shippingCost - shippingDiscount;

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
              onClick={() => router.push('/products')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Mua sắm ngay
            </button>
          </div>
        ) : (
          items.map((item: CartItemApi) => (
            <div key={item.id} className="flex items-center border rounded-lg p-4">
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => toggleSelect(item.id)}
                className="w-5 h-5 mr-4 flex-shrink-0"
              />

              {/* Ảnh sản phẩm */}
              <img
                src={item.variant.img?.trim() || '/placeholder.png'}
                alt={item.variant.product.name}
                className="w-24 h-24 object-cover rounded flex-shrink-0"
              />

              <div className="flex-1 ml-4 flex flex-col md:flex-row md:items-center">
                {/* Tên sản phẩm */}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {item.variant.product.name}
                  </h3>
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

                {/* Giá tiền của item (giá tại thời điểm ở backend) */}
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

      {/* ========== Summary (chỉ của item được chọn) ========== */}
      <div className="bg-white border rounded-lg p-6 space-y-6 shadow">
        <div>
          <label className="block text-sm font-medium">Nhập mã giảm giá</label>
          <div className="mt-2 flex">
            <input
              type="text"
              placeholder="Mã giảm giá"
              className="flex-1 border rounded-l px-3 py-2 focus:outline-none"
            />
            <button className="bg-black text-white px-4 rounded-r hover:bg-gray-800">
              Áp dụng
            </button>
          </div>
        </div>

        <div className="border-t pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Số lượng</span>
            <span>{selectedCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatVND(selectedSubtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Phí vận chuyển</span>
            <span>{formatVND(shippingCost)}</span>
          </div>
          <div className="flex justify-between">
            <span>Giảm phí ship</span>
            <span className="text-red-500">-{formatVND(shippingDiscount)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold mt-2">
            <span>Tổng dự kiến</span>
            <span>{formatVND(estimatedTotal)}</span>
          </div>
        </div>

        <button
          onClick={() => router.push('/checkout')}
          disabled={selectedItems.length === 0} // Disable nếu chưa chọn item nào
          className={`w-full py-3 rounded font-semibold ${
            selectedItems.length === 0
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-yellow-500 text-black hover:bg-yellow-600'
          }`}
        >
          ĐẶT HÀNG
        </button>
      </div>
    </div>
  );
}


// // app/cart/page.tsx
// "use client";

// import { useRouter } from 'next/navigation';
// import { useEffect, useState } from 'react';
// import { cartApi, CartItemApi } from '@/features/cart/api/cartApi';
// import { X } from 'lucide-react';

// export default function CartPage() {
//   const router = useRouter();
//   const [items, setItems] = useState<CartItemApi[]>([]);
//   const [subtotal, setSubtotal] = useState<number>(0);
//   const [loading, setLoading] = useState(true);
//   const [btnDisabled, setBtnDisabled] = useState(false);

//   // VND formatter
//   const formatVND = (value: number) =>
//     new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

//   // Shipping config
//   const shippingCost = 50000;
//   const freeShipThreshold = 1000000;
//   const shippingDiscount = subtotal >= freeShipThreshold ? shippingCost : 0;
//   const estimatedTotal = subtotal + shippingCost - shippingDiscount;

//   // Selection state
//   const [selectedIds, setSelectedIds] = useState<number[]>([]);
//   const allSelected = items.length > 0 && selectedIds.length === items.length;

//   // Fetch cart
//   const fetchCart = async () => {
//     setLoading(true);
//     try {
//       const res = await cartApi.getCart();
//       setItems(res.cart.cart_items);
//       setSubtotal(res.total_price);
//       setSelectedIds([]);
//     } catch (error) {
//       console.error('Fetch cart error', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { fetchCart(); }, []);

//   // Quantity change
//   const handleQuantityChange = async (itemId: number, delta: number) => {
//     const item = items.find(i => i.id === itemId);
//     if (!item) return;
//     const newQty = item.quantity + delta;
//     if (newQty < 1) return;
//     setBtnDisabled(true);
//     await cartApi.updateItemQuantity(itemId, newQty);
//     await fetchCart();
//     setTimeout(() => setBtnDisabled(false), 500);
//   };

//   // Remove single
//   const handleRemove = async (itemId: number) => {
//     setBtnDisabled(true);
//     await cartApi.removeItem(itemId);
//     await fetchCart();
//     setTimeout(() => setBtnDisabled(false), 500);
//   };

//   // Clear all
//   const handleClear = async () => {
//     setBtnDisabled(true);
//     await cartApi.clearCart();
//     await fetchCart();
//     setTimeout(() => setBtnDisabled(false), 500);
//   };

//   // Selection toggles
//   const toggleSelect = (id: number) => setSelectedIds(prev =>
//     prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
//   );
//   const toggleSelectAll = () => setSelectedIds(allSelected ? [] : items.map(i => i.id));

//   if (loading) return <div className="p-6 text-center">Đang tải giỏ hàng…</div>;

//   return (
//     <div className="container mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
//       {/* Cart items */}
//       <div className="lg:col-span-2 space-y-6">
//         <div className="flex justify-between items-center">
//           <h1 className="text-2xl font-bold">Giỏ hàng của bạn</h1>
//           {items.length > 0 && (
//             <input
//               type="checkbox"
//               checked={allSelected}
//               onChange={toggleSelectAll}
//               className="w-5 h-5"
//             />
//           )}
//         </div>

//         {items.length === 0 ? (
//           <div className="border rounded-lg p-6 text-center">
//             <p className="mb-4">Giỏ hàng đang trống.</p>
//             <button
//               onClick={() => router.push('/products')}
//               className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
//             >Mua sắm ngay</button>
//           </div>
//         ) : (
//           <>
//             {items.map(item => (
//               <div key={item.id} className="flex items-center border rounded-lg p-4">
//                 <input
//                   type="checkbox"
//                   checked={selectedIds.includes(item.id)}
//                   onChange={() => toggleSelect(item.id)}
//                   className="w-5 h-5 mr-4 flex-shrink-0"
//                 />
//                 {item.variant.img ? (
//                   <img
//                     src={item.variant.img}
//                     alt={item.variant.product.name}
//                     className="w-24 h-24 object-cover rounded flex-shrink-0"
//                   />
//                 ) : (
//                   <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
//                     <span className="text-gray-400">No Image</span>
//                   </div>
//                 )}
//                 <div className="flex-1 ml-4 flex flex-col md:flex-row md:items-center">
//                   <div className="flex-1">
//                     <h3 className="font-semibold text-lg">{item.variant.product.name}</h3>
//                     <p className="text-sm text-gray-500">Variant ID: {item.variant_id}</p>
//                   </div>
//                   <div className="mt-4 md:mt-0 md:ml-4 flex items-center">
//                     <button
//                       onClick={() => handleQuantityChange(item.id, -1)}
//                       disabled={btnDisabled}
//                       className="px-2 py-1 bg-gray-200 rounded-l hover:bg-gray-300"
//                     >-</button>
//                     <span className="border-t border-b px-4 py-1">{item.quantity}</span>
//                     <button
//                       onClick={() => handleQuantityChange(item.id, 1)}
//                       disabled={btnDisabled}
//                       className="px-2 py-1 bg-gray-200 rounded-r hover:bg-gray-300"
//                     >+</button>
//                   </div>
//                   <button
//                     onClick={() => handleRemove(item.id)}
//                     disabled={btnDisabled}
//                     className="ml-4 p-1 hover:bg-gray-100 rounded"
//                     aria-label="Remove item"
//                   ><X size={20} /></button>
//                   <div className="ml-auto font-semibold">
//                     {formatVND(item.price_at_time * item.quantity)}
//                   </div>
//                 </div>
//               </div>
//             ))}
//             <button
//               onClick={handleClear}
//               disabled={btnDisabled}
//               className="mt-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
//             >Xóa toàn bộ</button>
//           </>
//         )}
//       </div>

//       {/* Summary */}
//       <div className="bg-white border rounded-lg p-6 space-y-6 shadow">
//         <div>
//           <label className="block text-sm font-medium">Nhập mã giảm giá</label>
//           <div className="mt-2 flex">
//             <input
//               type="text"
//               placeholder="Mã giảm giá"
//               className="flex-1 border rounded-l px-3 py-2 focus:outline-none"
//             />
//             <button className="bg-black text-white px-4 rounded-r hover:bg-gray-800">Áp dụng</button>
//           </div>
//         </div>
//         <div className="border-t pt-4 space-y-2 text-sm">
//           <div className="flex justify-between"><span>Subtotal</span><span>{formatVND(subtotal)}</span></div>
//           <div className="flex justify-between"><span>Phí vận chuyển</span><span>{formatVND(shippingCost)}</span></div>
//           <div className="flex justify-between"><span>Giảm phí ship</span><span className="text-red-500">-{formatVND(shippingDiscount)}</span></div>
//           <div className="flex justify-between text-lg font-bold mt-2"><span>Tổng dự kiến</span><span>{formatVND(estimatedTotal)}</span></div>
//         </div>
//         <button
//           onClick={() => router.push('/checkout')}
//           disabled={items.length === 0 || btnDisabled}
//           className={`w-full py-3 rounded font-semibold ${
//             items.length === 0 ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-yellow-500 text-black hover:bg-yellow-600'
//           }`}
//         >ĐẶT HÀNG</button>
//       </div>
//     </div>
//   );
// }
