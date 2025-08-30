// frontend\src\features\variants\api\variantApi.ts
import { axiosRequest } from '@/lib/axiosRequest';
import { Category } from '@/features/categories/api/categoryApi';
import { VariantFromSupplier } from '@/features/suppliers/api/supplierApi';
import { Product } from '@/features/products/api/productApi';

export interface SpecValue {
  id: number;
  // variantId: number;
    variant_id: number;
      spec_id: number;         // giống với JSON trả về
  value_text: string | null;
  value_int: number | null;
  value_decimal: number | null;
  option_id: number | null;

    specification: Specification;
  spec_options: SpecOption | null;
created_at: string;
  updated_at: string;
}

export interface Specification {
  id: number;
  category_id: number;
  name: string;           // ví dụ: "RAM", "Màu sắc", "Dung lượng bộ nhớ"
  data_type: "int" | "decimal" | "text" | "option";
  unit: string | null;    // ví dụ: "GB", "Ghz", ... hoặc null nếu không có
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpecOption {
  id: number;
  spec_id: number;
  value: string;          // ví dụ: "Xám", "Đen", ...
  created_at: string;
  updated_at: string;
}

export interface Variant {
  id: number;
  product_id: number;
  sku: string;
  price: number;
  discount: number;
  stock: number;
  image?: string;
  profit_percent: number | 0;
  average_cost: number| 0;
  category_name?: string
  
