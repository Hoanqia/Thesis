'use client';
import React, { useState, useEffect, useCallback } from 'react';
import axios, { Method, AxiosHeaders } from 'axios';
import type { AxiosRequestConfig } from 'axios';

// --- Definition of axiosRequest (moved from axiosRequest.ts for self-contained app) ---
const axiosInstance = axios.create({
    baseURL: 'http://localhost:8000/api', // Cập nhật baseURL nếu cần
    // Bỏ withCredentials vì không dùng cookie HttpOnly
    headers: {
        // 'Content-Type': 'application/json', // Axios sẽ tự động đặt nếu có body
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
// --- End of axiosRequest definition ---


// --- Interfaces and stockLotApi (moved from stocklotApi.ts for self-contained app) ---

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

// Interfaces from variantApi.ts
export interface VariantFromSupplier {
    id: number;
    supplier_id: number;
    variant_id: number;
    variant_supplier_sku: string | null;
    current_purchase_price: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Category {
    id: number;
    name: string;
    slug: string;
    // ... other category properties
}

export interface Product {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    cat_id: number;
    brand_id: number;
    is_featured: number;
    status: number;
    created_at: string;
    updated_at: string;
    category?: Category;
}

export interface Specification {
    id: number;
    category_id: number;
    name: string;
    data_type: "int" | "decimal" | "text" | "option";
    unit: string | null;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface SpecOption {
    id: number;
    spec_id: number;
    value: string;
    created_at: string;
    updated_at: string;
}

export interface SpecValue {
    id: number;
    variant_id: number;
    spec_id: number;
    value_text: string | null;
    value_int: number | null;
    value_decimal: number | null;
    option_id: number | null;
    specification: Specification;
    spec_options: SpecOption | null;
    created_at: string;
    updated_at: string;
}

export interface Variant {
    id: number;
    product_id: number;
    sku: string;
    price: number;
    discount: number;
    stock: number;
    image?: string;
    profit_percent: number | 0;
    average_cost: number | 0;
    category_name?: string;
    variant_spec_values?: SpecValue[];
    product?: Product; // Eager loaded relationship
    full_name?: string; // Accessor
    image_url?: string; // Accessor
    status: number;
    variant_from_suppliers?: VariantFromSupplier[];
    selected_supplier_id?: number;
    selected_supplier_price?: number;
}

// Interfaces from grnApi.ts (and purchaseOrderApi.ts indirectly)
export interface User {
    id: number;
    name: string;
    email: string;
}

export interface PurchaseOrderItem {
    id: number;
    purchase_order_id: number;
    variant_id: number;
    ordered_quantity: number;
    received_quantity: number;
    unit_cost: number;
    subtotal: number;
    created_at: string;
    updated_at: string;
    variant?: Variant; // Nested variant info
}

export interface Supplier { // Re-defining Supplier here if not already global
    id: number;
    name: string;
    phone: string;
    address: string;
    created_at: string;
    updated_at: string;
}

export interface PurchaseOrder {
    id: number;
    user_id: number;
    supplier_id: number;
    expected_delivery_date: string;
    actual_delivery_date: string | null;
    total_amount: number;
    status: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    user?: User;
    supplier?: Supplier; // Nested supplier info
    items?: PurchaseOrderItem[];
}

export interface GrnItem {
    id: number;
    grn_id: number;
    purchase_order_item_id: number;
    quantity: number;
    unit_cost: number;
    subtotal: number;
    created_at: string;
    updated_at: string;
    purchase_order_item?: PurchaseOrderItem;
    grn?: Grn; // Nested GRN
}

export interface Grn {
    id: number;
    user_id: number;
    purchase_order_id: number;
    type: 'purchase';
    total_amount: number;
    status: 'pending' | 'confirmed' | 'cancelled';
    notes: string | null;
    created_at: string;
    updated_at: string;
    user?: User;
    items?: GrnItem[];
    purchase_order?: PurchaseOrder;
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
    variant: Variant; // Eager loaded relationship
    grn_item?: GrnItem; // Eager loaded relationship, optional
}

export interface GetStockLotsFilters {
    search?: string;
    variant_id?: number;
    status?: 'available' | 'low_stock' | 'out_of_stock';
    from_date?: string; //YYYY-MM-DD
    to_date?: string; //YYYY-MM-DD
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

// API client for stock lots
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

// --- End of stockLotApi content ---


// Global notification component (a simple one for demonstration)
const Notification: React.FC<{ message: string | null; type: 'success' | 'error' | null; onClose: () => void }> = ({ message, type, onClose }) => {
    if (!message) return null;

    const bgColor = type === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700';
    const borderColor = type === 'success' ? 'border-green-500' : 'border-red-500';

    return (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-md border ${bgColor} ${borderColor} z-50`}>
            <div className="flex justify-between items-center">
                <p className="font-semibold">{message}</p>
                <button onClick={onClose} className="ml-4 text-lg font-bold">&times;</button>
            </div>
        </div>
    );
};

// --- StockLotList Component ---
interface StockLotListProps {
    filters: GetStockLotsFilters;
    onFilterChange: (newFilters: GetStockLotsFilters) => void;
    onPageChange: (page: number) => void;
    stockLotsData: PaginatedResponse<StockLot> | null;
    onViewDetails: (lotId: number) => void;
    onAdjustStock: (lotId: number) => void;
    isLoading: boolean;
    error: string | null;
    variants: Variant[]; // For filter dropdown
    suppliers: Supplier[]; // For filter dropdown
}

const StockLotList: React.FC<StockLotListProps> = ({
    filters,
    onFilterChange,
    onPageChange,
    stockLotsData,
    onViewDetails,
    onAdjustStock,
    isLoading,
    error,
    variants,
    suppliers
}) => {
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFilterChange({ ...filters, search: e.target.value, page: 1 });
    };

    const handleVariantFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onFilterChange({ ...filters, variant_id: e.target.value ? parseInt(e.target.value) : undefined, page: 1 });
    };

    const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onFilterChange({ ...filters, status: e.target.value as any, page: 1 });
    };

    const handleDateFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFilterChange({ ...filters, [e.target.name]: e.target.value, page: 1 });
    };

    const handleSupplierFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onFilterChange({ ...filters, supplier_id: e.target.value ? parseInt(e.target.value) : undefined, page: 1 });
    };


    const getRemainingQuantity = (lot: StockLot) => lot.quantity_in - lot.quantity_out;

    const isLowStock = (lot: StockLot) => {
        const remaining = getRemainingQuantity(lot);
        const total = lot.quantity_in;
        // Assuming low stock threshold is 10%
        return remaining > 0 && remaining <= total * 0.1;
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-3">Quản lý Lô hàng</h1>

            {/* Filter and Search Section */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm Lot ID / Sản phẩm:</label>
                    <input
                        type="text"
                        id="search"
                        name="search"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                        placeholder="Lot ID hoặc tên sản phẩm"
                        value={filters.search || ''}
                        onChange={handleSearchChange}
                    />
                </div>
                <div>
                    <label htmlFor="variant_id" className="block text-sm font-medium text-gray-700 mb-1">Biến thể:</label>
                    <select
                        id="variant_id"
                        name="variant_id"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                        value={filters.variant_id || ''}
                        onChange={handleVariantFilterChange}
                    >
                        <option value="">Tất cả</option>
                        {variants.map(variant => (
                            <option key={variant.id} value={variant.id}>{variant.full_name || variant.sku}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Trạng thái:</label>
                    <select
                        id="status"
                        name="status"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                        value={filters.status || ''}
                        onChange={handleStatusFilterChange}
                    >
                        <option value="">Tất cả</option>
                        <option value="available">Còn hàng</option>
                        <option value="low_stock">Sắp hết</option>
                        <option value="out_of_stock">Hết hàng</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="supplier_id" className="block text-sm font-medium text-gray-700 mb-1">Nhà cung cấp:</label>
                    <select
                        id="supplier_id"
                        name="supplier_id"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                        value={filters.supplier_id || ''}
                        onChange={handleSupplierFilterChange}
                    >
                        <option value="">Tất cả</option>
                        {suppliers.map(supplier => (
                            <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="from_date" className="block text-sm font-medium text-gray-700 mb-1">Từ ngày:</label>
                    <input
                        type="date"
                        id="from_date"
                        name="from_date"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                        value={filters.from_date || ''}
                        onChange={handleDateFilterChange}
                    />
                </div>
                <div>
                    <label htmlFor="to_date" className="block text-sm font-medium text-gray-700 mb-1">Đến ngày:</label>
                    <input
                        type="date"
                        id="to_date"
                        name="to_date"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                        value={filters.to_date || ''}
                        onChange={handleDateFilterChange}
                    />
                </div>
            </div>

            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
                </div>
            ) : (
                <>
                    <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lot ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày nhập</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá vốn/ĐV</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SL Nhập</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SL Đã xuất</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SL Còn lại</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stockLotsData?.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                            Không tìm thấy lô hàng nào.
                                        </td>
                                    </tr>
                                ) : (
                                    stockLotsData?.data.map((lot) => (
                                        <tr key={lot.id} className={isLowStock(lot) ? 'bg-yellow-50' : ''}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{lot.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lot.variant.full_name || lot.variant.sku}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(lot.purchase_date).toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(lot.unit_cost)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lot.quantity_in}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lot.quantity_out}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                                {getRemainingQuantity(lot)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {getRemainingQuantity(lot) === 0 ? (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                        Hết hàng
                                                    </span>
                                                ) : isLowStock(lot) ? (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                        Sắp hết
                                                    </span>
                                                ) : (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                        Còn hàng
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => onViewDetails(lot.id)}
                                                    className="text-indigo-600 hover:text-indigo-900 mr-4 p-2 rounded-md hover:bg-indigo-50 transition-colors"
                                                >
                                                    Chi tiết
                                                </button>
                                                {getRemainingQuantity(lot) > 0 && (
                                                    <button
                                                        onClick={() => onAdjustStock(lot.id)}
                                                        className="text-blue-600 hover:text-blue-900 p-2 rounded-md hover:bg-blue-50 transition-colors"
                                                    >
                                                        Điều chỉnh
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {stockLotsData && stockLotsData.last_page > 1 && (
                        <div className="mt-6 flex justify-center">
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                {stockLotsData.links.map((link, index) => (
                                    <button
                                        key={index}
                                        onClick={() => link.url && onPageChange(parseInt(link.url.split('page=')[1]))}
                                        disabled={!link.url || link.active}
                                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                                            ${link.active
                                                ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}
                                            ${index === 0 ? 'rounded-l-md' : ''}
                                            ${index === stockLotsData.links.length - 1 ? 'rounded-r-md' : ''}
                                            `}
                                        dangerouslySetInnerHTML={{ __html: link.label }} // Render HTML entities like &laquo;
                                    />
                                ))}
                            </nav>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// --- StockLotDetails Component ---
interface StockLotDetailsProps {
    lotId: number;
    onBackToList: () => void;
    onAdjustStock: (lotId: number) => void;
}

const StockLotDetails: React.FC<StockLotDetailsProps> = ({ lotId, onBackToList, onAdjustStock }) => {
    const [lotDetails, setLotDetails] = useState<StockLot | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]); // Using 'any' for InventoryTransaction
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await stockLotApi.getStockLotDetails(lotId);
                setLotDetails(response.data.stock_lot);
                console.log("History ", response.data.transactions)
                setTransactions(response.data.transactions);
            } catch (err: any) {
                setError(err.message || 'Lỗi khi tải chi tiết lô hàng.');
                console.error('Failed to fetch lot details:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetails();
    }, [lotId]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-100 text-red-800 rounded-lg shadow-md m-6">
                <p>{error}</p>
                <button onClick={onBackToList} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Quay lại danh sách</button>
            </div>
        );
    }

    if (!lotDetails) {
        return (
            <div className="p-6 bg-yellow-100 text-yellow-800 rounded-lg shadow-md m-6">
                <p>Không tìm thấy thông tin lô hàng.</p>
                <button onClick={onBackToList} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Quay lại danh sách</button>
            </div>
        );
    }

    const getRemainingQuantity = lotDetails.quantity_in - lotDetails.quantity_out;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-3">Chi tiết Lô hàng: {lotDetails.id}</h1>
            
            <button onClick={onBackToList} className="mb-6 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
                &larr; Quay lại danh sách
            </button>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Thông tin Lô hàng</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                    <p><strong className="font-medium">Sản phẩm:</strong> {lotDetails.variant.full_name || lotDetails.variant.sku}</p>
                    <p><strong className="font-medium">ID Biến thể:</strong> {lotDetails.variant_id}</p>
                    <p><strong className="font-medium">Ngày nhập:</strong> {new Date(lotDetails.purchase_date).toLocaleString()}</p>
                    <p><strong className="font-medium">Giá vốn đơn vị:</strong> {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(lotDetails.unit_cost)}</p>
                    <p><strong className="font-medium">Số lượng nhập:</strong> {lotDetails.quantity_in}</p>
                    <p><strong className="font-medium">Số lượng đã xuất:</strong> {lotDetails.quantity_out}</p>
                    <p><strong className="font-medium">Số lượng còn lại:</strong> <span className="font-bold text-lg">{getRemainingQuantity}</span></p>
                    <p><strong className="font-medium">Ngày tạo:</strong> {new Date(lotDetails.created_at).toLocaleString()}</p>
                    <p><strong className="font-medium">Ngày cập nhật:</strong> {new Date(lotDetails.updated_at).toLocaleString()}</p>
                    <p><strong className="font-medium">Loại tham chiếu: </strong> {lotDetails.reference_type}</p>
                    <p><strong className="font-medium">ID tham chiếu: </strong> {lotDetails.reference_id}</p>

                    {/* {lotDetails.grn_item && (
                        <p><strong className="font-medium">Tham chiếu GRN Item:</strong> {lotDetails.grn_item.id} (GRN: {lotDetails.grn_item.grn_id})</p>
                    )} */}
                    {lotDetails.grn_item?.grn?.purchase_order?.supplier && (
                         <p><strong className="font-medium">Nhà cung cấp:</strong> {lotDetails.grn_item.grn.purchase_order.supplier.name}</p>
                    )}
                </div>
                 {getRemainingQuantity > 0 && (
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => onAdjustStock(lotDetails.id)}
                            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors"
                        >
                            Điều chỉnh tồn kho
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Lịch sử Giao dịch</h2>
                {transactions.length === 0 ? (
                    <p className="text-gray-500">Không có giao dịch nào cho lô hàng này.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Giao dịch</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại giao dịch</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tham chiếu</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người thực hiện</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ghi chú</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {transactions.map((tx) => (
                                    <tr key={tx.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tx.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.transaction_type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.quantity}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {tx.reference_type && tx.reference_id ? `${tx.reference_type.split('\\').pop()}:${tx.reference_id}` : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.user_id || 'Hệ thống'}</td> {/* Display user_id or 'System' */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.notes || 'Không có'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(tx.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- AdjustStockModal Component ---
interface AdjustStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    lotId: number;
    onSuccess: () => void; // Callback to refresh data after successful adjustment
}

const AdjustStockModal: React.FC<AdjustStockModalProps> = ({ isOpen, onClose, lotId, onSuccess }) => {
    const [lotDetails, setLotDetails] = useState<StockLot | null>(null);
    const [transactionTypes, setTransactionTypes] = useState<{ [key: string]: string }>({});
    const [quantityChange, setQuantityChange] = useState<number>(0);
    const [selectedTransactionType, setSelectedTransactionType] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch initial data for the form
    useEffect(() => {
        if (isOpen && lotId) {
            const fetchFormData = async () => {
                setIsLoadingData(true);
                setError(null);
                try {
                    const response = await stockLotApi.getAdjustFormDetails(lotId);
                    setLotDetails(response.data.stock_lot);
                    setTransactionTypes(response.data.transaction_types_options);
                    setSelectedTransactionType(Object.keys(response.data.transaction_types_options)[0] || ''); // Select first type by default
                } catch (err: any) {
                    setError(err.message || 'Không thể tải dữ liệu điều chỉnh.');
                    console.error('Failed to fetch adjust form data:', err);
                } finally {
                    setIsLoadingData(false);
                }
            };
            fetchFormData();
        } else {
            // Reset state when modal is closed
            setLotDetails(null);
            setTransactionTypes({});
            setQuantityChange(0);
            setSelectedTransactionType('');
            setNotes('');
            setError(null);
        }
    }, [isOpen, lotId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        if (quantityChange === 0) {
            setError('Số lượng thay đổi không được bằng 0.');
            setIsSubmitting(false);
            return;
        }
        if (!selectedTransactionType) {
            setError('Vui lòng chọn loại điều chỉnh.');
            setIsSubmitting(false);
            return;
        }

        const data: AdjustStockLotData = {
            quantity_change: quantityChange,
            transaction_type: selectedTransactionType,
            notes: notes || undefined, // Send notes only if not empty
        };

        try {
            await stockLotApi.adjustStockLotQuantity(lotId, data);
            onSuccess(); // Trigger data refresh in parent
            onClose(); // Close modal
        } catch (err: any) {
            setError(err.message || 'Lỗi khi điều chỉnh tồn kho.');
            console.error('Failed to adjust stock:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Determine current remaining quantity
    const currentRemaining = lotDetails ? (lotDetails.quantity_in - lotDetails.quantity_out) : 0;
    const projectedRemaining = currentRemaining + quantityChange;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                    &times;
                </button>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b pb-2">Điều chỉnh tồn kho lô ID: {lotId}</h2>

                {isLoadingData ? (
                    <div className="flex justify-center items-center h-32">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
                    </div>
                ) : (
                    <>
                        {lotDetails && (
                            <div className="mb-4 text-gray-700">
                                <p><strong className="font-medium">Sản phẩm:</strong> {lotDetails.variant.full_name || lotDetails.variant.sku}</p>
                                <p><strong className="font-medium">SL Còn lại hiện tại:</strong> {currentRemaining}</p>
                                <p><strong className="font-medium">Giá vốn đơn vị:</strong> {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(lotDetails.unit_cost)}</p>
                            </div>
                        )}
                        
                        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="quantity_change" className="block text-sm font-medium text-gray-700 mb-1">Số lượng thay đổi:</label>
                                <input
                                    type="number"
                                    id="quantity_change"
                                    name="quantity_change"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                                    value={quantityChange}
                                    onChange={(e) => setQuantityChange(parseInt(e.target.value) || 0)}
                                    required
                                />
                                <p className="text-sm text-gray-500 mt-1">Sử dụng số âm (-) để giảm, số dương (+) để tăng.</p>
                            </div>
                            <div>
                                <label htmlFor="transaction_type" className="block text-sm font-medium text-gray-700 mb-1">Loại điều chỉnh:</label>
                                <select
                                    id="transaction_type"
                                    name="transaction_type"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                                    value={selectedTransactionType}
                                    onChange={(e) => setSelectedTransactionType(e.target.value)}
                                    required
                                >
                                    <option value="">Chọn loại</option>
                                    {Object.entries(transactionTypes).map(([key, value]) => (
                                        <option key={key} value={key}>{value}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (Tùy chọn):</label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    rows={3}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    maxLength={500}
                                ></textarea>
                            </div>

                            <p className="text-lg font-semibold mt-4">
                                SL còn lại dự kiến: <span className={projectedRemaining < 0 ? 'text-red-600' : 'text-green-600'}>{projectedRemaining}</span>
                            </p>
                            {projectedRemaining < 0 && (
                                <p className="text-red-500 text-sm mt-1">Lưu ý: Số lượng tồn kho không thể âm. Vui lòng kiểm tra lại.</p>
                            )}

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || projectedRemaining < 0}
                                    className={`px-5 py-2 rounded-md text-white font-semibold shadow-md transition-colors
                                        ${isSubmitting || projectedRemaining < 0
                                            ? 'bg-indigo-300 cursor-not-allowed'
                                            : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75'
                                        }`}
                                >
                                    {isSubmitting ? 'Đang xử lý...' : 'Xác nhận Điều chỉnh'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

// --- Main App Component ---
const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<'list' | 'details'>('list');
    const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
    const [filters, setFilters] = useState<GetStockLotsFilters>({});
    const [stockLotsData, setStockLotsData] = useState<PaginatedResponse<StockLot> | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [variants, setVariants] = useState<Variant[]>([]); // For filter dropdown
    const [suppliers, setSuppliers] = useState<Supplier[]>([]); // For filter dropdown
    const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);
    const [notification, setNotification] = useState<{ message: string | null; type: 'success' | 'error' | null }>({ message: null, type: null });

    const fetchStockLots = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await stockLotApi.getPaginatedStockLots(filters);
            setStockLotsData(response.data);
        } catch (err: any) {
            setError(err.message || 'Lỗi khi tải danh sách lô hàng.');
            setNotification({ message: err.message || 'Lỗi khi tải danh sách lô hàng.', type: 'error' });
            console.error('Failed to fetch stock lots:', err);
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    // Fetch initial variants and suppliers for filters (assuming separate APIs exist)
    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                // IMPORTANT: Replace these placeholder API calls with your actual backend endpoints
                // For example, if you have /admin/variants and /admin/suppliers APIs
                const variantsResponse = await axiosRequest<ApiResponse<Variant[]>>('admin/variants', 'GET');
                setVariants(variantsResponse.data);

                const suppliersResponse = await axiosRequest<ApiResponse<Supplier[]>>('admin/suppliers', 'GET');
                setSuppliers(suppliersResponse.data);

            } catch (err) {
                console.error('Failed to fetch filter options:', err);
                // Optionally set a notification for this error too
            }
        };
        fetchFilterOptions();
    }, []);


    // Fetch stock lots when filters change or on initial load
    useEffect(() => {
        fetchStockLots();
    }, [fetchStockLots]);

    const handleFilterChange = (newFilters: GetStockLotsFilters) => {
        setFilters(newFilters);
    };

    const handlePageChange = (page: number) => {
        setFilters(prev => ({ ...prev, page }));
    };

    const handleViewDetails = (lotId: number) => {
        setSelectedLotId(lotId);
        setCurrentPage('details');
    };

    const handleBackToList = () => {
        setSelectedLotId(null);
        setCurrentPage('list');
        fetchStockLots(); // Refresh list after returning from details/adjustment
    };

    const handleAdjustStock = (lotId: number) => {
        setSelectedLotId(lotId);
        setShowAdjustModal(true);
    };

    // const handleAdjustmentSuccess = () => {
    //     setNotification({ message: 'Điều chỉnh tồn kho thành công!', type: 'success' });
    //     // Refresh the list or the detail page depending on current view
    //     if (currentPage === 'list') {
    //         fetchStockLots();
    //     } else if (currentPage === 'details' && selectedLotId) {
    //         // Re-fetch details to show updated quantity and transactions
    //         setSelectedLotId(null); // Force re-render of details component by resetting then setting
    //         // setTimeout(() => setSelectedLotId(lotId), 0);
    //     }
    // };
    const handleAdjustmentSuccess = () => {
        setNotification({ message: 'Điều chỉnh tồn kho thành công!', type: 'success' });
        setShowAdjustModal(false); // Đóng modal ngay lập tức

        if (currentPage === 'details' && selectedLotId !== null) {
            // Nếu đang ở trang chi tiết, ở lại trang chi tiết và tải lại dữ liệu
            const currentLotId = selectedLotId; // Lưu lại ID lô hàng hiện tại
            setSelectedLotId(null); // Đặt null để buộc component chi tiết re-render và fetch dữ liệu mới
            setTimeout(() => {
                setSelectedLotId(currentLotId); // Thiết lập lại ID để kích hoạt useEffect fetchDetails
            }, 0);
        } else {
            // Nếu đang ở trang danh sách, hoặc không có lô nào được chọn, quay về danh sách và làm mới
            setSelectedLotId(null); 
            setCurrentPage('list');
            fetchStockLots();
        }
    };

    const closeNotification = () => {
        setNotification({ message: null, type: null });
    };


    return (
        <div className="font-sans antialiased bg-gray-100 text-gray-900">
            <Notification {...notification} onClose={closeNotification} />

            {currentPage === 'list' && (
                <StockLotList
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onPageChange={handlePageChange}
                    stockLotsData={stockLotsData}
                    onViewDetails={handleViewDetails}
                    onAdjustStock={handleAdjustStock}
                    isLoading={isLoading}
                    error={error}
                    variants={variants}
                    suppliers={suppliers}
                />
            )}

            {currentPage === 'details' && selectedLotId && (
                <StockLotDetails
                    lotId={selectedLotId}
                    onBackToList={handleBackToList}
                    onAdjustStock={handleAdjustStock}
                />
            )}

            {showAdjustModal && selectedLotId && (
                <AdjustStockModal
                    isOpen={showAdjustModal}
                    onClose={() => setShowAdjustModal(false)}
                    lotId={selectedLotId}
                    onSuccess={handleAdjustmentSuccess}
                />
            )}
        </div>
    );
};

export default App;
