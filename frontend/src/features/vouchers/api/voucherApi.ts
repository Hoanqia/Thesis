import { axiosRequest } from '@/lib/axiosRequest';

export interface Voucher {
  id: number;
  code: string;
  type: 'product_discount' | 'shipping_discount';
  discount_percent: number | null;
  minimum_order_amount: number | null;
  start_date: string;    // ISO string
  end_date: string;      // ISO string
  max_uses: number | null;
  used_count: number;
  status: number;        // 0 = inactive, 1 = active
}

// Payload cho tạo mới voucher
export interface CreateVoucherPayload {
  code: string;
  type: 'product_discount' | 'shipping_discount';
  discount_percent?: number;
  minimum_order_amount?: number;
  start_date: string;
  end_date: string;
  max_uses?: number;
  status?: number;
}

// Payload cho cập nhật voucher
export type UpdateVoucherPayload = Partial<CreateVoucherPayload>;

export const voucherApi = {
  // Lấy danh sách tất cả voucher
  fetchAll: (): Promise<Voucher[]> =>
    axiosRequest<{ message: string; status: string; data: Voucher[] }>(
      `/vouchers`,
      'GET'
    ).then(res => res.data),

  // Lấy chi tiết voucher theo ID
  fetchById: (id: number): Promise<Voucher> =>
    axiosRequest<{ message: string; status: string; data: Voucher }>(
      `/vouchers/${id}`,
      'GET'
    ).then(res => res.data),

  // Tạo mới voucher
  create: (payload: CreateVoucherPayload): Promise<Voucher> => 
    axiosRequest<{ message: string; status: string; data: Voucher }>(
      `admin/vouchers`,
      'POST',
      payload
    ).then(res => res.data),

  // Cập nhật voucher theo ID
  update: (id: number, payload: UpdateVoucherPayload): Promise<Voucher> =>
    axiosRequest<{ message: string; status: string; data: Voucher }>(
      `admin/vouchers/${id}`,
      'PATCH',
      payload
    ).then(res => res.data),

  // Xoá voucher theo ID
  remove: (id: number): Promise<void> =>
    axiosRequest<{ message: string; status: string }>(
      `admin/vouchers/${id}`,
      'DELETE'
    ).then(() => {}),

  // Kiểm tra voucher có hợp lệ không (tùy theo đơn hàng)
  validate: (code: string, orderAmount: number): Promise<Voucher> =>
    axiosRequest<{ message: string; status: string; data: Voucher }>(
      `/vouchers/validate`,
      'POST',
      {
        code,
        order_amount: orderAmount,
      }
    ).then(res => res.data),
};
