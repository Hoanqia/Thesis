// src/api/supplierApi.ts

import { axiosRequest } from '@/lib/axiosRequest';
import type { Method } from 'axios';
import { Variant } from '@/features/variants/api/variantApi';
export interface Supplier {
  id: number;
  name: string;
  phone: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}



export interface VariantFromSupplier {
  id: number;
  supplier_id: number;
  variant_id: number;
  variant_supplier_sku?: string | null; 
  current_purchase_price: number;
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
  
  supplier?: Supplier; 
  variant?: Variant; 
}


export interface ApiResponse<T> {
  message: string;
  status: 'success' | 'error';
  data?: T;
}


export interface AddVariantToSupplierPayload {
  variant_id: number;
  variant_supplier_sku?: string | null;
  current_purchase_price: number;
  is_active?: boolean;
}
// Interface mới để nhận dữ liệu từ frontend cho việc lưu nhiều biến thể
export interface SaveMultipleVariantPayloadItem {
  id?: number; // ID của mối quan hệ supplier-variant. Có nếu là update, không có nếu là create.
  variant_id: number; // ID của biến thể sản phẩm (bắt buộc)
  current_purchase_price: number; // Giá mua hiện tại (bắt buộc)
  variant_supplier_sku?: string | null; // SKU của nhà cung cấp cho biến thể (tùy chọn)
  is_active?: boolean; // Trạng thái hoạt động (tùy chọn)
}


const RESOURCE = 'admin/suppliers';

