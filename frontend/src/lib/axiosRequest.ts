import axios, { Method, AxiosHeaders } from 'axios';
import type { AxiosRequestConfig } from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8000/api', // Cập nhật baseURL nếu cần
  // Bỏ withCredentials vì không dùng cookie HttpOnly
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Thêm interceptor để tự động gắn token từ sessionStorage vào header Authorization
axiosInstance.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('access_token');
    if (token) {
      // Nếu headers chưa có, tạo mới AxiosHeaders
      if (!config.headers) {
        config.headers = new AxiosHeaders();
      }
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Gọi API với Axios, hỗ trợ mọi method, body, và config mở rộng
 */
export async function axiosRequest<T = any>(
  url: string,
  method: Method = 'GET',
  body?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    const response = await axiosInstance.request<T>({
      url,
      method,
      data: body,
      ...config,
    });

    return response.data;
  } catch (error: any) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error(error.message || 'Lỗi kết nối');
  }
}
