<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserAddressController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CustomerOrderController;
use App\Http\Controllers\AdminOrderController;
use App\Http\Controllers\SpecificationController;
use App\Http\Controllers\SpecOptionController;
use App\Http\Controllers\VariantController;
use App\Http\Controllers\VoucherController;
use App\Http\Controllers\ReservedStockController;
use App\Http\Controllers\VnPayController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\WishlistController;
use App\Http\Controllers\UserEventController;
use App\Http\Controllers\RecommendationController;
use App\Http\Controllers\GrnController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\PricingController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\StockLotController;
use App\Http\Controllers\StatisticController;
use App\Http\Controllers\RecommenderSettingsController;
// use app\Http\Middleware\RoleMiddleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Laravel\Socialite\Facades\Socialite;





// Tất cả route trong api.php đều tự động có tiền tố /api
Route::prefix('auth')->group(function () {
    // Các route public
    Route::post('register/admin',[UserController::class, 'register_admin']);
    Route::post('register',[UserController::class, 'register']);
    Route::post('login',[UserController::class, 'login']);
    Route::post('refresh-token', [UserController::class, 'refreshToken']);
    // Các route cần xác thực token JWT
    Route::middleware('auth:api')->group(function () {
        Route::post('logout',[UserController::class, 'logout']);
        Route::get('me',[UserController::class, 'getPersonalInformation']);
        Route::post('change-password',[UserController::class, 'changePassword']);
    });
});


