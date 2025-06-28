import { axiosRequest } from '@/lib/axiosRequest';

// Interface definitions
export interface Review {
  id: number;
  user_id: number;
  user_name: string; // Thêm trường này
  variant_id: number;
  variant_full_name: string; // Thêm trường này
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
  rate: number | null;    // Cần gửi null để backend không báo lỗi
  // status: boolean | null; // Thêm vào nếu hàm update của backend cũng xử lý status và bạn muốn gửi nó
}
// Response shapes
interface ApiResponse<T> {
  message: string;
  status: 'success' | 'error';
  data?: T;
  errors?: Record<string, string[]>;
}

// Review API service using axiosRequest
export const reviewApi = {
  // Lấy danh sách review đã duyệt cho sản phẩm


  async getAllReviews(): Promise<Review[]> {
    const response = await axiosRequest<ApiResponse<Review[]>>(
      `admin/reviews`,'GET'
    );
    return response.data ?? [];
  } ,
  async getReviews(productId: number): Promise<Review[]> {
    const response = await axiosRequest<ApiResponse<Review[]>>(
      `/reviews/${productId}`,
      'GET'
    );
    return response.data ?? [];
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
  async createReview(
    payload: CreateReviewPayload
  ): Promise<Review> {
    const response = await axiosRequest<ApiResponse<Review>>(
      'customer/reviews',
      'POST',
      payload
    );
    return response.data as Review;
  },

  // Cập nhật review của chính user
  async updateReview(
    id: number,
    payload: UpdateReviewPayload
  ): Promise<Review> {
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
  async adminReply(
    id: number,
    payload: AdminReplyPayload
  ): Promise<Review> {
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
    const payload: AdminUpdateReplyPayload = { // Sử dụng payload mới
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
  }

};
