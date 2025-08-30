// src/services/api/RecommenderSettingApi.ts

import { axiosRequest } from '@/lib/axiosRequest'; // Đảm bảo đường dẫn này đúng với vị trí file axiosRequest.ts của bạn



export interface BayesianOptimizationSpace{
  id:number;
  param_name:string;
  param_type:string;
  min_value:number;
  max_value:number;
  created_at: string;
  updated_at: string
}
export interface UpdatePayload {
    updates: {
        id: number;
        data: {
            min_value: number;
            max_value: number;
        };
    }[];
}

export interface ApiResponse<T =  any> {
  message: string;
  status: 'success' | 'warning' | 'error';
  data?: T;
  errors?: string[] | Record<string, string>; // errors có thể là mảng string hoặc object
 
  failed_settings?: Record<string, string>; // Cho trường hợp updateMultipleSettings
}
export const bayesianOptimizationSpaceApi = {
  getAllSpaces: async (): Promise<ApiResponse<BayesianOptimizationSpace[]>> => {
    try {
      const data = await axiosRequest<ApiResponse<BayesianOptimizationSpace[]>>(`recommender/spaces`);
      return data;
    }catch(error: any){
      console.error('Lỗi khi lấy dữ liệu:', error.message);
       return {
        message: error.message || 'Lỗi kết nối mạng hoặc server không phản hồi.',
        status: 'error',
        errors: [error.message || 'Unknown error'],
      };
    }
  },
  updateMultiSpaces: async (payload: UpdatePayload): Promise<ApiResponse<any>> => {
        try {
            const data = await axiosRequest<ApiResponse<any>>('/admin/recommender/spaces', 'PUT', payload);
            return data;
        } catch (error: any) {
            return {
                message: error.message || 'Lỗi kết nối mạng hoặc server không phản hồi khi cập nhật cài đặt.',
                status: 'error',
                errors: [error.message || 'Unknown error'],
            };
        }
    },
  //  updateMultiSpaces: async (spaces: Record<string, any>): Promise<ApiResponse<any>> => {
  //   try {
  //     const data = await axiosRequest<ApiResponse<any>>('/admin/recommender/spaces', 'PUT', spaces);
  //     return data;
  //   } catch (error: any) {
  //     console.error('Lỗi khi cập nhật cài đặt:', error.message);
  //     return {
  //       message: error.message || 'Lỗi kết nối mạng hoặc server không phản hồi khi cập nhật cài đặt.',
  //       status: 'error',
  //       errors: [error.message || 'Unknown error'],
  //     };
  //   }
  // },
}


