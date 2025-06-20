// frontend/src/lib/grnApi.ts
import { axiosRequest } from '@/lib/axiosRequest';
import { PurchaseOrder, PurchaseOrderItem } from '@/features/purchase_orders/api/purchaseOrderApi';

export interface User {
  id: number;
  name: string;
  email: string;
}



/**
 * Định nghĩa từng dòng GRN Item
 */
export interface GrnItem {
  id: number;
  purchase_order_item_id: number;
  quantity: number;
  unit_cost: number;
  subtotal: number;
  purchase_order_item: PurchaseOrderItem ; 
}

/**
 * Định nghĩa GRN
 */
export interface Grn {
  id: number;
  user_id: number;
  purchase_order_id: number;
  type: 'purchase' ;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  user: User;
  items: GrnItem[];
  purchase_order: PurchaseOrder;
}

/**
 * Payload khi tạo GRN mới
 */
export interface GrnCreatePayload {
  purchase_order_id: number; 
  notes?: string | null; 
  items: Array<{
    purchase_order_item_id: number; 
    quantity: number; 
    unit_cost?: number; 
  }>;
}

// Đường dẫn API theo cấu hình routes và axios baseURL
const BASE = '/admin/grns';

/**
 * ApiResponse wrapper
 */
interface ApiResponse<T> {
  message: string;
  status: 'success' | 'error';
  data: T;
}

/** Lấy danh sách GRNs */
export async function fetchGrns(): Promise<Grn[]> {
  const res = await axiosRequest<ApiResponse<Grn[]>>(BASE, 'GET');
  return res.data;
}

/** Lấy chi tiết GRN */
export async function fetchGrnById(id: number): Promise<Grn> {
  const res = await axiosRequest<ApiResponse<Grn>>(`${BASE}/${id}`, 'GET');
  return res.data;
}

/** Tạo GRN mới */
export async function createGrn(
  payload: GrnCreatePayload
): Promise<Grn> {
  const res = await axiosRequest<ApiResponse<Grn>>(BASE, 'POST', payload);
  return res.data;
}

/** Xóa GRN */
export async function deleteGrn(id: number): Promise<void> {
  await axiosRequest<void>(`${BASE}/${id}`, 'DELETE');
}

/** Hủy GRN */
export async function cancelGrn(id: number): Promise<Grn> {
  const res = await axiosRequest<ApiResponse<Grn>>(
    `${BASE}/${id}/cancel`,
    'PATCH'
  );
  return res.data;
}


export interface GrnConfirmPayload {
  items: Array<{
    id: number; // ID của GrnItem (tức là item.id từ frontend)
    quantity: number;
  }>;
}
export async function confirmGrn(id: number, payload: GrnConfirmPayload): Promise<Grn> {
  const res = await axiosRequest<ApiResponse<Grn>>(
    `${BASE}/${id}/confirm`,
    'PATCH', // Giữ nguyên PATCH hoặc thay đổi tùy theo API backend của bạn
    payload // Truyền payload mới vào body của request
  );
  return res.data;
}

