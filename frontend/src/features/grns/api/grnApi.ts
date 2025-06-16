// frontend/src/lib/grnApi.ts
import { axiosRequest } from '@/lib/axiosRequest';

/**
 * Định nghĩa Variant trả về từ API
 */
export interface Variant {
  id: number;
  sku: string;
  price: number;
  discount: number;
  stock: number;
  full_name: string;
  image_url: string | null;
}

/**
 * Định nghĩa Supplier
 */
export interface Supplier {
  id: number;
  name: string;
  phone: string;
  address: string;
}

/**
 * Định nghĩa User (người tạo phiếu)
 */
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
  variant_id: number;
  ordered_quantity: number;
  unit_cost: number;
  subtotal: number;
  received_quantity: number;
  variant: Variant;
}

/**
 * Định nghĩa GRN
 */
export interface Grn {
  id: number;
  code: string;
  type: 'purchase' | 'return';
  expected_delivery_date: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  supplier: Supplier;
  user: User;
  items: GrnItem[];
}

/**
 * Payload khi tạo GRN mới
 */
export interface GrnCreatePayload {
  type: 'purchase' | 'return';
  expected_delivery_date: string;
  supplier_id: number;
  notes: string | null;
  items: Array<{
    variant_id: number;
    ordered_quantity: number;
    unit_cost: number;
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
    received_quantity: number;
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
// /** Xác nhận GRN */
// export async function confirmGrn(id: number): Promise<Grn> {
//   const res = await axiosRequest<ApiResponse<Grn>>(
//     `${BASE}/${id}/confirm`,
//     'PATCH'
//   );
//   return res.data;
// }
