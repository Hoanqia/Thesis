import { axiosRequest } from '@/lib/axiosRequest';
import { Variant } from '@/features/variants/api/variantApi';
import { Grn, GrnItem } from '@/features/grns/api/grnApi';




export interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: Array<{ url: string | null; label: string; active: boolean }>;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
}

export interface StockLot{
    id: number;
    variant_id: number;
    grn_item_id: number | null;
    reference_type: string | null;
    reference_id: number | null;
    quantity_in: number;
    quantity_out: number;
    unit_cost: number;
    purchase_date: string;
    created_at: string;
    updated_at: string;
    variant: Variant;
    grn_item?: GrnItem;
}

export interface GetStockLotsFilters {
    search?: string;
    variant_id?: number;
    status?: 'available' | 'low_stock' | 'out_of_stock';
    from_date?: string; // YYYY-MM-DD
    to_date?: string; // YYYY-MM-DD
    supplier_id?: number;
    per_page?: number;
    page?: number;
}
export interface AdjustStockLotData {
    quantity_change: number; // Dương cho tăng, âm cho giảm
    transaction_type: string; // Loại giao dịch điều chỉnh (e.g., 'ADJ_INVENTORY_COUNT', 'ADJ_DAMAGE')
    notes?: string;
}
interface ApiResponse<T> {
    message: string;
    status: string; // 'success' hoặc 'error'
    data: T;
}

const baseUrl = 'admin/stock-lots'; 
export const stockLotApi = {
    /**
     * Lấy danh sách lô hàng với phân trang và bộ lọc.
     * GET /api/admin/stock-lots
     * @param filters Các bộ lọc (search, variant_id, status, dates, supplier_id, per_page, page).
     * @returns Promise<ApiResponse<PaginatedResponse<StockLot>>>
     */
    getPaginatedStockLots: async (filters: GetStockLotsFilters = {}): Promise<ApiResponse<PaginatedResponse<StockLot>>> => {
        const response = await axiosRequest<ApiResponse<PaginatedResponse<StockLot>>>(baseUrl, 'GET', undefined, { params: filters });
        return response;
    },

    /**
     * Lấy thông tin chi tiết của một lô hàng.
     * GET /api/admin/stock-lots/{id}
     * @param id ID của lô hàng.
     * @returns Promise<ApiResponse<{ stock_lot: StockLot; transactions: any[]; }>> (transactions có thể cần interface cụ thể hơn)
     */
    getStockLotDetails: async (id: number): Promise<ApiResponse<{ stock_lot: StockLot; transactions: any[]; }>> => {
        const response = await axiosRequest<ApiResponse<{ stock_lot: StockLot; transactions: any[]; }>>(`${baseUrl}/${id}`, 'GET');
        return response;
    },

    /**
     * Lấy dữ liệu cần thiết để hiển thị form điều chỉnh số lượng lô hàng.
     * GET /api/admin/stock-lots/{id}/adjust-form
     * @param id ID của lô hàng.
     * @returns Promise<ApiResponse<{ stock_lot: StockLot; transaction_types_options: { [key: string]: string }; }>>
     */
    getAdjustFormDetails: async (id: number): Promise<ApiResponse<{ stock_lot: StockLot; transaction_types_options: { [key: string]: string }; }>> => {
        const response = await axiosRequest<ApiResponse<{ stock_lot: StockLot; transaction_types_options: { [key: string]: string }; }>>(`${baseUrl}/${id}/adjust-form`, 'GET');
        return response;
    },

    /**
     * Gửi yêu cầu điều chỉnh số lượng lô hàng.
     * POST /api/admin/stock-lots/{id}/adjust
     * @param id ID của lô hàng.
     * @param data Dữ liệu điều chỉnh (quantity_change, transaction_type, notes).
     * @returns Promise<ApiResponse<StockLot>> (Trả về thông tin lô hàng sau khi cập nhật)
     */
    adjustStockLotQuantity: async (id: number, data: AdjustStockLotData): Promise<ApiResponse<StockLot>> => {
        const response = await axiosRequest<ApiResponse<StockLot>>(`${baseUrl}/${id}/adjust`, 'POST', data);
        return response;
    },
};
