// frontend\src\features\products\api\productApi.ts
import { axiosRequest } from "@/lib/axiosRequest";

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  cat_id: number;
  brand_id: number;
  is_featured: boolean;
  status: boolean;
}

// Lấy danh sách products
export async function fetchProducts(): Promise<Product[]> {
  return axiosRequest<{ data: Product[] }>("products", "GET")
    .then(res => res.data);
}

export async function fetchProductsbyCatSlug(categorySlug: string): Promise<Product[]>{
    return axiosRequest<{data: Product[]}>(`${categorySlug}/products`,"GET").then(res => res.data)
}

export async function fetchProductBySlug(productSlug: string): Promise<Product> {
    return axiosRequest<{data: Product}>(`products/${productSlug}`,"GET").then(res => res.data)
}
// Tạo mới product
export async function createProduct(data: {
  name: string;
  description?: string;
  cat_id: number;
  brand_id: number;
  is_featured?: boolean;
  status?: boolean;
}): Promise<Product> {
  return axiosRequest<{ data: Product }>("admin/products", "POST", data)
    .then(res => res.data);
}

// Cập nhật product bằng slug
export async function updateProduct(
  slug: string,
  data: {
    name?: string;
    description?: string;
    cat_id?: number;
    brand_id?: number;
    is_featured?: boolean;
    status?: boolean;
  }
): Promise<Product> {
  return axiosRequest<{ data: Product }>(`admin/products/${slug}`, "PATCH", data)
    .then(res => res.data);
}

// Xóa product bằng slug
export async function deleteProduct(slug: string): Promise<void> {
  return axiosRequest<{ message: string }>(`admin/products/${slug}`, "DELETE")
    .then(() => {}); 
}

// Toggle status (chuyển trạng thái)
export async function toggleProductStatus(slug: string, currentStatus: boolean): Promise<Product> {
  const newStatus = !currentStatus;
  return axiosRequest<{ data: Product }>(`admin/products/${slug}`, "PATCH", {
    status: newStatus,
  }).then(res => res.data);
}
