// frontend/src/features/recommendations/api/recommendationApi.ts

import { axiosRequest } from "@/lib/axiosRequest";
import { VariantFromSupplier } from "@/features/suppliers/api/supplierApi";

import { Product } from "@/features/products/api/productApi";


// RecommendationItem sử dụng Product interface chung
export interface RecommendationItem {
  product: Product;
  score: number; // Điểm số tương đồng/gợi ý
}

export interface RecommendationResponse {
  message: string;
  status: "success" | string;
  data: RecommendationItem[];
}

// --- API Endpoints ---

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