  variant_spec_values?: SpecValue[];
  product?: Product;
  full_name?: string;
  image_url?: string;
  available_stock_for_sale?: number;
  status: number;
  variant_from_suppliers?: VariantFromSupplier[];
  selected_supplier_id?: number;
  selected_supplier_price?: number;
}

interface VariantPricingData {
  variant_id: number;
  variant_from_supplier_id: number;
}
interface SetByTargetProfitFromSupplierPayload {
  variants: VariantPricingData[];
  profit_percent: number;
  psychological_strategy?: string;
}

interface RecalculateByChosenSupplierCostPayload {
  variants: VariantPricingData[];
  psychological_strategy?: string;
}


const baseUrl = "/admin";


// Định nghĩa interface cho phản hồi API từ PricingController
export interface CommonPricingResponse {
  message: string;
  status: string; // 'success'
  data: number; // Trường 'data' chứa updated_count
}

export const  variantApi = {

  fetchAllVariants: async (): Promise<Variant[]> => {
    return axiosRequest<{data: Variant[]}>(`${baseUrl}/variants`,"GET").then(res => res.data);
  },
  fetchByProduct: async (productId: number): Promise<Variant[]> => {
    return axiosRequest<{ data: Variant[] }>(`${productId}/variants`, "GET")
      .then(res => res.data);
  },

  fetchById: async (id: number): Promise<Variant> => {
    return axiosRequest<{ data: Variant }>(`variants/${id}`, "GET")
      .then(res => res.data);
  },
  
  fetchSpecValuesOfVariant: async (id: number): Promise<SpecValue[]> => {
  return axiosRequest<{ data: SpecValue[] }>(`${baseUrl}/variants/${id}/spec-values`, "GET")
    .then(res => res.data);
},

      create: async (formData: FormData): Promise<Variant> => {
      return axiosRequest<{ data: Variant }>(
        `${baseUrl}/variants`,
        "POST",
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      ).then(res => res.data);
    },
  // update: async (id: number, item: Omit<Variant, "id">): Promise<Variant> => {
  //   return axiosRequest<{ data: Variant }>(`${baseUrl}/variants/${id}`, "PATCH", item)
  //     .then(res => res.data);
  // },
    // update: async (id: number, form: FormData): Promise<Variant> => {
    //     return axiosRequest<{ data: Variant }>(
    //       `${baseUrl}/variants/${id}/update`,
    //       "PATCH",
    //       form,
    //     ).then(res => res.data);
    //   },
    update: async (id: number, data: any): Promise<Variant> => {
  return axiosRequest<{ data: Variant }>(
    `${baseUrl}/variants/${id}/update`,
    "POST",
    data, // không cần FormData
  ).then(res => res.data);
  },

 toggleStatus: async (id: number, currentStatus: number): Promise<Variant> => {
  return axiosRequest<{ data: Variant }>(
    `${baseUrl}/variants/${id}/update`,
    "PATCH",
        { status: !currentStatus } // gửi status mới

  ).then(res => res.data);
},

  delete: async (id: number): Promise<void> => {
    return axiosRequest<{ message: string }>(`${baseUrl}/variants/${id}`, "DELETE")
      .then(() => {});
  },

  
  // --- CÁC HÀM API MỚI CHO PRICING ---

  /**
   * Đặt giá bán cho các biến thể dựa trên average_cost và tỷ lệ lợi nhuận mục tiêu.
   * Có thể áp dụng chiến lược giá tâm lý.
   * Corresponds to: POST /api/pricing/set-by-target-profit
   * @param variantIds Mảng ID của các Variant cần cập nhật.
   * @param profitPercent Tỷ lệ lợi nhuận mới mong muốn (ví dụ: 25 cho 25%).
   * @param psychologicalStrategy Tùy chọn chiến lược giá tâm lý (e.g., 'charm_vnd_990').
   * @returns Promise<CommonPricingResponse> Đối tượng chứa tin nhắn, trạng thái và số lượng cập nhật.
   */
  setPricesByTargetProfit: async (
    variantIds: number[],
    profitPercent: number,
    psychologicalStrategy?: string
  ): Promise<CommonPricingResponse> => { // Cập nhật kiểu trả về
    const payload: { variant_ids: number[]; profit_percent: number; } = {
      variant_ids: variantIds,
      profit_percent: profitPercent,
    };
  
    return axiosRequest<CommonPricingResponse>( // Cập nhật kiểu cho axiosRequest
      `/admin/pricing/set-by-target-profit`,
      "POST",
      payload
    ).then(res => res); // axiosRequest đã trả về response.data, nên chỉ cần res
  },

  /**
   * Cập nhật lại giá bán của các biến thể dựa trên average_cost và profit_percent hiện tại của chúng.
   * Có thể áp dụng chiến lược giá tâm lý.
   * Corresponds to: POST /api/pricing/recalculate-by-current-cost
   * @param variantIds Mảng ID của các Variant cần cập nhật.
   * @param psychologicalStrategy Tùy chọn chiến lược giá tâm lý (e.g., 'charm_vnd_990').
   * @returns Promise<CommonPricingResponse> Đối tượng chứa tin nhắn, trạng thái và số lượng cập nhật.
   */
  recalculatePricesByCurrentCost: async (
    variantIds: number[],
    psychologicalStrategy?: string
  ): Promise<CommonPricingResponse> => { // Cập nhật kiểu trả về
    const payload: { variant_ids: number[] } = {
      variant_ids: variantIds,
    };
    
    return axiosRequest<CommonPricingResponse>( // Cập nhật kiểu cho axiosRequest
      `/admin/pricing/recalculate-by-current-cost`,
      "POST",
      payload
    ).then(res => res); // axiosRequest đã trả về response.data, nên chỉ cần res
  },


   /**
   * Đặt giá bán cho các biến thể dựa trên giá mua từ một VariantFromSupplier CỤ THỂ và tỷ lệ lợi nhuận mục tiêu.
   * Endpoint: POST /admin/pricing/setByTargetProfitFromSupplier
   * Yêu cầu quyền admin.
   * @param payload Dữ liệu bao gồm danh sách variants, tỷ lệ lợi nhuận và chiến lược giá tâm lý.
   * @returns Promise<CommonPricingResponse> Số lượng bản ghi đã cập nhật.
   */
  setPricesByTargetProfitFromSupplier: async (
    payload: SetByTargetProfitFromSupplierPayload
  ): Promise<CommonPricingResponse> => {
    const res = await axiosRequest<CommonPricingResponse>(
      `/admin/pricing/setByTargetProfitFromSupplier`, // Sử dụng đường dẫn đầy đủ từ root
      'POST',
      payload
    );
    // axiosRequest đã tự động throw error nếu có, nên chỉ cần trả về res
    return res;
  },

  /**
   * Cập nhật lại giá bán của các biến thể dựa trên giá mua từ một VariantFromSupplier CỤ THỂ và profit_percent hiện tại của Variant.
   * Endpoint: POST /admin/pricing/recalculateByChosenSupplierCost
   * Yêu cầu quyền admin.
   * @param payload Dữ liệu bao gồm danh sách variants và chiến lược giá tâm lý.
   * @returns Promise<CommonPricingResponse> Số lượng bản ghi đã cập nhật.
   */
  recalculatePricesByChosenSupplierCost: async (
    payload: RecalculateByChosenSupplierCostPayload
  ): Promise<CommonPricingResponse> => {
    const res = await axiosRequest<CommonPricingResponse>(
      `/admin/pricing/recalculateByChosenSupplierCost`, // Sử dụng đường dẫn đầy đủ từ root
      'POST',
      payload
    );
    // axiosRequest đã tự động throw error nếu có, nên chỉ cần trả về res
    return res;
  },


};
