// import { axiosRequest } from '@/lib/axiosRequest';

// // Interface definitions
// export interface Review {
//   id: number;
//   user_id: number;
//   user_name: string; // Thêm trường này
//   variant_id: number;
//   variant_full_name: string; // Thêm trường này
//   message?: string;
//   rate?: number;
//   admin_reply: string | null;
//   status: boolean;
//   created_at: string;
//   updated_at: string;
// }

// export interface CreateReviewPayload {
//   product_id: number;
//   variant_id?: number;
//   message?: string;
//   rate: number;
// }

// export interface UpdateReviewPayload {
//   message?: string;
//   rate?: number;
// }

// export interface AdminReplyPayload {
//   admin_reply: string | null;
//   status?: boolean;
// }
// // NEW: Interface cho payload chỉ cập nhật admin_reply
// export interface AdminUpdateReplyPayload {
//   admin_reply: string | null;
//   message: string | null; // Cần gửi null để backend không báo lỗi
//   rate: number | null;    // Cần gửi null để backend không báo lỗi
//   // status: boolean | null; // Thêm vào nếu hàm update của backend cũng xử lý status và bạn muốn gửi nó
// }
// // Response shapes
// interface ApiResponse<T> {
//   message: string;
//   status: 'success' | 'error';
//   data?: T;
//   errors?: Record<string, string[]>;
// }

// // Review API service using axiosRequest
// export const reviewApi = {
//   // Lấy danh sách review đã duyệt cho sản phẩm


//   async getAllReviews(): Promise<Review[]> {
//     const response = await axiosRequest<ApiResponse<Review[]>>(
//       `admin/reviews`,'GET'
//     );
//     return response.data ?? [];
//   } ,
//   async getReviews(productId: number): Promise<Review[]> {
//     const response = await axiosRequest<ApiResponse<Review[]>>(
//       `/reviews/${productId}`,
//       'GET'
//     );
//     return response.data ?? [];
//   },

//   // Lấy chi tiết review
//   async getReview(id: number): Promise<Review> {
//     const response = await axiosRequest<ApiResponse<Review>>(
//       `/reviews/${id}`,
//       'GET'
//     );
//     return response.data as Review;
//   },

//   // Tạo review mới
//   async createReview(
//     payload: CreateReviewPayload
//   ): Promise<Review> {
//     const response = await axiosRequest<ApiResponse<Review>>(
//       'customer/reviews',
//       'POST',
//       payload
//     );
//     return response.data as Review;
//   },

//   // Cập nhật review của chính user
//   async updateReview(
//     id: number,
//     payload: UpdateReviewPayload
//   ): Promise<Review> {
//     const response = await axiosRequest<ApiResponse<Review>>(
//       `customer/reviews/${id}`,
//       'PATCH',
//       payload
//     );
//     return response.data as Review;
//   },

//   // Xóa review của chính user
//   async deleteReview(id: number): Promise<boolean> {
//     const response = await axiosRequest<ApiResponse<null>>(
//       `customer/reviews/${id}`,
//       'DELETE'
//     );
//     return response.status === 'success';
//   },

//   // Admin trả lời review
//   async adminReply(
//     id: number,
//     payload: AdminReplyPayload
//   ): Promise<Review> {
//     const response = await axiosRequest<ApiResponse<Review>>(
//       `/admin/reviews/${id}`,
//       'PATCH',
//       payload
//     );
//     return response.data as Review;
//   },

//   // Admin ẩn review
//   async adminDelete(id: number): Promise<boolean> {
//     const response = await axiosRequest<ApiResponse<null>>(
//       `/admin/reviews/${id}`,
//       'DELETE'
//     );
//     return response.status === 'success';
//   },

//    async updateAdminReplyOnly(
//     id: number,
//      adminReplyContent: string | null,
//     // SỬA ĐỔI: Chấp nhận undefined | string | null cho currentMessage
//     currentMessage: string | undefined | null,
//     // SỬA ĐỔI: Chấp nhận undefined | number | null cho currentRate
//     currentRate: number | undefined | null
//   ): Promise<Review> {
//     const payload: AdminUpdateReplyPayload = { // Sử dụng payload mới
//       admin_reply: adminReplyContent,
//       message: currentMessage === undefined ? null : currentMessage,
//         rate: currentRate === undefined ? null : currentRate, // <-- Chuyển undefined thành null
//     };
//     const response = await axiosRequest<ApiResponse<Review>>(
//       `/admin/reviews/${id}`, // Cùng endpoint với adminReply, backend cần xử lý
//       'PATCH', // Method PATCH là phù hợp cho cập nhật một phần
//       payload
//     );
//     return response.data as Review;
//   }

// };
import { axiosRequest } from '@/lib/axiosRequest';

// Interface definitions
export interface Review {
  id: number;
  user_id: number;
  user_name: string;
  variant_id: number;
  variant_full_name: string;
  message?: string;
  rate?: number;
  admin_reply: string | null;
  status: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateReviewPayload {
  product_id: number;
  variant_id?: number;
  message?: string;
  rate: number;
}

export interface UpdateReviewPayload {
  message?: string;
  rate?: number;
}

export interface AdminReplyPayload {
  admin_reply: string | null;
  status?: boolean;
}

// NEW: Interface cho payload chỉ cập nhật admin_reply
export interface AdminUpdateReplyPayload {
  admin_reply: string | null;
  message: string | null; // Cần gửi null để backend không báo lỗi
  rate: number | null; // Cần gửi null để backend không báo lỗi
  // status: boolean | null; // Thêm vào nếu hàm update của backend cũng xử lý status và bạn muốn gửi nó
}

// NEW: Interface for pagination meta data
export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
  path: string;
  per_page: number;
  to: number | null;
  total: number;
}

