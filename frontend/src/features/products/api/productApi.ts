// frontend\src\features\products\api\productApi.ts
import { axiosRequest } from "@/lib/axiosRequest";

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  cat_id: number;
  categorySlug?: string;
  brand_id: number;
  is_featured: boolean;
  status: boolean;
  reviews_count?: number;
  reviews_avg_rate?: string;
}

export async function fetchSearchSuggestions(query: string): Promise<string[]> {
  try {
    // Nếu query rỗng, không cần gọi API, trả về mảng rỗng
    if (!query.trim()) {
      return [];
    }

    const response = await axiosRequest<{
      message: string;
      status: string;
      data: string[]; // API của bạn trả về mảng string (các gợi ý)
    }>(
      `/suggestions?query=${encodeURIComponent(query)}&limit=5`, // Sử dụng encodeURIComponent cho query
      "GET"
    );

    if (response.status === "success" && response.data) {
      return response.data;
    } else {
      console.error("Failed to fetch suggestions:", response.message);
      return [];
    }
  } catch (error) {
    console.error("Error fetching search suggestions:", error);
    return [];
  }
}

export async function searchProduct(query: string): Promise<Product[]> {
  // Thay đổi endpoint thành /products/search và gửi query qua params
  return axiosRequest<{ data: Product[] }>(`/search?query=${encodeURIComponent(query)}`, "GET")
    .then(res => res.data);
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
