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
}

const baseUrl = "/admin";

export const variantApi = {
  fetchByProduct: async (productId: number): Promise<Variant[]> => {
    return axiosRequest<{ data: Variant[] }>(`${baseUrl}/${productId}/variants`, "GET")
      .then(res => res.data);
  },

  fetchById: async (id: number): Promise<Variant> => {
    return axiosRequest<{ data: Variant }>(`${baseUrl}/variants/${id}`, "GET")
      .then(res => res.data);
  },

  create: async (item: Omit<Variant, "id">): Promise<Variant> => {
    return axiosRequest<{ data: Variant }>(`${baseUrl}/variants`, "POST", item)
      .then(res => res.data);
  },

  update: async (id: number, item: Omit<Variant, "id">): Promise<Variant> => {
    return axiosRequest<{ data: Variant }>(`${baseUrl}/variants/${id}`, "PATCH", item)
      .then(res => res.data);
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
