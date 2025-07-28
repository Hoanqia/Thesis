import { axiosRequest } from '@/lib/axiosRequest'; // Điều chỉnh đường dẫn import cho đúng
import { Method } from 'axios'; // Import Method type từ axios

// --- Interfaces (Kiểu dữ liệu) ---
// Giữ nguyên các interfaces từ câu trả lời trước
// (IRecommenderPerformance, IPerformanceComparison, IGetLatestPerformancesResponse,
// IStorePerformancePayload, IStorePerformanceResponse, IApiErrorResponse)
// Bạn cần đảm bảo chúng đã được định nghĩa ở đây hoặc import từ một file interfaces chung.

/**
 * Interface cho một bản ghi hiệu suất mô hình gợi ý.
 * Phản ánh cấu trúc của RecommenderPerformance Model từ Laravel.
 */
export interface IRecommenderPerformance {
    id?: number;
    precision_at_n: number;
    recall_at_n: number;
    ndcg_at_n: number;
    map: number;
    top_n_recommendations: number;
    top_k: number;
    cosine_threshold: number;
    hybrid_alpha: number;
    batch_size: number;
    product_blacklist: number[] | null;
    optimal_cold_start_threshold: number;
    optimal_frequency_decay_factor: number;
    optimal_final_hybrid_threshold: number;
    created_at?: string;
    updated_at?: string;
}

/**
 * Interface cho đối tượng so sánh hiệu suất.
 */
export interface IPerformanceComparison {
    ndcg_change: number | null;
    precision_change: number | null;
    recall_change: number | null;
    map_change: number | null;
    status: 'improved' | 'decreased' | 'no_change' | 'not_enough_data' | 'only_one_record_in_top10' | 'no_data' | 'error';
}

/**
 * Interface cho phản hồi khi lấy 10 bản ghi hiệu suất gần nhất.
 * Tương ứng với cấu trúc JSON từ getPerformanceData().
 */
export interface IGetLatestPerformancesResponse {
    status: 'success' | 'error';
    latest_10_performances: IRecommenderPerformance[];
    comparison: IPerformanceComparison;
}

/**
 * Interface cho payload khi gửi dữ liệu hiệu suất mới.
 * Tương ứng với dữ liệu gửi tới storePerformance().
 */
export interface IStorePerformancePayload {
    precision_at_n: number;
    recall_at_n: number;
    ndcg_at_n: number;
    map: number;
    top_n_recommendations: number;
    top_k: number;
    cosine_threshold: number;
    hybrid_alpha: number;
    batch_size: number;
    product_blacklist: string | null; // Cần là string khi gửi đi, Laravel sẽ decode
    optimal_cold_start_threshold: number;
    optimal_frequency_decay_factor: number;
    optimal_final_hybrid_threshold: number;
}

/**
 * Interface cho phản hồi khi lưu dữ liệu hiệu suất mới.
 * Tương ứng với cấu trúc JSON từ storePerformance().
 */
export interface IStorePerformanceResponse {
    status: 'success' | 'error';
    message: string;
    data: IRecommenderPerformance | null; // Null nếu có lỗi
}

/**
 * Interface chung cho phản hồi lỗi từ API Laravel (nếu sử dụng ApiExceptionHandler).
 */
export interface IApiErrorResponse {
    status: 'error';
    message: string;
    errors?: { [key: string]: string[] }; // Đối tượng chứa các lỗi validation chi tiết
}


// --- Class API ---

export const recommenderPerformanceApi = {
    /**
     * Lấy 10 bản ghi hiệu suất mô hình gần đây nhất cùng với so sánh.
     * GET /api/recommender/performances
     */
    getLatestPerformanceData: async (): Promise<IGetLatestPerformancesResponse> => {
        const url = 'admin/recommender/performances'; // Relative URL, baseURL từ axiosInstance
        try {
            // axiosRequest đã xử lý `response.data` và ném lỗi
            const data = await axiosRequest<IGetLatestPerformancesResponse>(url, 'GET');
            return data;
        } catch (error: any) {
            // axiosRequest đã ném Error với message từ API hoặc lỗi kết nối
            // Bạn có thể xử lý lỗi cụ thể ở đây nếu cần, ví dụ:
            // if (error.message === 'Unauthorized') { // Ví dụ lỗi từ axiosRequest
            //   // Chuyển hướng đến trang đăng nhập
            // }
            throw error; // Ném lại lỗi để component gọi xử lý
        }
    },

    /**
     * Gửi dữ liệu hiệu suất mới lên server.
     * POST /api/recommender/performances
     * @param payload Dữ liệu hiệu suất để gửi. product_blacklist phải là chuỗi JSON.
     */
    storePerformance: async (payload: IStorePerformancePayload): Promise<IStorePerformanceResponse> => {
        const url = '/recommender/performances';
        try {
            const data = await axiosRequest<IStorePerformanceResponse>(url, 'POST', payload);
            return data;
        } catch (error: any) {
            throw error;
        }
    },

    /**
     * Tùy chọn: Hàm để kích hoạt quá trình chạy lại/đánh giá mô hình ở backend.
     * POST /api/recommender/run-evaluation
     */
    runEvaluation: async (): Promise<{ status: 'success' | 'error'; message: string }> => {
        const url = '/recommender/run-evaluation'; // Endpoint mới, bạn cần định nghĩa route này trong Laravel
        try {
            const data = await axiosRequest<{ message: string }>(url, 'POST');
            return { status: 'success', message: data.message || 'Đánh giá đã được kích hoạt.' };
        } catch (error: any) {
            return { status: 'error', message: error.message || 'Không thể kích hoạt đánh giá.' };
        }
    }
};