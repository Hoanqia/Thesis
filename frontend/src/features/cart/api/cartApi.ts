// cartApi.ts

import { axiosRequest } from '@/lib/axiosRequest';

export interface CartItemApi {
  id: number;               
  cart_id: number;
  variant_id: number;
  quantity: number;
  price_at_time: number;
  status?: number;
  expires_at: string | null;
  variant: {
    id: number;
    product: {
      id: number;
      name: string;
    };
    image?: string;  // đường dẫn relative
    img?: string;    // URL đầy đủ do backend gắn
  };
}

export interface CartApiData {
  id: number;
  user_id: number;
  cart_items: CartItemApi[];
}

export interface GetCartApiResponse {
  message: string;
  status: 'success' | 'error';
  data: CartApiData;     
  total_price: number;
}

export interface AddItemPayload {
  variant_id: number;
  quantity: number;
}

export interface UpdateQuantityPayload {
  quantity: number;
}

interface BasicApiResponse {
  message: string;
  status: 'success' | 'error';
}

const baseUrl = "/customer"
export const cartApi = {
  
  getCart: async (): Promise<{
    cart: CartApiData;
    total_price: number;
    message: string;
  }> => {
    const res = await axiosRequest<GetCartApiResponse>(`${baseUrl}/cart`, 'GET');
    return {
      cart: res.data,
      total_price: res.total_price,
      message: res.message,
    };
  },

  
  addToCart: async (
    variantId: number,
    quantity: number
  ): Promise<BasicApiResponse> => {
    const payload: AddItemPayload = {
      variant_id: variantId,
      quantity,
    };
    const res = await axiosRequest<BasicApiResponse>(
      `${baseUrl}/cart`,
      'POST',
      payload
    );
    return res;
  },

  updateItemQuantity: async (
    itemId: number,
    newQuantity: number
  ): Promise<BasicApiResponse> => {
    const payload: UpdateQuantityPayload = {
      quantity: newQuantity,
    };
    const res = await axiosRequest<BasicApiResponse>(
      `${baseUrl}/cart/${itemId}`,
      'PATCH',
      payload
    );
    return res;
  },

 
  removeItem: async (itemId: number): Promise<BasicApiResponse> => {
    const res = await axiosRequest<BasicApiResponse>(
      `${baseUrl}/cart/${itemId}`,
      'DELETE'
    );
    return res;
  },

  
  clearCart: async (): Promise<BasicApiResponse> => {
    const res = await axiosRequest<BasicApiResponse>(
      `${baseUrl}/cart`,
      'DELETE'
    );
    return res;
  },
};
