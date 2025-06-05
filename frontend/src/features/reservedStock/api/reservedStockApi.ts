// src/features/reserved_stock/api/reservedStockApi.ts
import { axiosRequest } from '@/lib/axiosRequest';

export interface CartReserveItem {
  variant_id: number;
  quantity: number;
}

export interface ApiResponse<T> {
  status: string;
  message?: string;
  data?: T;
}

export const reservedStockApi = {
  /**
   * Giữ hàng cho các items trong giỏ
   * POST /reserved-stock
   */
  reserve: (items: CartReserveItem[]) =>
    axiosRequest<ApiResponse<null>>(
      'customer/reserved-stock',
      'POST',
      { items }
    ),

  /**
   * Huỷ giữ hàng của user hiện tại
   * DELETE /reserved-stock
   */
  release: () =>
    axiosRequest<ApiResponse<null>>(
      'customer/reserved-stock/release',
      'DELETE'
    ),

  /**
   * Xác nhận giữ hàng cho đơn đã đặt
   * POST /reserved-stock/confirm/{orderId}
   */
  confirm: (orderId: number) =>
    axiosRequest<ApiResponse<null>>(
      `customer/reserved-stock/confirm/${orderId}`,
      'PATCH'
    ),

  /**
   * Lấy số lượng còn bán của một variant
   * GET /reserved-stock/available/{variantId}
   */
  getAvailable: (variantId: number) =>
    axiosRequest<ApiResponse<{ available: number }>>(
      `/reserved-stock/available/${variantId}`
    ),
};