// Response shapes - UPDATED to include meta for pagination
interface ApiResponse<T> {
  message: string;
  status: 'success' | 'error';
  data?: T;

}
export interface ReviewApiResponse {
  message: string;
  status: string;
  data: Review[]; // Đây là `data` chứa danh sách reviews của trang hiện tại
  meta: PaginationMeta;
  review_distribution: { [key: string]: number }; // <-- THÊM CÁI NÀY VÀO INTERFACE
}
// Review API service using axiosRequest
export const reviewApi = {
  // Lấy danh sách review đã duyệt cho sản phẩm (ADMIN)
  async getAllReviews(): Promise<Review[]> {
    const response = await axiosRequest<ApiResponse<Review[]>>(
      `admin/reviews`,
      'GET'
    );
    return response.data ?? [];
  },

   async getPaginatedReviews(
    productId: number,
    page: number = 1,
    perPage: number = 10
  ): Promise<{ reviews: Review[]; meta: PaginationMeta; review_distribution: { [key: string]: number } }> { // <-- CẬP NHẬT KIỂU TRẢ VỀ Ở ĐÂY
    // Giả định `axiosRequest` của bạn hoạt động với `ApiResponse<Review[]>`
    // Tuy nhiên, vì API response của bạn có thêm `review_distribution` ở cùng cấp với `data` và `meta`,
    // bạn nên định nghĩa lại kiểu của `axiosRequest` hoặc bọc lại nó.
    // Cách đơn giản nhất là giả định `axiosRequest` trả về `ReviewApiResponse` trực tiếp.
    const response = await axiosRequest<ReviewApiResponse>( // <-- Dùng ReviewApiResponse ở đây
      `/reviews/${productId}?page=${page}&per_page=${perPage}`,
      'GET'
    );

    if (response.status === 'success' && response.data && response.meta && response.review_distribution) { // <-- THÊM KIỂM TRA review_distribution
      return {
        reviews: response.data, // `response.data` là danh sách reviews
        meta: response.meta,
        review_distribution: response.review_distribution, // <-- TRẢ VỀ review_distribution TỪ RESPONSE
      };
    }
    // Handle cases where data or meta or review_distribution might be missing, return defaults or throw error
    return {
      reviews: [],
      meta: {
        current_page: 1,
        from: null,
        last_page: 1,
        links: [],
        path: '',
        per_page: perPage,
        to: null,
        total: 0,
      },
      review_distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }, // <-- TRẢ VỀ GIÁ TRỊ MẶC ĐỊNH
    };
  },

  // Lấy chi tiết review
  async getReview(id: number): Promise<Review> {
    const response = await axiosRequest<ApiResponse<Review>>(
      `/reviews/${id}`,
      'GET'
    );
    return response.data as Review;
  },

  // Tạo review mới
  async createReview(payload: CreateReviewPayload): Promise<Review> {
    const response = await axiosRequest<ApiResponse<Review>>(
      'customer/reviews',
      'POST',
      payload
    );
    return response.data as Review;
  },

  // Cập nhật review của chính user
  async updateReview(id: number, payload: UpdateReviewPayload): Promise<Review> {
    const response = await axiosRequest<ApiResponse<Review>>(
      `customer/reviews/${id}`,
      'PATCH',
      payload
    );
    return response.data as Review;
  },

  // Xóa review của chính user
  async deleteReview(id: number): Promise<boolean> {
    const response = await axiosRequest<ApiResponse<null>>(
      `customer/reviews/${id}`,
      'DELETE'
    );
    return response.status === 'success';
  },

  // Admin trả lời review
  async adminReply(id: number, payload: AdminReplyPayload): Promise<Review> {
    const response = await axiosRequest<ApiResponse<Review>>(
      `/admin/reviews/${id}`,
      'PATCH',
      payload
    );
    return response.data as Review;
  },

  // Admin ẩn review
  async adminDelete(id: number): Promise<boolean> {
    const response = await axiosRequest<ApiResponse<null>>(
      `/admin/reviews/${id}`,
      'DELETE'
    );
    return response.status === 'success';
  },

  async updateAdminReplyOnly(
    id: number,
    adminReplyContent: string | null,
    // SỬA ĐỔI: Chấp nhận undefined | string | null cho currentMessage
    currentMessage: string | undefined | null,
    // SỬA ĐỔI: Chấp nhận undefined | number | null cho currentRate
    currentRate: number | undefined | null
  ): Promise<Review> {
    const payload: AdminUpdateReplyPayload = {
      // Sử dụng payload mới
      admin_reply: adminReplyContent,
      message: currentMessage === undefined ? null : currentMessage,
      rate: currentRate === undefined ? null : currentRate, // <-- Chuyển undefined thành null
    };
    const response = await axiosRequest<ApiResponse<Review>>(
      `/admin/reviews/${id}`, // Cùng endpoint với adminReply, backend cần xử lý
      'PATCH', // Method PATCH là phù hợp cho cập nhật một phần
      payload
    );
    return response.data as Review;
  },
};