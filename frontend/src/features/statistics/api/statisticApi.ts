import { axiosRequest } from '@/lib/axiosRequest'; // Import axiosRequest đã cấu hình sẵn
// import { formatCurrency } from '@/lib/utils'; // Không cần thiết ở đây vì backend đã format

export interface PaginatedData<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: {
    url: string | null;
    label: string;
    active: boolean;
  }[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export interface DashboardSummary {
  totalInventoryValue: number;
  totalInventoryValueFormatted: string;
  totalInventoryValueTrend: string; // Đã được tính toán động từ backend PHP

  todayRevenue: number;
  todayRevenueFormatted: string;
  todayRevenueTrend: string; // Đã được tính toán động từ backend PHP

  todayProfit: number; // Đã sửa từ string sang number
  todayProfitFormatted: string;
  todayProfitTrend: string; // Đã thêm vào interface, được tính toán động từ backend PHP

  newOrdersToday: number;
  newOrdersTodayFormatted: string; // Đã thêm vào interface
  newOrdersTrend: string; // Đã được tính toán động từ backend PHP

  lowStockItemsCount: number;
  lowStockItemsCountFormatted: string; // Đã thêm vào interface
}
export interface SalesTrendData {
  labels: string[];
  salesValues: number[]; // Đổi tên từ 'values' để rõ nghĩa hơn
  profitValues: number[]; // THÊM TRƯỜNG MỚI CHO LỢI NHUẬN
}

// Giao diện cho Top Selling Product
export interface TopSellingProduct {
  id: number;
  name: string;
  quantity: number;
  revenue: number;
}

// Giao diện cho Stock Alert
export interface StockAlert {
  id: string; // low_ID hoặc expired_ID
  productName: string;
  currentStock: number;
  type: 'low_stock' | 'expired_soon';
  threshold?: number; // Chỉ có cho low_stock
  unit: string;
}

// Giao diện cho Recent Activity
export interface RecentActivity {
  id: string; // grn_ID hoặc order_ID
  type: 'import' | 'export';
  productName: string;
  quantity: number;
  user: string;
  timeAgo: string; // "X minutes ago", "Y hours ago"
  unit: string;
}

// ==========================================================
// 2. API SERVICE FUNCTIONS (Các hàm gọi API)
// ==========================================================

// Không cần BASE_URL ở đây vì axiosRequest đã có baseURL trong axiosInstance

const statisticApi = {
  /**
   * Lấy các số liệu tổng quan cho Dashboard HeroStatsCard.
   * Tương ứng với: GET /api/admin/dashboard-summary
   * @returns {Promise<DashboardSummary>}
   */
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    try {
      // Sử dụng axiosRequest với method GET
      const response = await axiosRequest<any>('/admin/dashboard-summary', 'GET');
      // Backend trả về data.data, nên cần truy cập thêm một lớp .data
      return response.data;
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      throw error;
    }
  },

  /**
   * Lấy dữ liệu cho biểu đồ doanh thu.
   * Tương ứng với: GET /api/admin/sales-trend-data
   * @param {'daily' | 'weekly' | 'monthly'} period 'daily', 'weekly', 'monthly'
   * @param {string} [startDate] YYYY-MM-DD
   * @param {string} [endDate] YYYY-MM-DD
   * @returns {Promise<SalesTrendData>}
   */
  getSalesTrendData: async (
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    startDate?: string,
    endDate?: string
  ): Promise<SalesTrendData> => {
    try {
      const params: { period: string; startDate?: string; endDate?: string } = { period };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      // Sử dụng axiosRequest với method GET và truyền params vào config
      const response = await axiosRequest<any>('/admin/sales-trend-data', 'GET', undefined, { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching sales trend data:", error);
      throw error;
    }
  },
 /**
   * Lấy danh sách sản phẩm bán chạy nhất CÓ PHÂN TRANG.
   * @param {number} [per_page=10] Số lượng sản phẩm trên mỗi trang
   * @param {number} [page=1] Trang hiện tại
   * @param {'weekly' | 'monthly' | 'quarterly' | 'yearly'} [period='monthly'] Khoảng thời gian
   * @returns {Promise<PaginatedData<TopSellingProduct>>}
   */
  getTopSellingProducts: async (
    per_page: number = 10, 
    page: number = 1,
    period: 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ): Promise<PaginatedData<TopSellingProduct>> => {
    try {
      const params = {
        per_page: per_page.toString(),
        page: page.toString(),
        period: period,
      };
      const response = await axiosRequest<any>('/admin/top-selling-products', 'GET', undefined, { params });
      // Backend giờ trả về đối tượng phân trang, nên return response.data trực tiếp
      return response.data;
    } catch (error) {
      console.error("Error fetching top selling products:", error);
      throw error;
    }
  },

  /**
   * Lấy danh sách cảnh báo tồn kho thấp hoặc sắp hết hạn CÓ PHÂN TRANG.
   * @param {'low_stock' | 'expired_soon'} [type='low_stock'] Lọc theo loại cảnh báo
   * @param {number} [per_page=10] Số lượng cảnh báo trên mỗi trang
   * @param {number} [page=1] Trang hiện tại
   * @returns {Promise<PaginatedData<StockAlert>>}
   */
  getStockAlerts: async (
    type: 'low_stock' | 'expired_soon' = 'low_stock',
    per_page: number = 10,
    page: number = 1
  ): Promise<PaginatedData<StockAlert>> => {
    try {
      const params = {
        type: type,
        per_page: per_page.toString(),
        page: page.toString(),
      };
      const response = await axiosRequest<any>('/admin/stock-alerts', 'GET', undefined, { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching stock alerts:", error);
      throw error;
    }
  },

  /**
   * Lấy các hoạt động gần đây (nhập và xuất) CÓ PHÂN TRANG.
   * @param {number} [per_page=10] Số lượng hoạt động trên mỗi trang
   * @param {number} [page=1] Trang hiện tại
   * @returns {Promise<PaginatedData<RecentActivity>>}
   */
  getRecentActivities: async (
    per_page: number = 10,
    page: number = 1
  ): Promise<PaginatedData<RecentActivity>> => {
    try {
      const params = {
        per_page: per_page.toString(),
        page: page.toString(),
      };
      const response = await axiosRequest<any>('/admin/recent-activities', 'GET', undefined, { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      throw error;
    }
  },
  // /**
  //  * Lấy danh sách sản phẩm bán chạy nhất.
  //  * Tương ứng với: GET /api/admin/top-selling-products
  //  * @param {number} [limit=5] Số lượng sản phẩm muốn lấy
  //  * @param {'weekly' | 'monthly' | 'quarterly' | 'yearly'} [period='monthly'] Khoảng thời gian
  //  * @returns {Promise<TopSellingProduct[]>}
  //  */
  // getTopSellingProducts: async (
  //   limit: number = 5,
  //   period: 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  // ): Promise<TopSellingProduct[]> => {
  //   try {
  //     const params = {
  //       limit: limit.toString(),
  //       period: period,
  //     };
  //     // Sử dụng axiosRequest với method GET và truyền params vào config
  //     const response = await axiosRequest<any>('/admin/top-selling-products', 'GET', undefined, { params });
  //     return response.data;
  //   } catch (error) {
  //     console.error("Error fetching top selling products:", error);
  //     throw error;
  //   }
  // },

  // /**
  //  * Lấy danh sách cảnh báo tồn kho thấp hoặc sắp hết hạn.
  //  * Tương ứng với: GET /api/admin/stock-alerts
  //  * @param {'low_stock' | 'expired_soon'} [type] Lọc theo loại cảnh báo
  //  * @returns {Promise<StockAlert[]>}
  //  */
  // getStockAlerts: async (type?: 'low_stock' | 'expired_soon'): Promise<StockAlert[]> => {
  //   try {
  //     const params: { type?: string } = {};
  //     if (type) params.type = type;

  //     // Sử dụng axiosRequest với method GET và truyền params vào config
  //     const response = await axiosRequest<any>('/admin/stock-alerts', 'GET', undefined, { params });
  //     return response.data;
  //   } catch (error) {
  //     console.error("Error fetching stock alerts:", error);
  //     throw error;
  //   }
  // },

  // /**
  //  * Lấy các hoạt động gần đây (nhập và xuất).
  //  * Tương ứng với: GET /api/admin/recent-activities
  //  * @param {number} [limit=10] Số lượng hoạt động muốn lấy
  //  * @returns {Promise<RecentActivity[]>}
  //  */
  // getRecentActivities: async (limit: number = 10): Promise<RecentActivity[]> => {
  //   try {
  //     const params = { limit: limit.toString() };
  //     // Sử dụng axiosRequest với method GET và truyền params vào config
  //     const response = await axiosRequest<any>('/admin/recent-activities', 'GET', undefined, { params });
  //     return response.data;
  //   } catch (error) {
  //     console.error("Error fetching recent activities:", error);
  //     throw error;
  //   }
  // },
};

export default statisticApi;
