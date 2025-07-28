'use client'; // Client Component for hooks

import React, { useEffect, useState, useCallback } from 'react';
import HeroStatsCard from '@/components/common/Admin_Panel/HeroStatsCard';
import SalesChart from '@/components/common/Admin_Panel/SalesChart';
import TopSellingProducts from '@/components/common/Admin_Panel/TopSellingProducts';
import LowStockAlerts from '@/components/common/Admin_Panel/LowStockAlerts';
import RecentActivities from '@/components/common/Admin_Panel/RecentActivities';

import statisticApi, {
  DashboardSummary,
  SalesTrendData,
  TopSellingProduct,
  StockAlert,
  RecentActivity,
} from '@/features/statistics/api/statisticApi'; // Import statisticApi object

import { formatCurrency } from '@/lib/utils';

// Utility function to format date to YYYY-MM-DD
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [salesData, setSalesData] = useState<SalesTrendData | null>(null);
  const [topProducts, setTopProducts] = useState<TopSellingProduct[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<StockAlert[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for date range and period selection
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Function to calculate default dates based on the selected period
  const calculateDefaultDates = useCallback((selectedPeriod: 'daily' | 'weekly' | 'monthly') => {
    const today = new Date();
    let defaultStartDate = new Date();

    switch (selectedPeriod) {
      case 'daily':
        defaultStartDate.setDate(today.getDate() - 6); // Last 7 days including today
        break;
      case 'weekly':
        defaultStartDate.setDate(today.getDate() - 7 * 4); // Last 4 weeks
        break;
      case 'monthly':
        defaultStartDate.setMonth(today.getMonth() - 5); // Last 6 months
        defaultStartDate.setDate(1); // Start from the 1st of the month
        break;
      default:
        defaultStartDate.setDate(today.getDate() - 6); // Fallback to 7 days
    }
    setStartDate(formatDate(defaultStartDate));
    setEndDate(formatDate(today));
  }, []);

  // Effect to calculate default dates when component mounts or period changes
  useEffect(() => {
    calculateDefaultDates(period);
  }, [period, calculateDefaultDates]);

  // Function to fetch all dashboard data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Dashboard Summary
      const summaryResponse = await statisticApi.getDashboardSummary();
      setSummary(summaryResponse);

      // Fetch Sales Trend Data with selected dates and period
      // This is the crucial part: passing period, startDate, and endDate
      const salesDataResponse = await statisticApi.getSalesTrendData(period, startDate, endDate);
      setSalesData(salesDataResponse);

      // Fetch Top Selling Products (e.g., 5 best-selling products of the month)
      const topProductsResponse = await statisticApi.getTopSellingProducts(5, 'monthly');
      setTopProducts(topProductsResponse);

      // Fetch Low Stock Alerts
      const lowStockAlertsResponse = await statisticApi.getStockAlerts('low_stock');
      setLowStockAlerts(lowStockAlertsResponse);

      // Fetch Recent Activities
      const recentActivitiesResponse = await statisticApi.getRecentActivities(10);
      setRecentActivities(recentActivitiesResponse);

    } catch (err: any) {
      console.error("Failed to fetch dashboard data:", err);
      setError(err.message || "Không thể tải dữ liệu dashboard. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate]); // Add all relevant dependencies

  // Effect to fetch data when fetchData changes (due to period, startDate, endDate changes)
  useEffect(() => {
    // Only fetch when startDate and endDate are set (after initial default calculation)
    if (startDate && endDate) {
      fetchData();
    }
  }, [fetchData, startDate, endDate]);


  if (loading && !salesData) { // Only show full-screen loading if initial salesData is not available
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600 text-lg">Đang tải dữ liệu dashboard...</p>
      </div>
    );
  }

  if (error && !salesData) { // Only show full-screen error if initial salesData is not available
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        <p>Lỗi: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Tổng Quan</h1>

       {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <HeroStatsCard
          title="Tổng Giá Trị Tồn Kho"
          value={summary?.totalInventoryValueFormatted || formatCurrency(0)}
          type="inventory"
          trend={summary?.totalInventoryValueTrend || null}
        />
        <HeroStatsCard
          title="Doanh Thu Hôm Nay"
          value={summary?.todayRevenueFormatted || formatCurrency(0)}
          type="revenue"
          trend={summary?.todayRevenueTrend || null}
        />
        <HeroStatsCard
          title="Lợi Nhuận Hôm Nay"
          value={summary?.todayProfitFormatted || formatCurrency(0)}
          type="revenue" // Có thể dùng icon 'revenue' cho profit, hoặc tạo icon mới nếu có
          trend={summary?.todayProfitTrend || null} // Đã thêm trend cho lợi nhuận
        />
        <HeroStatsCard
          title="Đơn Hàng Mới"
          value={summary?.newOrdersTodayFormatted || '0'} // Đã sử dụng formatted value
          type="orders"
          trend={summary?.newOrdersTrend || null}
        />
        <HeroStatsCard
          title="Sản Phẩm Cần Nhập Thêm"
          value={summary?.lowStockItemsCountFormatted || '0'} // Đã sử dụng formatted value
          type="alert"
        />
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart Section with Period and Date Range Selection */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 lg:col-span-2">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4 border-gray-200">Doanh Thu & Lợi Nhuận</h2>

          {/* Period Selection Buttons */}
          <div className="mb-6 flex flex-wrap gap-3 justify-center sm:justify-start">
            <button
              onClick={() => setPeriod('daily')}
              className={`
                px-5 py-2.5 rounded-full font-semibold text-sm
                transition-all duration-300 ease-in-out
                ${period === 'daily'
                  ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700'
                }
              `}
            >
              Hàng ngày
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`
                px-5 py-2.5 rounded-full font-semibold text-sm
                transition-all duration-300 ease-in-out
                ${period === 'weekly'
                  ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700'
                }
              `}
            >
              Hàng tuần
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`
                px-5 py-2.5 rounded-full font-semibold text-sm
                transition-all duration-300 ease-in-out
                ${period === 'monthly'
                  ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700'
                }
              `}
            >
              Hàng tháng
            </button>
          </div>

          {/* Date Range Selection */}
          <div className="mb-8 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full sm:w-auto">
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Từ ngày:
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 p-2.5 text-gray-700 transition duration-150 ease-in-out"
              />
            </div>
            <div className="flex-1 w-full sm:w-auto">
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                Đến ngày:
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 p-2.5 text-gray-700 transition duration-150 ease-in-out"
              />
            </div>
            <button
              onClick={fetchData} // Call fetchData to load new data
              disabled={loading}
              className="w-full sm:w-auto mt-4 sm:mt-auto px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold rounded-lg shadow-md hover:from-blue-600 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 ease-in-out transform hover:scale-105"
            >
              {loading ? 'Đang tải...' : 'Tải dữ liệu'}
            </button>
          </div>

          {loading && ( // Loading state only for the chart data
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-500 text-lg">Đang tải dữ liệu biểu đồ...</p>
            </div>
          )}
          {error && ( // Error state only for the chart data
            <div className="flex justify-center items-center h-64">
              <p className="text-red-600 text-lg font-medium">Lỗi: {error}</p>
            </div>
          )}
          {!loading && !error && salesData && salesData.labels.length > 0 ? (
            <SalesChart data={salesData} />
          ) : (
            !loading && !error && (
              <div className="flex justify-center items-center h-64">
                <p className="text-gray-500 text-lg">Không có dữ liệu doanh thu và lợi nhuận cho giai đoạn này.</p>
              </div>
            )
          )}
        </div>

        {/* Other components */}
        <TopSellingProducts products={topProducts} />
        <LowStockAlerts alerts={lowStockAlerts} />
        <RecentActivities activities={recentActivities} />
      </div>
    </div>
  );
}
