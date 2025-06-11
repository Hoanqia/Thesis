// frontend/src/features/wishlists/api/wishlistApi.ts
import { Method, AxiosRequestConfig } from 'axios';
import { axiosRequest } from '@/lib/axiosRequest';

export interface SpecOption {
  id: number;
  value: string;
}

export interface Specification {
  id: number;
  name: string;
}

export interface VariantSpecValue {
  id: number;
  variant_id: number;
  specification: Specification;
  spec_options?: SpecOption;
  value_int?: number;
  value_text?: string;
}

export interface Product {
  id: number;
  name: string;
}

export interface Variant {
  id: number;
  product_id: number;
  price: number;
  stock: number;
  image: string;
  full_name: string;
  image_url: string;
  product: Product;
  // reflect API's snake-case field
  variant_spec_values: VariantSpecValue[];
}

export interface WishlistItem {
  id: number;
  user_id: number;
  variant_id: number;
  variant: Variant;
}

interface ApiResponse<T> {
  message: string;
  status: 'success' | 'error';
  data?: T;
}

export const wishlistApi = {

   createWishlist: async (
    variantId: number,
    userId?: number
  ): Promise<WishlistItem> => {
    // Chuẩn bị payload
    const payload: Record<string, any> = { variant_id: variantId };
    if (userId) {
      payload.user_id = userId;
    }

    // Gọi POST lên endpoint /wishlists (hoặc /customer/wishlists tuỳ route của bạn)
    const res = await axiosRequest<ApiResponse<WishlistItem>>(
      'customer/wishlists',               // hoặc '/customer/wishlists'
      'POST' as Method,
      payload as Record<string, any>,
    );

    if (res.status === 'error' || !res.data) {
      throw new Error(res.message || 'Failed to add to wishlist');
    }

    return res.data;
  },

  fetchWishlist: async (userId?: number): Promise<WishlistItem[]> => {
    const params = userId ? { user_id: userId } : {};
    const res = await axiosRequest<ApiResponse<WishlistItem[]>>(
      '/customer/wishlists',
      'GET' as Method,
      undefined,
      { params } as AxiosRequestConfig
    );
    return res.data ?? [];
  },
  deleteWishlistItem: async (wishlistId: number): Promise<boolean> => {
    const res = await axiosRequest<ApiResponse<null>>(
      `/customer/wishlists/${wishlistId}`,
      'DELETE' as Method
    );
    return res.status === 'success';
  },
  addWishlistItemToCart: async (wishlistId: number): Promise<any> => {
    const res = await axiosRequest<ApiResponse<any>>(
      `/customer/wishlists/${wishlistId}`,
      'POST' as Method
    );
    return res.data;
  },
  addAllWishlistToCart: async (): Promise<any[]> => {
    const res = await axiosRequest<ApiResponse<any[]>>(
      '/customer/wishlists/add-all-to-cart',
      'POST' as Method
    );
    return res.data ?? [];
  },
};
