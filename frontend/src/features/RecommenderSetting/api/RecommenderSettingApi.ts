// src/services/api/RecommenderSettingApi.ts

import { axiosRequest } from '@/lib/axiosRequest'; // Đảm bảo đường dẫn này đúng với vị trí file axiosRequest.ts của bạn

// Định nghĩa kiểu dữ liệu cho một cài đặt (setting)
export interface RecommenderSetting {
  id: number;
  key: string;
  value: string; // Giá trị luôn là string từ DB, client sẽ parse
  data_type: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Định nghĩa kiểu dữ liệu cho phản hồi API chung từ Laravel
// T là kiểu dữ liệu của trường 'data' trong phản hồi
export interface ApiResponse<T = any> {
  message: string;
  status: 'success' | 'warning' | 'error';
  data?: T;
  errors?: string[] | Record<string, string>; // errors có thể là mảng string hoặc object
 
  failed_settings?: Record<string, string>; // Cho trường hợp updateMultipleSettings
}

/**
 * Đối tượng chứa tất cả các hàm API liên quan đến Recommender Settings.
 * Giúp việc import và quản lý các API dễ dàng hơn.
 */
export const recommenderSettingApi = {
  /**
   * Lấy tất cả các tham số cấu hình của hệ thống gợi ý.
   * Tương ứng với: GET /api/admin/recommender/settings
   * @returns Promise<ApiResponse<RecommenderSetting[]>>
   */
  getAllSettings: async (): Promise<ApiResponse<RecommenderSetting[]>> => {
    try {
      // axiosRequest sẽ trả về trực tiếp data của response,
      // và data này đã có cấu trúc ApiResponse<RecommenderSetting[]> từ Laravel
      const data = await axiosRequest<ApiResponse<RecommenderSetting[]>>('recommender/settings', 'GET');
      return data;
    } catch (error: any) {
      console.error('Lỗi khi lấy tất cả cài đặt:', error.message);
      // Chuyển đổi lỗi thành cấu trúc ApiResponse để nhất quán
      return {
        message: error.message || 'Lỗi kết nối mạng hoặc server không phản hồi.',
        status: 'error',
        errors: [error.message || 'Unknown error'],
      };
    }
  },

  /**
   * Lấy giá trị của một tham số cấu hình cụ thể.
   * Tương ứng với: GET /api/admin/recommender/settings/{key}
   * @param key Tên của tham số.
   * @returns Promise<ApiResponse<{ key: string, value: any }>>
   */
  getSettingByKey: async (key: string): Promise<ApiResponse<{ key: string, value: any }>> => {
    try {
      const data = await axiosRequest<ApiResponse<{ key: string, value: any }>>(`/admin/recommender/settings/${key}`, 'GET');
      return data;
    } catch (error: any) {
      console.error(`Lỗi khi lấy cài đặt '${key}':`, error.message);
      return {
        message: error.message || `Lỗi kết nối mạng hoặc server không phản hồi khi lấy cài đặt '${key}'.`,
        status: 'error',
        errors: [error.message || 'Unknown error'],
      };
    }
  },

  /**
   * Cập nhật một hoặc nhiều tham số cấu hình.
   * Tương ứng với: POST /api/admin/recommender/settings
   * @param settings Một object chứa các cặp key-value của các tham số cần cập nhật.
   * Ví dụ: { TOP_K: 15, HYBRID_ALPHA: 0.7 }
   * @returns Promise<ApiResponse<any>>
   */
  updateSettings: async (settings: Record<string, any>): Promise<ApiResponse<any>> => {
    try {
      const data = await axiosRequest<ApiResponse<any>>('/admin/recommender/settings', 'POST', settings);
      return data;
    } catch (error: any) {
      console.error('Lỗi khi cập nhật cài đặt:', error.message);
      return {
        message: error.message || 'Lỗi kết nối mạng hoặc server không phản hồi khi cập nhật cài đặt.',
        status: 'error',
        errors: [error.message || 'Unknown error'],
      };
    }
  },

  /**
   * Cập nhật một tham số cấu hình cụ thể.
   * Tương ứng với: PUT/PATCH /api/admin/recommender/settings/{key}
   * @param key Tên của tham số.
   * @param newValue Giá trị mới của tham số.
   * @returns Promise<ApiResponse<any>>
   */
  updateSingleSetting: async (key: string, newValue: any): Promise<ApiResponse<any>> => {
    try {
      // Gửi giá trị dưới dạng JSON object { "value": newValue } như Laravel Controller mong đợi
      const data = await axiosRequest<ApiResponse<any>>(`/admin/recommender/settings/${key}`, 'PUT', { value: newValue });
      return data;
    } catch (error: any) {
      console.error(`Lỗi khi cập nhật cài đặt đơn '${key}':`, error.message);
      return {
        message: error.message || `Lỗi kết nối mạng hoặc server không phản hồi khi cập nhật cài đặt đơn '${key}'.`,
        status: 'error',
        errors: [error.message || 'Unknown error'],
      };
    }
  },
};
