// src/stores/productStore.ts
import { create } from 'zustand';
import { Product } from '@/features/products/api/productApi';
import { Variant } from '@/features/variants/api/variantApi';

interface ProductState {
  products: Product[];
  productVariants: Record<number, Variant[]>; // Maps product ID to its variants
  lastFetchedCategorySlug: string | null; // Stores the slug of the last fetched category
  lastFetchedTimestamp: number | null; // <<<< THÊM DÒNG NÀY: Thời gian (timestamp) cuối cùng fetch dữ liệu
  
  setProducts: (products: Product[]) => void;
  setProductVariants: (productVariants: Record<number, Variant[]>) => void;
  setLastFetchedCategorySlug: (slug: string | null) => void;
  setLastFetchedTimestamp: (timestamp: number | null) => void; // <<<< THÊM DÒNG NÀY
  
  clearProductData: () => void;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  productVariants: {},
  lastFetchedCategorySlug: null,
  lastFetchedTimestamp: null, // Khởi tạo null
  
  setProducts: (products) => set({ products }),
  setProductVariants: (productVariants) => set({ productVariants }),
  setLastFetchedCategorySlug: (slug) => set({ lastFetchedCategorySlug: slug }),
  setLastFetchedTimestamp: (timestamp) => set({ lastFetchedTimestamp: timestamp }), // Setter mới
  
  clearProductData: () => set({ 
    products: [], 
    productVariants: {}, 
    lastFetchedCategorySlug: null,
    lastFetchedTimestamp: null // Reset timestamp khi xóa dữ liệu
  }),
}));