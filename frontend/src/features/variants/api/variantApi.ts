import { axiosRequest } from '@/lib/axiosRequest';

export interface Variant {
  id: number;
  product_id: number;
  sku: string;
  price: number;
  discount: number;
  stock: number;
  image?: string;
  status?: number;

  variant_spec_values: SpecValue[];

}

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
const baseUrl = "/admin";

export const variantApi = {
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

  delete: async (id: number): Promise<void> => {
    return axiosRequest<{ message: string }>(`${baseUrl}/variants/${id}`, "DELETE")
      .then(() => {});
  },

  toggleStatus: async (variant: Variant): Promise<Variant> => {
    const updatedVariant = { ...variant, status: variant.status === 1 ? 0 : 1 };
    return axiosRequest<{ data: Variant }>(`${baseUrl}/variants/${variant.id}`, "PATCH", updatedVariant)
      .then(res => res.data);
  },
};
