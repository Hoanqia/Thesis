// frontend\src\features\purchase_orders\api\purchaseOrderApi.ts
import { axiosRequest } from '@/lib/axiosRequest';
import {User} from '@/features/users/api/userApi'
import { Variant } from '@/features/variants/api/variantApi';
import { Supplier,VariantFromSupplier } from '@/features/suppliers/api/supplierApi';
export interface PurchaseOrder {
    id: number;
    user_id: number;
    supplier_id: number;
    expected_delivery_date: string;
    actual_delivery_date: string;
    total_amount: number;
    status: string;
    notes?: string;
    user: User;
    supplier: Supplier;
    items: PurchaseOrderItem[],
    created_at?: string;
    updated_at?: string; 
}
export interface PurchaseOrderItem {
    id: number;
    purchase_order_id: number;
    variant_id: number;
    ordered_quantity: number;
    received_quantity: number;
    unit_cost: number;
    subtotal: number;
    variant: Variant;
}

export interface CreatePurchaseOrderItemPayload {
    variant_id: number;
    ordered_quantity: number;
    received_quantity?: number; // Tùy chọn, có thể là 0 ban đầu
    unit_cost: number;
}

export interface CreatePurchaseOrderData {
    supplier_id: number;
    expected_delivery_date?: string;
    actual_delivery_date?: string;
    notes?: string;
    status?: string;
    items: CreatePurchaseOrderItemPayload[];
}

export interface UpdatePurchaseOrderItemPayload {
    id?: number; 
    variant_id: number;
    ordered_quantity: number;
    received_quantity?: number;
    unit_cost: number;
}

export interface UpdatePurchaseOrderData {
    supplier_id?: number;
    expected_delivery_date?: string;
    actual_delivery_date?: string;
    notes?: string;
    status?: string;
    items?: UpdatePurchaseOrderItemPayload[];
}




/**
 * Định nghĩa cấu trúc phản hồi API chung
 */
interface ApiResponse<T> {
  message: string;
  status: 'success' | 'error';
  data?: T;
}

const baseUrl = 'admin/purchase_orders';

const PurchaseOrderApi = {
    /**
     * Lấy danh sách tất cả các đơn đặt hàng (có phân trang).
     * @param params Tùy chọn truy vấn như per_page.
     * @returns Promise<ApiResponse<PaginatedResponse<PurchaseOrder>>>
     */
    getAllPurchaseOrders: (): Promise<ApiResponse<PurchaseOrder[]>> => {
        return axiosRequest<ApiResponse<PurchaseOrder[]>>(`/${baseUrl}`, 'GET');
        },



    /**
     * Tạo một đơn đặt hàng mới.
     * @param data Dữ liệu đơn đặt hàng cần tạo.
     * @returns Promise<ApiResponse<PurchaseOrder>>
     */
    createPurchaseOrder: (data: CreatePurchaseOrderData): Promise<ApiResponse<PurchaseOrder>> => {
        return axiosRequest<ApiResponse<PurchaseOrder>>(`/${baseUrl}`, 'POST', data);
    },

    /**
     * Lấy chi tiết một đơn đặt hàng theo ID.
     * @param id ID của đơn đặt hàng.
     * @returns Promise<ApiResponse<PurchaseOrder>>
     */
    getPurchaseOrderById: (id: number): Promise<ApiResponse<PurchaseOrder>> => {
        return axiosRequest<ApiResponse<PurchaseOrder>>(`/${baseUrl}/${id}`, 'GET');
    },

    /**
     * Cập nhật một đơn đặt hàng hiện có theo ID.
     * @param id ID của đơn đặt hàng cần cập nhật.
     * @param data Dữ liệu cập nhật.
     * @returns Promise<ApiResponse<PurchaseOrder>>
     */
    updatePurchaseOrder: (id: number, data: UpdatePurchaseOrderData): Promise<ApiResponse<PurchaseOrder>> => {
        // Laravel sử dụng PATCH cho cập nhật từng phần
        return axiosRequest<ApiResponse<PurchaseOrder>>(`/${baseUrl}/${id}`, 'PATCH', data);
    },

    /**
     * Xóa một đơn đặt hàng theo ID.
     * @param id ID của đơn đặt hàng cần xóa.
     * @returns Promise<ApiResponse<any>>
     */
    deletePurchaseOrder: (id: number): Promise<ApiResponse<any>> => {
        return axiosRequest<ApiResponse<any>>(`/${baseUrl}/${id}`, 'DELETE');
    },

    /**
     * Cập nhật trạng thái của một đơn đặt hàng theo ID.
     * Lưu ý: Giả định route cho việc cập nhật trạng thái là PATCH /admin/purchase_orders/{id}/status.
     * @param id ID của đơn đặt hàng.
     * @param status Trạng thái mới.
     * @returns Promise<ApiResponse<PurchaseOrder>>
     */
    updatePurchaseOrderStatus: (id: number, status: string): Promise<ApiResponse<PurchaseOrder>> => {
        return axiosRequest<ApiResponse<PurchaseOrder>>(`/${baseUrl}/${id}/status`, 'PATCH', { status });
    },
};

export default PurchaseOrderApi;