Route::middleware(['jwt.auth'])->group(function () {
    Route::middleware('role:admin')->group(function (){
        Route::prefix('admin')->group(function () {

            Route::post('/recommender/settings', [RecommenderSettingsController::class, 'update']); // Cập nhật nhiều
            Route::get('/recommender/settings/{key}', [RecommenderSettingsController::class, 'show']); // Lấy một tham số
            Route::put('/recommender/settings/{key}', [RecommenderSettingsController::class, 'updateSingle']); // Cập nhật một tham số
            Route::patch('/recommender/settings/{key}', [RecommenderSettingsController::class, 'updateSingle']); // Cập nhật một tham số

             Route::get('/dashboard-summary', [StatisticController::class, 'getDashboardSummary']);

            // API cho Sales Trend Data (SalesChart)
            Route::get('/sales-trend-data', [StatisticController::class, 'getSalesTrendData']);

            // API cho Top Selling Products (TopSellingProducts)
            Route::get('/top-selling-products', [StatisticController::class, 'getTopSellingProducts']);

            // API cho Stock Alerts (LowStockAlerts)
            Route::get('/stock-alerts', [StatisticController::class, 'getStockAlerts']);

            // API cho Recent Activities (RecentActivities)
            Route::get('/recent-activities', [StatisticController::class, 'getRecentActivities']);



                        // GET /api/stock-lots - Lấy danh sách lô hàng với bộ lọc và phân trang
            Route::get('stock-lots', [StockLotController::class, 'index']);

            // GET /api/stock-lots/{id} - Lấy thông tin chi tiết của một lô hàng
            Route::get('stock-lots/{id}', [StockLotController::class, 'show']);

            // GET /api/stock-lots/{id}/adjust-form - Cung cấp dữ liệu cho form điều chỉnh số lượng lô hàng
            Route::get('stock-lots/{id}/adjust-form', [StockLotController::class, 'adjustForm']);

            // POST /api/stock-lots/{id}/adjust - Xử lý yêu cầu điều chỉnh số lượng lô hàng
            Route::post('stock-lots/{id}/adjust', [StockLotController::class, 'updateAdjustment']);


            Route::patch('/{variantFromSupplierId}/set-default', [SupplierController::class, 'setDefautVariantFromSupplier']);

            Route::post('/pricing/setByTargetProfitFromSupplier',[PricingController::class,'setByTargetProfitFromSupplier']);
            Route::post('/pricing/recalculateByChosenSupplierCost',[PricingController::class,'recalculateByChosenSupplierCost']);

            Route::patch('/purchase_orders/{id}/status',[PurchaseOrderController::class,'updateStatus']);
            Route::delete('/purchase_orders/{id}',[PurchaseOrderController::class,'destroy']);
            Route::patch('/purchase_orders/{id}',[PurchaseOrderController::class,'update']);
            Route::get('/purchase_orders/{id}',[PurchaseOrderController::class,'show']);
            Route::post('/purchase_orders',[PurchaseOrderController::class,'store']);
            Route::get('/purchase_orders',[PurchaseOrderController::class,'index']);


            Route::get('/suppliers/{supplierId}/variants', [SupplierController::class, 'getSupplierVariants']);
            Route::delete('/suppliers/{supplierId}/variants/{variantFromSupplierId}',[SupplierController::class,'removeVariantFromSupplier']);
            Route::get('/suppliers/{supplierId}/variants/{variantFromSupplierId}', [SupplierController::class, 'showSupplierVariant']);
            Route::post('/suppliers/{supplierId}/variants', [SupplierController::class, 'addVariantToSupplier']);
            Route::patch('/suppliers/{supplierId}/variants/{variantFromSupplierId}', [SupplierController::class, 'updateSupplierVariant']);
            Route::patch('/suppliers/{supplierId}/variants', [SupplierController::class, 'updateSupplierVariants']); 


            Route::delete('/suppliers/{id}',[SupplierController::class,'destroy']);
            Route::patch('/suppliers/{id}',[SupplierController::class,'update']);
            Route::get('/suppliers/{id}',[SupplierController::class,'show']);
            Route::post('/suppliers',[SupplierController::class,'store']);
            Route::get('/suppliers',[SupplierController::class,'index']);


          

            Route::post('/pricing/set-by-target-profit',[PricingController::class,'setPricesByTargetProfit']);
            Route::post('/pricing/recalculate-by-current-cost',[PricingController::class,'recalculatePricesByCurrentCost']);

            

            Route::patch('/grns/{id}/cancel',[GrnController::class,'cancel']);
            Route::patch('/grns/{id}/confirm',[GrnController::class,'confirm']);
            Route::delete('/grns/{id}',[GrnController::class,'destroy']);
            Route::get('/grns/{id}',[GrnController::class,'show']);
            Route::post('/grns',[GrnController::class,'store']);
            Route::get('/grns',[GrnController::class,'index']);


            Route::get('/products/specifications/spec-value-suggestions',[SpecificationController::class,'fetchValues']);

            Route::patch('/reviews/{id}',[ReviewController::class,'adminReply']);
            Route::delete('/reviews/{id}',[ReviewController::class,'adminDelete']);
            Route::get('/reviews',[ReviewController::class,'getAll']);

          

            Route::patch('/orders/{id}/paid',[AdminOrderController::class,'markAsPaid']);
            Route::patch('/orders/{id}/status',[AdminOrderController::class,'updateStatus']);
            Route::patch('/orders/{id}/confirm',[AdminOrderController::class,'confirm']);
            Route::delete('/orders/{id}',[AdminOrderController::class,'destroy']);
            Route::get('/orders/{id}',[AdminOrderController::class,'show']);
            Route::get('/orders',[AdminOrderController::class,'index']);


            Route::delete('/vouchers/{id}',[VoucherController::class,'destroy']);
            Route::patch('/vouchers/{id}',[VoucherController::class,'update']);
            Route::post('/vouchers',[VoucherController::class,'store']);


            Route::get('product/specifications/{productId}',[SpecificationController::class,'index2']);
            Route::delete('/specifications/{id}',[SpecificationController::class,'destroy']);
            Route::patch('/specifications/{id}',[SpecificationController::class,'edit']);
            Route::get('/specifications/{id}',[SpecificationController::class,'get']);
            Route::post('/specifications',[SpecificationController::class,'store']);
            Route::get('/specifications/search',[SpecificationController::class,'search']);
            Route::get('/specifications/{categoryId}',[SpecificationController::class,'index']);

            Route::get('/spec-options/{specId}',[SpecOptionController::class,'index']);
            Route::delete('/spec-options/{id}',[SpecOptionController::class,'destroy']);
            Route::patch('/spec-options/{id}',[SpecOptionController::class,'update']);
            Route::get('/spec-options/{id}',[SpecOptionController::class,'get']);
            Route::post('/spec-options',[SpecOptionController::class,'store']);

            Route::get('/variants/{variantId}/spec-values',[VariantController::class,'getSpecValuesByVariantId']);
            Route::delete('/variants/{variantId}',[VariantController::class,'destroy']);
            Route::patch('/variants/{variantId}/update',[VariantController::class,'update']);
            Route::post('/variants',[VariantController::class,'store']);
            Route::get('/variants',[VariantController::class,'getAll']);

            Route::get('/categories-child/{id}',[CategoryController::class,'getChildCats']);
            Route::get('/categories/{categoryId}/specifications',[SpecificationController::class,'index']);
            Route::patch('/categories/{slug}',[CategoryController::class,'edit']);
            Route::delete('/categories/{slug}',[CategoryController::class,'destroy']);
            Route::post('/categories', [CategoryController::class, 'store']);
            Route::get('/categories-parents',[CategoryController::class,'getParentCats']);

            Route::delete('/brands/{slug}',[BrandController::class,'destroy']);
            Route::patch('/brands/{slug}',[BrandController::class,'edit']);
            Route::get('/brands/{slug}',[BrandController::class,'get']);
            Route::post('/brands',[BrandController::class,'store']);
            Route::get('/brands',[BrandController::class,'getAll']);
            
            

            Route::get('/products/{slug}',[ProductController::class,'get']);
            Route::patch('/products/{slug}',[ProductController::class,'edit']);
            Route::delete('/products/{slug}',[ProductController::class,'destroy']);
            Route::post('/products',[ProductController::class,'store']);
            // Route::get('/products',[ProductController::class,'getAll']);
            Route::get('/products/search',[ProductController::class,'index']); // index này là search, còn các index khác là get All
            
            Route::patch('/users/{id}',[UserController::class,'changeStatusUser']);
            Route::get('/users',[UserController::class,'getAll']);
          
        });
    });
    Route::middleware('role:customer')->group(function (){
        Route::prefix('customer')->group(function (){
            Route::get('/recommendations', [RecommendationController::class, 'index']);


            Route::post('/wishlists/add-all-to-cart',[WishlistController::class,'addAllToCart']);
            Route::post('/wishlists/{id}',[WishlistController::class,'addToCart']);
            Route::delete('/wishlists/{id}',[WishlistController::class,'destroy']);
            Route::post('/wishlists',[WishlistController::class,'store']);
            Route::get('/wishlists',[WishlistController::class,'index']);

            Route::delete('/reviews/{id}',[ReviewController::class,'destroy']);
            Route::patch('/reviews/{id}',[ReviewController::class,'update']);
            Route::post('/reviews',[ReviewController::class,'store']);

            Route::post('/vnpay/create-payment', [VnPayController::class, 'createPayment']);
           

            Route::delete('/cart/{itemId}',[CartController::class,'removeItem']);
            Route::patch('/cart/{itemId}',[CartController::class,'updateItem']);
            Route::post('/cart',[CartController::class,'addToCart']);
            Route::get('/cart',[CartController::class,'getCart']);
            Route::delete('/cart',[CartController::class,'clearCart']);




            Route::patch('/orders/{orderId}/confirm',[CustomerOrderController::class,'confirmReceived']);
            Route::patch('/orders/{orderId}/cancel',[CustomerOrderController::class,'cancelOrder']);
            Route::get('/orders/{orderId}',[CustomerOrderController::class,'getOrderDetails']);
            Route::get('/orders',[CustomerOrderController::class,'getUserOrders']);
            Route::post('/orders',[CustomerOrderController::class,'createOrder']);
            
            Route::delete('/addresses/{id}',[UserAddressController::class,'destroy']);
            Route::patch('/addresses/{id}',[UserAddressController::class,'update']);
            Route::post('/addresses',[UserAddressController::class,'store']);
            Route::get('/addresses/{id}',[UserAddressController::class,'show']);
            Route::get('/addresses',[UserAddressController::class,'index']);

            Route::patch('/reserved-stock/confirm/{orderId}',[ReservedStockController::class,'confirm']);
            Route::post('/reserved-stock',[ReservedStockController::class,'store']);
            Route::delete('/reserved-stock/release',[ReservedStockController::class,'destroy']);
        });

    });
    
    
}); // ngoặc xác thực api
Route::get('/product/{productSlug}/similar',[RecommendationController::class,'getSimilarItems']);
Route::get('/recommender/settings', [RecommenderSettingsController::class, 'index']);

