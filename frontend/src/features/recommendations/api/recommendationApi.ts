import { axiosRequest } from "@/lib/axiosRequest";

// Interfaces
export interface Specification {
  name: string;
  data_type: "int" | "decimal" | "text" | "option";
  unit: string | null;
}

export interface SpecOptions {
  value: string;
}

export interface VariantSpecValue {
  specification: Specification;
  value_int: number | null;
  value_decimal: string | null;
  value_text: string | null;
  spec_options: string | null;
}

export interface Variant {
  id: number;
  price: string;
  discount: string;
  image: string;
  variant_spec_values: VariantSpecValue[];
}

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

}



export interface RecommendationItem {
  product: Product;
  variants: Variant[];
  score: number;
}

export interface RecommendationResponse {
  message: string;
  status: "success" | string;
  data: RecommendationItem[];
}
// recommendApi encapsulates recommendation-related endpoints
export const recommendApi = {
  
  getRecommendations: async (): Promise<RecommendationResponse> => {
    // Mapped to GET /api/customer/recommendations (backend sử dụng default limit)
    return axiosRequest<RecommendationResponse>(
      "/customer/recommendations",
      "GET"
    );
  },
  getSimilarItemsByProductId: async(productSlug: string): Promise<RecommendationResponse> => {
    return axiosRequest<RecommendationResponse>(
      `/product/${productSlug}/similar`,"GET"
    );
  },
};