export const supplierApi = {
  getAll: async (): Promise<Supplier[]> => {
    const res = await axiosRequest<ApiResponse<Supplier[]>>(RESOURCE, 'GET');
    return res.data || [];
  },

  getById: async (id: number): Promise<Supplier> => {
    const res = await axiosRequest<ApiResponse<Supplier>>(`${RESOURCE}/${id}`, 'GET');
    if (!res.data) throw new Error(res.message);
    return res.data;
  },

  create: async (
    payload: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Supplier> => {
    const res = await axiosRequest<ApiResponse<Supplier>>(RESOURCE, 'POST', payload as any);
    if (!res.data) throw new Error(res.message);
    return res.data;
  },

  update: async (
    id: number,
    payload: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Supplier> => {
    const res = await axiosRequest<ApiResponse<Supplier>>(
      `${RESOURCE}/${id}`,
      'PUT',
      payload as any
    );
    if (!res.data) throw new Error(res.message);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosRequest<void>(`${RESOURCE}/${id}`, 'DELETE');
  },


  // --- Hàm API cho VariantFromSupplier ---

  /**
   * Lấy tất cả biến thể sản phẩm mà một nhà cung cấp cụ thể cung cấp.
   * GET /api/admin/suppliers/{supplierId}/variants
   */
  getSupplierVariants: async (supplierId: number): Promise<VariantFromSupplier[]> => {
    const res = await axiosRequest<ApiResponse<VariantFromSupplier[]>>(
      `${RESOURCE}/${supplierId}/variants`,
      'GET'
    );
    return res.data || [];
  },

  /**
   * Lấy thông tin chi tiết một biến thể sản phẩm cụ thể từ nhà cung cấp.
   * GET /api/admin/suppliers/{supplierId}/variants/{variantFromSupplierId}
   */
  getSupplierVariantById: async (supplierId: number, variantFromSupplierId: number): Promise<VariantFromSupplier> => {
    const res = await axiosRequest<ApiResponse<VariantFromSupplier>>(
      `${RESOURCE}/${supplierId}/variants/${variantFromSupplierId}`,
      'GET'
    );
    if (!res.data) throw new Error(res.message);
    return res.data;
  },

addVariantToSupplier: async (
  supplierId: number,
  payload: AddVariantToSupplierPayload
): Promise<VariantFromSupplier> => {
  const res = await axiosRequest<ApiResponse<VariantFromSupplier>>(
    `${RESOURCE}/${supplierId}/variants`,
    'POST',
    payload
  );
  if (!res.data) throw new Error(res.message);
  return res.data;
},


 /**
   * Lưu nhiều biến thể sản phẩm của nhà cung cấp (thêm mới hoặc cập nhật).
   * Phương thức này sẽ gọi addVariantToSupplier hoặc updateSupplierVariant tương ứng.
   */
  // saveMultipleSupplierVariants: async (
  //   supplierId: number,
  //   payload: SaveMultipleVariantPayloadItem[]
  // ): Promise<void> => {
  //   const promises = payload.map(async (item) => {
  //     const { id, variant_id, current_purchase_price, variant_supplier_sku, is_active } = item;

  //     if (id) {
  //       // Nếu item có ID, đây là thao tác cập nhật
  //       const updatePayload: Partial<Omit<VariantFromSupplier, 'id' | 'supplier_id' | 'variant_id' | 'created_at' | 'updated_at' | 'variant'>> = {
  //         current_purchase_price,
  //         variant_supplier_sku,
  //         ...(typeof is_active === 'boolean' && { is_active }), // Chỉ bao gồm is_active nếu nó được định nghĩa
  //       };
  //       return supplierApi.updateSupplierVariant(supplierId, id, updatePayload);
  //     } else {
  //       // Nếu item không có ID, đây là thao tác thêm mới
  //       const createPayload: AddVariantToSupplierPayload = {
  //         variant_id,
  //         current_purchase_price,
  //         variant_supplier_sku,
  //         ...(typeof is_active === 'boolean' && { is_active }), // Chỉ bao gồm is_active nếu nó được định nghĩa
  //       };
  //       return supplierApi.addVariantToSupplier(supplierId, createPayload);
  //     }
  //   });

  //   // Thực hiện tất cả các promise và kiểm tra kết quả
  //   const results = await Promise.allSettled(promises);

  //   const rejected = results.filter(result => result.status === 'rejected');
  //   if (rejected.length > 0) {
  //     console.error("Một số biến thể không lưu được:", rejected);
  //     // Bạn có thể tùy chỉnh thông báo lỗi hoặc cách xử lý lỗi tại đây
  //     throw new Error(`Đã xảy ra lỗi khi lưu ${rejected.length} trên tổng số ${payload.length} biến thể.`);
  //   }
  // },



  saveMultipleSupplierVariants: async (
  supplierId: number,
  payload: SaveMultipleVariantPayloadItem[]
): Promise<void> => {
  // 1. Lấy danh sách biến thể đã tồn tại từ nhà cung cấp
  const existingVariants = await supplierApi.getSupplierVariants(supplierId);

 const mergedPayload = payload.map(item => {
  const matched = existingVariants.find(
    v => String(v.variant_id) === String(item.variant_id)
  );
  return {
    ...item,
    id: matched?.id ?? item.id,
  };
});

console.table(mergedPayload.map(item => ({
  variant_id: item.variant_id,
  id: item.id,
})));

const promises = mergedPayload.map(async (item) => {
  const { id, variant_id, current_purchase_price, variant_supplier_sku, is_active } = item;

  if (typeof id === 'number') {
    const updatePayload = {
      current_purchase_price,
      variant_supplier_sku,
      ...(typeof is_active === 'boolean' && { is_active }),
    };
    return supplierApi.updateSupplierVariant(supplierId, id, updatePayload);
  } else {
    const createPayload = {
      variant_id,
      current_purchase_price,
      variant_supplier_sku,
      ...(typeof is_active === 'boolean' && { is_active }),
    };
    return supplierApi.addVariantToSupplier(supplierId, createPayload);
  }
});


  // 4. Kiểm tra kết quả
  const results = await Promise.allSettled(promises);
  const rejected = results.filter(result => result.status === 'rejected');

  if (rejected.length > 0) {
    console.error("Một số biến thể không lưu được:", rejected);
    throw new Error(`Đã xảy ra lỗi khi lưu ${rejected.length} trên tổng số ${payload.length} biến thể.`);
  }
},


  /**
   * Cập nhật thông tin biến thể sản phẩm của nhà cung cấp.
   * PUT/PATCH /api/admin/suppliers/{supplierId}/variants/{variantFromSupplierId}
   */
  updateSupplierVariant: async (
    supplierId: number,
    variantFromSupplierId: number,
    payload: Partial<Omit<VariantFromSupplier, 'id' | 'supplier_id' | 'variant_id' | 'created_at' | 'updated_at' | 'variant'>>
  ): Promise<VariantFromSupplier> => {
    const res = await axiosRequest<ApiResponse<VariantFromSupplier>>(
      `${RESOURCE}/${supplierId}/variants/${variantFromSupplierId}`,
      'PATCH', // Hoặc 'PATCH' nếu bạn muốn hỗ trợ cập nhật từng phần
      payload as any
    );
    if (!res.data) throw new Error(res.message);
    return res.data;
  },


   updateSupplierVariants: async (
    supplierId: number,
    payload: Partial<Omit<VariantFromSupplier, 'id' | 'supplier_id' | 'variant_id' | 'created_at' | 'updated_at' | 'variant'>>
  ): Promise<VariantFromSupplier> => {
    const res = await axiosRequest<ApiResponse<VariantFromSupplier>>(
      `${RESOURCE}/${supplierId}/variants`,
      'PATCH', // Hoặc 'PATCH' nếu bạn muốn hỗ trợ cập nhật từng phần
      payload as any
    );
    if (!res.data) throw new Error(res.message);
    return res.data;
  },


  /**
   * Xóa một biến thể sản phẩm khỏi danh mục của nhà cung cấp.
   * DELETE /api/admin/suppliers/{supplierId}/variants/{variantFromSupplierId}
   */
  removeVariantFromSupplier: async (supplierId: number, variantFromSupplierId: number): Promise<void> => {
    await axiosRequest<ApiResponse<void>>(
      `${RESOURCE}/${supplierId}/variants/${variantFromSupplierId}`,
      'DELETE'
    );
  },

  setDefaultVariantFromSupplier: async (variantFromSupplierId: number): Promise<ApiResponse<void>> => {
    const res = await axiosRequest<ApiResponse<void>>(
      `admin/${variantFromSupplierId}/set-default`,
      'PATCH'
    );
    // axiosRequest đã tự động throw error nếu có, nên chỉ cần trả về res
    return res;
  },



};



export default supplierApi;
