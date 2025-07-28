<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Variant;
use App\Models\StockLot;
use App\Models\Grn;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log; // Đã thêm để ghi log lỗi
use App\Models\InventoryTransaction;
use NumberFormatter;
class StatisticService
{
    private const DEFAULT_MIN_STOCK_THRESHOLD = 10;

     /**
     * Lấy tóm tắt các chỉ số chính cho dashboard.
     *
     * @return array
     */
    public function getDashboardSummary(): array
    {
        // Lấy múi giờ của ứng dụng từ cấu hình (APP_TIMEZONE trong .env).
        $today = Carbon::today(); // Ngày hiện tại
        $yesterday = Carbon::yesterday(); // Ngày hôm qua

        // --- ĐỊNH NGHĨA TẤT CẢ CÁC BIẾN "NGÀY HÔM QUA" TRƯỚC KHI SỬ DỤNG ---

        // Tổng giá trị tồn kho của ngày hôm qua (tổng các lô còn tồn đến cuối ngày hôm qua)
        $yesterdayInventoryValue = StockLot::query()
            ->select(DB::raw('SUM((quantity_in - quantity_out) * unit_cost) as total_value'))
            ->whereRaw('(quantity_in - quantity_out) > 0')
            ->where('created_at', '<=', $yesterday->endOfDay())
            ->value('total_value') ?? 0;

        // Doanh thu hôm qua
        $yesterdayRevenue = Order::query()
            ->whereDate('created_at', $yesterday)
            ->where('status', 'completed')
            ->sum('total_price') ?? 0;

        // Lợi nhuận hôm qua
        $yesterdayProfit = Order::query()
            ->whereDate('created_at', $yesterday)
            ->where('status', 'completed')
            ->sum(DB::raw('total_price - total_cogs')) ?? 0;

        // Số lượng đơn hàng mới hôm qua
        $newOrdersYesterday = Order::query()
            ->whereDate('created_at', $yesterday)
            ->count();

        // --- BẮT ĐẦU KHỐI TRY-CATCH CHO CÁC TÍNH TOÁN NGÀY HIỆN TẠI VÀ XU HƯỚNG ---
        try {
            // 1. Tổng giá trị tồn kho (Total Inventory Value) hiện tại
            $totalInventoryValue = StockLot::query()
                ->select(DB::raw('SUM((quantity_in - quantity_out) * unit_cost) as total_value'))
                ->whereRaw('(quantity_in - quantity_out) > 0')
                ->value('total_value') ?? 0;

            // 2. Doanh thu hôm nay (Today's Revenue)
            // Chỉ tính các đơn hàng có trạng thái 'completed' và được tạo trong ngày hôm nay.
            $todayRevenue = Order::query()
                ->whereDate('created_at', $today)
                ->where('status', 'completed')
                ->sum('total_price') ?? 0;

            // 3. Lợi nhuận hôm nay (Today's Profit)
            // Chỉ tính các đơn hàng có trạng thái 'completed' và được tạo trong ngày hôm nay.
            $todayProfit = Order::query()
                ->whereDate('created_at', $today)
                ->where('status', 'completed')
                ->sum(DB::raw('total_price - total_cogs')) ?? 0;

            // 4. Số lượng đơn hàng mới (New Orders Today)
            // Lấy số lượng đơn hàng được tạo trong ngày hôm nay, bất kể trạng thái.
            $newOrdersToday = Order::query()
                ->whereDate('created_at', $today)
                ->count();

            // 5. Số sản phẩm cần nhập thêm (Low Stock Items Count)
            $lowStockItemsCount = Variant::query()
                ->where('stock', '<', self::DEFAULT_MIN_STOCK_THRESHOLD)
                ->count();

            // --- Tính toán các giá trị xu hướng (giờ đây các biến "yesterday" đã được định nghĩa) ---
            $totalInventoryValueTrend = $this->calculatePercentageTrend($totalInventoryValue, $yesterdayInventoryValue);
            $todayRevenueTrend = $this->calculatePercentageTrend($todayRevenue, $yesterdayRevenue);
            $todayProfitTrend = $this->calculatePercentageTrend($todayProfit, $yesterdayProfit);
            $newOrdersTrend = $this->calculateAbsoluteTrend($newOrdersToday, $newOrdersYesterday, 'đơn');

            // --- Định dạng tiền tệ và số ---
            $formatter = new NumberFormatter('vi_VN', NumberFormatter::CURRENCY);
            $formatter->setTextAttribute(NumberFormatter::CURRENCY_CODE, 'VND');
            $formatter->setAttribute(NumberFormatter::FRACTION_DIGITS, 0);

            return [
                'totalInventoryValue' => (float) $totalInventoryValue,
                'totalInventoryValueFormatted' => $formatter->format($totalInventoryValue),
                'totalInventoryValueTrend' => $totalInventoryValueTrend,

                'todayRevenue' => (float) $todayRevenue,
                'todayRevenueFormatted' => $formatter->format($todayRevenue),
                'todayRevenueTrend' => $todayRevenueTrend,

                'todayProfit' => (float) $todayProfit,
                'todayProfitFormatted' => $formatter->format($todayProfit),
                'todayProfitTrend' => $todayProfitTrend,

                'newOrdersToday' => $newOrdersToday,
                'newOrdersTodayFormatted' => number_format($newOrdersToday),
                'newOrdersTrend' => $newOrdersTrend,

                'lowStockItemsCount' => $lowStockItemsCount,
                'lowStockItemsCountFormatted' => number_format($lowStockItemsCount),
            ];

        } catch (\Exception $e) {
            Log::error("StatisticService@getDashboardSummary error: " . $e->getMessage());
            throw $e; // Ném lại ngoại lệ để controller xử lý
        }
    }


