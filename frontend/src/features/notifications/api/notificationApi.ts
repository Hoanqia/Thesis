// utils/notificationApi.ts
import { axiosRequest } from '@/lib/axiosRequest'; // Import axiosRequest từ file bạn vừa tạo

// --- Định nghĩa Typescript Interfaces cho dữ liệu API ---

/**
 * Interface cho một đối tượng thông báo từ API.
 */
export interface Notification {
  id: number;
  user_id: number;
  type: string;
  content: string;
  link?: string | null; // Có thể null nếu không có liên kết
  is_read: boolean;
  read_at: string | null; // ISO 8601 string hoặc null
  created_at: string; // ISO 8601 string
  updated_at: string; // ISO 8601 string
}

/**
 * Interface cho metadata phân trang.
 */
export interface PaginationMeta {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number;
  to: number;
  prev_page_url: string | null;
  next_page_url: string | null;
}

/**
 * Interface cho phản hồi API thành công của Laravel (envelope).
 * T đại diện cho kiểu dữ liệu của trường 'data' trong phản hồi.
 */
export interface ApiResponse<T = any> {
  message: string;
  status: 'success' | 'error'; // Mặc dù status 'error' sẽ được handle bằng throw error,
                               // nhưng vẫn giữ để phù hợp với cấu trúc backend.
  data: T;
  unread_count?: number; // Chỉ có trong getUnread response
  pagination?: PaginationMeta; // Chỉ có trong index (phân trang) response
  count?: number; // Chỉ có trong markAllAsRead response
}

/**
 * Interface cho dữ liệu phản hồi khi đánh dấu tất cả thông báo là đã đọc.
 */
interface MarkAllAsReadData {
  count: number;
}

// --- Gom tất cả các hàm API vào một hằng số duy nhất ---

export const NotificationsApi = {
  /**
   * Lấy danh sách các thông báo chưa đọc của người dùng hiện tại.
   * GET /api/notifications/unread
   * @returns Promise<ApiResponse<Notification[]>>
   */
  getUnread: async (): Promise<ApiResponse<Notification[]>> => {
    return axiosRequest<ApiResponse<Notification[]>>('/notifications/unread', 'GET');
  },

  /**
   * Lấy tất cả các thông báo của người dùng hiện tại với phân trang.
   * GET /api/notifications
   * @param page Trang hiện tại muốn lấy.
   * @param perPage Số lượng thông báo mỗi trang.
   * @returns Promise<ApiResponse<Notification[]>> (bao gồm pagination metadata)
   */
  getAll: async (
    page: number = 1,
    perPage: number = 15
  ): Promise<ApiResponse<Notification[]>> => {
    return axiosRequest<ApiResponse<Notification[]>>(`/notifications?page=${page}&per_page=${perPage}`, 'GET');
  },

  /**
   * Đánh dấu một thông báo cụ thể là đã đọc.
   * POST /api/notifications/{notification}/mark-as-read
   * @param notificationId ID của thông báo cần đánh dấu.
   * @returns Promise<ApiResponse<Notification>>
   */
  markAsRead: async (notificationId: number): Promise<ApiResponse<Notification>> => {
    return axiosRequest<ApiResponse<Notification>>(`/notifications/${notificationId}/mark-as-read`, 'POST');
  },

  /**
   * Đánh dấu tất cả thông báo chưa đọc của người dùng hiện tại là đã đọc.
   * POST /api/notifications/mark-all-as-read
   * @returns Promise<ApiResponse<MarkAllAsReadData>>
   */
  markAllAsRead: async (): Promise<ApiResponse<MarkAllAsReadData>> => {
    return axiosRequest<ApiResponse<MarkAllAsReadData>>('/notifications/mark-all-as-read', 'POST');
  },

  /**
   * Xóa một thông báo cụ thể.
   * DELETE /api/notifications/{notification}
   * @param notificationId ID của thông báo cần xóa.
   * @returns Promise<ApiResponse<null>>
   */
  delete: async (notificationId: number): Promise<ApiResponse<null>> => {
    return axiosRequest<ApiResponse<null>>(`/notifications/${notificationId}`, 'DELETE');
  },
};