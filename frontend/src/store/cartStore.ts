// src/store/cartStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { cartApi, CartItemApi } from '@/features/cart/api/cartApi';

interface CartState {
  items: CartItemApi[];
  totalPrice: number;
  fetchCart: () => Promise<void>;
  addItem: (variantId: number, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: number, delta: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  devtools((set, get) => ({
    items: [],
    totalPrice: 0,

    fetchCart: async () => {
      try {
        const res = await cartApi.getCart();
        set({ items: res.cart.cart_items, totalPrice: res.total_price });
      } catch (error) {
        console.error('fetchCart error:', error);
      }
    },

    addItem: async (variantId, quantity = 1) => {
      try {
        const res = await cartApi.addToCart(variantId, quantity);
        if (res.status === 'error') throw new Error(res.message);
        await get().fetchCart();
      } catch (error) {
        console.error('addItem error:', error);
      }
    },

    updateQuantity: async (itemId, delta) => {
      const item = get().items.find(i => i.id === itemId);
      if (!item) return;
      const newQty = Math.max(1, item.quantity + delta);

      try {
        const res = await cartApi.updateItemQuantity(itemId, newQty);
        if (res.status === 'error') throw new Error(res.message);
        await get().fetchCart();
      } catch (error) {
        console.error('updateQuantity error:', error);
      }
    },

    removeItem: async (itemId) => {
      try {
        const res = await cartApi.removeItem(itemId);
        if (res.status === 'error') throw new Error(res.message);
        await get().fetchCart();
      } catch (error) {
        console.error('removeItem error:', error);
      }
    },

    clearCart: async () => {
      try {
        const res = await cartApi.clearCart();
        if (res.status === 'error') throw new Error(res.message);
        await get().fetchCart();
      } catch (error) {
        console.error('clearCart error:', error);
      }
    },

    getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
  }))
);

// // src/store/cartStore.ts

// import { create } from 'zustand';
// import { devtools } from 'zustand/middleware';
// import { cartApi, CartItemApi } from '@/features/cart/api/cartApi';

// export interface CartItem {
//   id: number;           // = cart_items.id
//   variantId: number;    // = CartItemApi.variant_id
//   name: string;
//   price: number;
//   quantity: number;
// }

// interface CartState {
//   items: CartItem[];
//   fetchCart: () => Promise<void>;
//   addItem: (variantId: number, quantity?: number) => Promise<void>;
//   updateQuantity: (itemId: number, quantity: number) => Promise<void>;
//   removeItem: (itemId: number) => Promise<void>;
//   clearCart: () => Promise<void>;
//   getTotalItems: () => number;
//   getTotalPrice: () => number;
// }

// export const useCartStore = create<CartState>()(
//   devtools((set, get) => ({
//     items: [],

//     // 1. Load giỏ hàng từ backend
//     fetchCart: async () => {
//       try {
//         const res = await cartApi.getCart();
//         // Map CartItemApi → CartItem
//         const mapped: CartItem[] = res.cart.cart_items.map((it: CartItemApi) => ({
//           id: it.id,
//           variantId: it.variant_id,
//           name: it.variant.product.name,
//           price: it.price_at_time,
//           quantity: it.quantity,
//         }));
//         set({ items: mapped });
//       } catch (error) {
//         console.error('fetchCart error:', error);
//       }
//     },

//     // 2. Thêm item: gọi API rồi fetchCart để đồng bộ state
//     addItem: async (variantId, quantity = 1) => {
//       try {
//         const res = await cartApi.addToCart(variantId, quantity);
//         if (res.status === 'error') {
//           console.warn('addItem error:', res.message);
//           return;
//         }
//         // Sau khi add thành công, load lại giỏ hàng
//         await get().fetchCart();
//       } catch (error) {
//         console.error('addItem exception:', error);
//       }
//     },

//     // 3. Cập nhật số lượng item
//     updateQuantity: async (itemId, quantity) => {
//       try {
//         const res = await cartApi.updateItemQuantity(itemId, quantity);
//         if (res.status === 'error') {
//           console.warn('updateQuantity error:', res.message);
//           return;
//         }
//         // Cập nhật tức thì trong local state (không bắt buộc fetch lại toàn bộ, nhưng nếu muốn chính xác nhất, có thể fetchCart)
//         set((state) => ({
//           items: state.items.map((i) =>
//             i.id === itemId ? { ...i, quantity: quantity < 1 ? 1 : quantity } : i
//           ),
//         }));
//       } catch (error) {
//         console.error('updateQuantity exception:', error);
//       }
//     },

//     // 4. Xóa một item
//     removeItem: async (itemId) => {
//       try {
//         const res = await cartApi.removeItem(itemId);
//         if (res.status === 'error') {
//           console.warn('removeItem error:', res.message);
//           return;
//         }
//         set((state) => ({
//           items: state.items.filter((i) => i.id !== itemId),
//         }));
//       } catch (error) {
//         console.error('removeItem exception:', error);
//       }
//     },

//     // 5. Xóa toàn bộ giỏ hàng
//     clearCart: async () => {
//       try {
//         const res = await cartApi.clearCart();
//         if (res.status === 'error') {
//           console.warn('clearCart error:', res.message);
//           return;
//         }
//         set({ items: [] });
//       } catch (error) {
//         console.error('clearCart exception:', error);
//       }
//     },

//     // Helpers
//     getTotalItems: () => {
//       return get().items.reduce((sum, i) => sum + i.quantity, 0);
//     },
//     getTotalPrice: () => {
//       return get().items.reduce((sum, i) => sum + i.quantity * i.price, 0);
//     },
//   }))
// );