     /**
     * Tính toán xu hướng phần trăm thay đổi.
     *
     * @param float $currentValue
     * @param float $previousValue
     * @return string
     */
    protected function calculatePercentageTrend(float $currentValue, float $previousValue): string
    {
        if ($previousValue == 0) {
            if ($currentValue > 0) {
                return '+∞%'; // Tăng vô hạn
            }
            return '0%'; // Không có thay đổi
        }

        $change = $currentValue - $previousValue;
        $percentage = ($change / $previousValue) * 100;

        $sign = ($percentage >= 0) ? '+' : '';
        return $sign . round($percentage, 2) . '%';
    }

    /**
     * Tính toán xu hướng thay đổi tuyệt đối.
     *
     * @param int $currentValue
     * @param int $previousValue
     * @param string $unit Đơn vị (e.g., 'đơn', 'sản phẩm')
     * @return string
     */
    protected function calculateAbsoluteTrend(int $currentValue, int $previousValue, string $unit = ''): string
    {
        $change = $currentValue - $previousValue;
        $sign = ($change >= 0) ? '+' : '';
        return $sign . abs($change) . ' ' . $unit;
    }
    /**
     * Lấy dữ liệu cho biểu đồ doanh thu.
     * Tương ứng với: GET /api/reports/sales-trend-data
     * @param string $period 'daily', 'weekly', 'monthly'
     * @param string|null $startDate YYYY-MM-DD
     * @param string|null $endDate YYYY-MM-DD
     * @return array
     */
    public function getSalesTrendData(string $period = 'daily', ?string $startDate = null, ?string $endDate = null): array
    {
        // Mặc định Carbon::parse() sẽ sử dụng múi giờ của ứng dụng nếu không chỉ định
        // Carbon::today('Asia/Ho_Chi_Minh') là đúng nếu bạn muốn cứng múi giờ này
        // nhưng nếu APP_TIMEZONE đã là Asia/Ho_Chi_Minh thì Carbon::today() là đủ.
        $query = Order::query()->where('status', 'completed');

        // Phân tích ngày với múi giờ của ứng dụng (được cấu hình trong app.php)
        $endDate = $endDate ? Carbon::parse($endDate) : Carbon::today(); // Sử dụng Carbon::today()
        $startDate = $startDate ? Carbon::parse($startDate) : $endDate->copy()->subDays(6);

        // Đảm bảo toàn bộ khoảng thời gian được bao phủ từ đầu ngày bắt đầu đến cuối ngày kết thúc
        $query->whereBetween('created_at', [$startDate->startOfDay(), $endDate->endOfDay()]);

        $labels = [];
        $salesValues = [];
        $profitValues = [];

        switch ($period) {
            case 'daily':
                $data = $query->select(
                    DB::raw('DATE(created_at) as date'),
                    DB::raw('SUM(total_price) as total_sales'),
                    DB::raw('SUM(total_price - total_cogs) as total_profit')
                )
                    ->groupBy('date')
                    ->orderBy('date')
                    ->get();

                $currentDate = $startDate->copy();
                while ($currentDate->lessThanOrEqualTo($endDate)) {
                    $dateString = $currentDate->toDateString();
                    $labels[] = $currentDate->isoFormat('ddd DD/MM'); // Ví dụ: "T2 01/07"
                    $salesValues[] = $data->firstWhere('date', $dateString)?->total_sales ?? 0;
                    $profitValues[] = $data->firstWhere('date', $dateString)?->total_profit ?? 0;
                    $currentDate->addDay();
                }
                break;

            case 'weekly':
                // CHÚ Ý: YEARWEEK là hàm của MySQL. Nếu dùng PostgreSQL, cần thay thế bằng:
                // DB::raw("TO_CHAR(created_at, 'YYYYWW') as week")
                $data = $query->select(
                    DB::raw('YEARWEEK(created_at, 1) as week'), // Mode 1: tuần bắt đầu thứ 2
                    DB::raw('SUM(total_price) as total_sales'),
                    DB::raw('SUM(total_price - total_cogs) as total_profit')
                )
                    ->groupBy('week')
                    ->orderBy('week')
                    ->get();

                $labels = $data->pluck('week')->map(function($week) {
                    $year = substr($week, 0, 4);
                    $weekNum = substr($week, 4, 2);
                    return "Tuần " . $weekNum . "/" . $year;
                })->toArray();
                $salesValues = $data->pluck('total_sales')->toArray();
                $profitValues = $data->pluck('total_profit')->toArray();
                break;

            case 'monthly':
                // CHÚ Ý: DATE_FORMAT là hàm của MySQL. Nếu dùng PostgreSQL, cần thay thế bằng:
                // DB::raw("TO_CHAR(created_at, 'YYYY-MM') as month")
                $data = $query->select(
                    DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
                    DB::raw('SUM(total_price) as total_sales'),
                    DB::raw('SUM(total_price - total_cogs) as total_profit')
                )
                    ->groupBy('month')
                    ->orderBy('month')
                    ->get();

                $labels = $data->pluck('month')->map(fn($month) => Carbon::parse($month)->isoFormat('MM/YYYY'))->toArray(); // Ví dụ: "07/2024"
                $salesValues = $data->pluck('total_sales')->toArray();
                $profitValues = $data->pluck('total_profit')->toArray();
                break;

            default:
                $labels = [];
                $salesValues = [];
                $profitValues = [];
        }

        return [
            'labels' => $labels,
            'salesValues' => array_map('floatval', $salesValues),
            'profitValues' => array_map('floatval', $profitValues),
        ];
    }

