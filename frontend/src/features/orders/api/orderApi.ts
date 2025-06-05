// customerOrderApi.ts

import { axiosRequest } from '@/lib/axiosRequest'; // đường dẫn tương đối tới file axiosRequest.ts

/**
 * Định nghĩa payload khi tạo đơn hàng
 */
interface CreatePaymentResponse {
  paymentUrl: string;
}
interface CreatePaymentParams {
  orderId: number;
  bankCode?: string;
  language?: 'vn' | 'en';
  description?: string;
}


export interface CreateOrderPayload {
  shipping_id: number;
  payment_method: 'cod' | 'bank_transfer';
  address_id?: number;
  product_voucher_id?: number;
  shipping_voucher_id?: number;
  items: {
    variant_id: number;
    quantity: number;
    price_at_time: number;
  }[];
}

/**
 * Định nghĩa OrderItem (tương ứng với OrderItem model)
 */
export interface OrderItem {
  id: number;
  order_id: number;
  variant_id: number;
  variant_name: string;
  price: number;
  quantity: number;
  created_at: string;
  updated_at: string;
}

/**
 * Định nghĩa Order (tương ứng với Order model + quan hệ orderItems)
 */
export interface Order {
  id: number;
  user_id: number;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  province: string;
  district: string;
  ward: string;
  shipping_id: number | null;
  shipping_fee: number;
  total_price: number;
  product_voucher_id: number | null;
  shipping_voucher_id: number | null;
  discount_on_products: number;
  discount_on_shipping: number;
  status: 'pending' | 'shipping' | 'completed' | 'canceled';
  payment_method: 'cod' | 'bank_transfer';
  is_paid: boolean;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
}


/**
 * Định nghĩa cấu trúc phản hồi API chung
 */
interface ApiResponse<T> {
  message: string;
  status: 'success' | 'error';
  data: T;
}

export const customerOrderApi = {

   createPayment: async (
    params: CreatePaymentParams
  ): Promise<ApiResponse<CreatePaymentResponse>> => {
    return axiosRequest<ApiResponse<CreatePaymentResponse>>(
      'customer/vnpay/create-payment',
      'POST',
      params
    );
  },
  /**
   * Tạo đơn hàng mới từ giỏ hàng
   */
  createOrder: async (payload: CreateOrderPayload): Promise<Order> => {
    const response = await axiosRequest<ApiResponse<Order>>(
      'customer/orders',
      'POST',
      payload
    );
    return response.data;
  },

  /**
   * Lấy tất cả đơn hàng của người dùng hiện tại
   */
  getUserOrders: async (): Promise<Order[]> => {
    const response = await axiosRequest<ApiResponse<Order[]>>(
      'orders',
      'GET'
    );
    return response.data;
  },

  /**
   * Lấy chi tiết một đơn hàng theo ID
   */
  getOrderDetails: async (orderId: number): Promise<Order> => {
    const response = await axiosRequest<ApiResponse<Order>>(
      `customer/orders/${orderId}`,
      'GET'
    );
    return response.data;
  },

  /**
   * Hủy đơn hàng (chỉ áp dụng khi status là 'pending' hoặc 'shipping')
   */
  cancelOrder: async (orderId: number): Promise<Order> => {
    const response = await axiosRequest<ApiResponse<Order>>(
      `orders/${orderId}/cancel`,
      'POST'
    );
    return response.data;
  },

  /**
   * Xác nhận đã nhận hàng (chỉ áp dụng khi status là 'shipping')
   */
  confirmReceived: async (orderId: number): Promise<Order> => {
    const response = await axiosRequest<ApiResponse<Order>>(
      `orders/${orderId}/confirm`,
      'POST'
    );
    return response.data;
  },
};
