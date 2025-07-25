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
  img?: string | null;
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
  status: 'pending' | 'shipping' | 'completed' | 'canceled' | 'confirmed';
  payment_method: 'cod' | 'bank_transfer';
  is_paid: boolean;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
    hasReviewed: boolean;

}


/**
 * Định nghĩa cấu trúc phản hồi API chung
 */
interface ApiResponse<T> {
  message: string;
  status: 'success' | 'error';
  data: T;
  // Add pagination specific fields for paginated responses
  pagination?: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    prev_page_url: string | null;
    next_page_url: string | null;
    // links?: any[]; // Optionally include if needed, but prev/next URLs are often sufficient
  };
}
export interface PaginationParams {
  page?: number;
  per_page?: number;
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
      'customer/orders',
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
      `customer/orders/${orderId}/cancel`,
      'PATCH'
    );
    return response.data;
  },

  /**
   * Xác nhận đã nhận hàng (chỉ áp dụng khi status là 'shipping')
   */
  confirmReceived: async (orderId: number): Promise<Order> => {
    const response = await axiosRequest<ApiResponse<Order>>(
      `customer/orders/${orderId}/confirm`,
      'PATCH'
    );
    return response.data;
  },
  rateMultipleItems: async (orderId: number): Promise<Order> => {
    const response = await axiosRequest<ApiResponse<Order>>(
      `customer/orders/${orderId}/confirm`,
      'PATCH'
    );
    return response.data;
  },
};

export const adminOrderApi = {
 getAllOrders: async (params?: PaginationParams): Promise<ApiResponse<Order[]>> => {
    let url = 'admin/orders';
    const queryParams = new URLSearchParams();

    if (params?.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.per_page) {
      queryParams.append('per_page', params.per_page.toString());
    }

    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }

    const response = await axiosRequest<ApiResponse<Order[]>>(
      url,
      'GET'
    );
    return response; // Return the entire response including pagination metadata
  },
  /**
   * Lấy chi tiết một đơn hàng theo ID
   * GET /admin/orders/{id}
   */
  getOrderById: async (orderId: number): Promise<Order> => {
    const response = await axiosRequest<ApiResponse<Order>>(
      `admin/orders/${orderId}`,
      'GET'
    );
    return response.data;
  },

  /**
   * Xác nhận đơn hàng (từ pending => confirmed)
   * POST /admin/orders/{id}/confirm
   */
  confirmOrder: async (orderId: number): Promise<Order> => {
    const response = await axiosRequest<ApiResponse<Order>>(
      `admin/orders/${orderId}/confirm`,
      'PATCH'
    );
    return response.data;
  },

  /**
   * Cập nhật trạng thái đơn hàng
   * PUT /admin/orders/{id}/status
   * body: { status: 'pending' | 'confirmed' | 'shipping' | 'completed' | 'canceled' }
   */
  updateOrderStatus: async (
    orderId: number,
    newStatus: 'pending' | 'confirmed' | 'shipping' | 'completed' | 'canceled'
  ): Promise<Order> => {
    const payload = { status: newStatus };
    const response = await axiosRequest<ApiResponse<Order>>(
      `admin/orders/${orderId}/status`,
      'PATCH',
      payload
    );
    return response.data;
  },

  /**
   * Đánh dấu đơn hàng đã thanh toán
   * PUT /admin/orders/{id}/paid
   */
  markAsPaid: async (orderId: number): Promise<Order> => {
    const response = await axiosRequest<ApiResponse<Order>>(
      `admin/orders/${orderId}/paid`,
      'PATCH'
    );
    return response.data;
  },

  /**
   * Xóa đơn hàng
   * DELETE /admin/orders/{id}
   */
  deleteOrder: async (orderId: number): Promise<void> => {
    await axiosRequest<ApiResponse<null>>(
      `admin/orders/${orderId}`,
      'DELETE'
    );
  },
};