    /**
     * Lấy danh sách sản phẩm bán chạy nhất.
     * Tương ứng với: GET /api/reports/top-selling-products
     * @param int $limit
     * @param string $period 'weekly', 'monthly', 'quarterly', 'yearly'
     * @return array
     */
    public function getTopSellingProducts(int $limit = 5, string $period = 'monthly'): array
    {
        $startDate = Carbon::today(); // Sử dụng múi giờ của APP_TIMEZONE
        switch ($period) {
            case 'weekly':
                $startDate->subWeek();
                break;
            case 'monthly':
                $startDate->subMonth();
                break;
            case 'quarterly':
                $startDate->subMonths(3);
                break;
            case 'yearly':
                $startDate->subYear();
                break;
            default: // Mặc định tháng gần nhất
                $startDate->subMonth();
        }

        $topProducts = OrderItem::query()
            ->select(
                'variant_id',
                DB::raw('SUM(quantity) as total_quantity_sold'),
                DB::raw('SUM(quantity * price) as total_revenue')
            )
            ->whereHas('order', function ($query) use ($startDate) {
                $query->where('status', 'completed')
                    ->where('created_at', '>=', $startDate->startOfDay()); // Đảm bảo bao gồm cả ngày bắt đầu
            })
            ->with('variant.product')
            ->groupBy('variant_id')
            ->orderByDesc('total_quantity_sold')
            ->limit($limit)
            ->get();

        return $topProducts->map(function ($item) {
            return [
                'id' => $item->variant_id,
                'name' => $item->variant->full_name ?? $item->variant->sku,
                'quantity' => (int) $item->total_quantity_sold,
                'revenue' => (float) $item->total_revenue,
            ];
        })->toArray();
    }

