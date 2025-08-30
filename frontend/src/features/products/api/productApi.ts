// frontend\src\features\products\api\productApi.ts
import { Brand } from "@/features/brands/api/brandApi";
import { Category } from "@/features/categories/api/categoryApi";
import { Variant } from "@/features/variants/api/variantApi";
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
  brand?: Brand;
  category?: Category;
  variants?: Variant[];
}

// Interface cho thông tin meta (phân trang)
export interface PaginationMeta {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number | null; // Có thể là null nếu không có sản phẩm
  to: number | null;   // Có thể là null nếu không có sản phẩm
}

// Interface cho phản hồi API phân trang của sản phẩm
export interface PaginatedProductsResponse {
  message: string;
  status: string;
  data: Product[]; // Mảng các sản phẩm
  meta: PaginationMeta; // Thông tin phân trang
}

export interface RecommendationItem {
  product: Product;
  score: number; // Điểm số tương đồng/gợi ý
}
export interface RecommendationResponse {
  message: string;
  status: "success" | string;
  data: RecommendationItem[];
}

export const recommendApi = {
  /**
   * Lấy danh sách sản phẩm gợi ý cho người dùng.
   * GET /api/customer/recommendations
   */
  getRecommendations: async (): Promise<RecommendationResponse> => {
    return axiosRequest<RecommendationResponse>(
      "/customer/recommendations",
      "GET"
    );
  },

  /**
   * Lấy danh sách sản phẩm tương tự dựa trên slug của sản phẩm.
   * GET /api/product/{productSlug}/similar
   */
  getSimilarItemsByProductId: async (
    productSlug: string
  ): Promise<RecommendationResponse> => {
    return axiosRequest<RecommendationResponse>(
      `/product/${productSlug}/similar`,
      "GET"
    );
  },
};

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

// Cập nhật hàm fetchProductsByCatSlug
export async function fetchProductsByCatSlug(
  categorySlug: string,
  page: number = 1, // Thêm tham số page với giá trị mặc định
  limit: number = 10 // Thêm tham số limit với giá trị mặc định
): Promise<PaginatedProductsResponse> { // Thay đổi kiểu trả về thành Promise<PaginatedProductsResponse>
  // Gọi API với các tham số phân trang
  // axiosRequest sẽ tự động giải nén response.data cho bạn.
  // Vì vậy, biến `paginatedResponse` sẽ trực tiếp là kiểu PaginatedProductsResponse.
  const paginatedResponse = await axiosRequest<PaginatedProductsResponse>(
    // Điều chỉnh URL cho đúng với route Laravel của bạn (dựa trên controller đã cập nhật)
    `${categorySlug}/products?page=${page}&limit=${limit}`,
    
    'GET'
  );

  // paginatedResponse.data lúc này là mảng Product[] từ cấu trúc trả về của API.
  // Chúng ta sẽ map qua nó để đảm bảo các trường Boolean và kiểu dữ liệu khác được xử lý đúng.
  const products: Product[] = paginatedResponse.data.map((item): Product => {
    const brand: Brand | undefined = item.brand
      ? (item.brand as Brand)
      : undefined;

    const category: Category | undefined = item.category
      ? (item.category as Category)
      : undefined;

    const variants: Variant[] = item.variants
      ? (item.variants as Variant[])
      : [];

    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      cat_id: item.cat_id,
      categorySlug: item.categorySlug,
      brand_id: item.brand_id,
      is_featured: Boolean(item.is_featured),
      status: Boolean(item.status),
      reviews_count: item.reviews_count ?? 0,
      reviews_avg_rate: item.reviews_avg_rate
        ? String(item.reviews_avg_rate)
        : undefined,
      brand,
      category,
      variants,
    };
  });

  // Trả về toàn bộ PaginatedProductsResponse với data đã được xử lý
  return {
    message: paginatedResponse.message,
    status: paginatedResponse.status,
    data: products, // Sử dụng mảng products đã được xử lý
    meta: paginatedResponse.meta,
  };
}

// export async function fetchProductsbyCatSlug(categorySlug: string): Promise<Product[]>{
//     return axiosRequest<{data: Product[]}>(`${categorySlug}/products`,"GET").then(res => res.data)
// }
  

// export async function fetchProductsByCatSlug(
//   categorySlug: string
// ): Promise<Product[]> {
//   // Gọi API, res.data là mảng stdClass với các trường brand, category, variants dưới dạng JSON object/array
//   const { data: rawProducts } = await axiosRequest<{ data: any[] }>(
//     `${categorySlug}/products`,
//     'GET'
//   );

//   // Map và parse từng record về đúng interface Product
//   return rawProducts.map((item): Product => {
//     // brand và category đã là object, không cần JSON.parse
//     const brand: Brand | undefined = item.brand
//       ? (item.brand as Brand) // Chỉ cần cast trực tiếp về kiểu Brand
//       : undefined;

//     const category: Category | undefined = item.category
//       ? (item.category as Category) // Chỉ cần cast trực tiếp về kiểu Category
//       : undefined;

//     // variants đã là mảng, không cần JSON.parse
//     const variants: Variant[] = item.variants
//       ? (item.variants as Variant[]) // Chỉ cần cast trực tiếp về kiểu Variant[]
//       : [];

//     return {
//       id: item.id,
//       name: item.name,
//       slug: item.slug,
//       description: item.description,
//       cat_id: item.cat_id,
//       categorySlug: item.categorySlug,
//       brand_id: item.brand_id,
//       is_featured: Boolean(item.is_featured),
//       status: Boolean(item.status),
//       reviews_count: item.reviews_count ?? 0,
//       reviews_avg_rate: item.reviews_avg_rate
//         ? String(item.reviews_avg_rate)
//         : undefined,
//       brand,
//       category,
//       variants,
//     };
//   });
// }
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