Route::post('/user-events',[UserEventController::class,'store']);
Route::get('/search',[ProductController::class,'search']);
Route::get('/suggestions',[ProductController::class,'suggestions']);

Route::get('/variants/{variantId}',[VariantController::class,'get']);

Route::get('/reviews/{id}/detail',[ReviewController::class,'show']);
Route::get('/reviews/{id}',[ReviewController::class,'index']);

Route::get('/categories/{productId}',[CategoryController::class,'getCatByProductId']);
Route::get('/categories', [CategoryController::class, 'getAll']);

Route::get('/products/{slug}',[ProductController::class,'get']);
Route::get('/{slug}/products',[ProductController::class,'getAllByCatSlug']);
Route::get('/products',[ProductController::class,'getAll']);

Route::get('/featured-products', [ProductController::class, 'getFeaturedProducts']);
Route::get('/{productId}/variants',[VariantController::class,'getByProduct']);
Route::get('/categories/{slug}/brands',[BrandController::class,'getAllbyCat']);
Route::get('/categories/{slug}/detail',[CategoryController::class,'get']);

Route::get('/vouchers/{id}',[VoucherController::class,'show']);
Route::post('/vouchers/validate',[VoucherController::class,'validateVoucher']);
Route::get('/vouchers',[VoucherController::class,'index']); // get all 

  Route::prefix('customer')->group(function (){


 Route::get('/vnpay/return',        [VnPayController::class, 'vnpayReturn']);
// Route::post('/vnpay/ipn',         [VnPayController::class, 'vnpayIpn']);

     });