    /**
     * Lấy danh sách cảnh báo tồn kho thấp hoặc sắp hết hạn.
     * Tương ứng với: GET /api/reports/stock-alerts
     * @param string|null $type 'low_stock' | 'expired_soon'
     * @return array
     */
    public function getStockAlerts(?string $type = null): array
    {
        $alerts = [];

        if ($type === null || $type === 'low_stock') {
            $lowStockVariants = Variant::query()
                ->with(['product','variantSpecValues.specification','variantSpecValues.spec_options'])
                ->where('stock', '<', self::DEFAULT_MIN_STOCK_THRESHOLD)
                ->get();

            foreach ($lowStockVariants as $variant) {
                $alerts[] = [
                    'id' => 'low_' . $variant->id,
                    'productName' => $variant->full_name ?? $variant->sku,
                    'currentStock' => $variant->stock,
                    'type' => 'low_stock',
                    'threshold' => self::DEFAULT_MIN_STOCK_THRESHOLD,
                    'unit' => $variant->product->unit ?? 'sản phẩm',
                ];
            }
        }

        return $alerts;
    }

    /**
     * Lấy các hoạt động gần đây (nhập và xuất).
     * Tương ứng với: GET /api/reports/recent-activities
     * @param int $limit
     * @return array
     */
    public function getRecentActivities(int $limit = 10): array
    {
        $activities = collect();
        // Carbon::now() (không có đối số) sẽ sử dụng múi giờ của APP_TIMEZONE
        $currentTime = Carbon::now();

        // Lấy các hoạt động nhập hàng gần đây (GRN - Goods Received Note)
        $grnActivities = Grn::query()
            ->with(['user', 'items.purchaseOrderItem.variant.product'])
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->flatMap(function ($grn) use ($currentTime) {
                return $grn->items->map(function ($item) use ($grn, $currentTime) {
                    return [
                        'id' => 'grn_' . $item->id,
                        'type' => 'import',
                        'productName' => $item->purchaseOrderItem->variant->full_name ?? $item->purchaseOrderItem->variant->sku,
                        'quantity' => (int) $item->quantity,
                        'user' => $grn->user->name ?? 'N/A',
                        'timeAgo' => Carbon::parse($grn->created_at)->diffForHumans($currentTime, ['parts' => 1, 'short' => true, 'syntax' => Carbon::DIFF_RELATIVE_TO_NOW]),
                        'unit' => $item->purchaseOrderItem->variant->product->unit ?? 'sản phẩm',
                        'originalTimestamp' => Carbon::parse($grn->created_at)->timestamp,
                    ];
                });
            });

        // Lấy các hoạt động bán hàng gần đây (Order)
        $orderActivities = Order::query()
            ->with(['user', 'orderItems.variant.product'])
            ->where('status', 'completed')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->flatMap(function ($order) use ($currentTime) {
                return $order->orderItems->map(function ($item) use ($order, $currentTime) {
                    return [
                        'id' => 'order_' . $item->id,
                        'type' => 'export',
                        'productName' => $item->variant->full_name ?? $item->variant->sku,
                        'quantity' => (int) $item->quantity,
                        'user' => $order->user->name ?? 'N/A',
                        'timeAgo' => Carbon::parse($order->created_at)->diffForHumans($currentTime, ['parts' => 1, 'short' => true, 'syntax' => Carbon::DIFF_RELATIVE_TO_NOW]),
                        'unit' => $item->variant->product->unit ?? 'sản phẩm',
                        'originalTimestamp' => Carbon::parse($order->created_at)->timestamp,
                    ];
                });
            });

        // Kết hợp và sắp xếp lại theo thời gian
        $activities = $grnActivities->concat($orderActivities)
            ->sortByDesc(fn($activity) => $activity['originalTimestamp'])
            ->take($limit)
            ->values()
            ->toArray();

        return $activities;
    }
}