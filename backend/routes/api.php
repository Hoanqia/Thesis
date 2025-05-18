<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CustomerOrderController;
use App\Http\Controllers\SpecificationController;
use App\Http\Controllers\SpecOptionController;

// use app\Http\Middleware\RoleMiddleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use App\Models\User;





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


Route::middleware(['auth:api'])->group(function () {
    Route::middleware('role:admin')->group(function (){
        Route::prefix('admin')->group(function () {
            Route::patch('/categories/{slug}',[CategoryController::class,'edit']);
            Route::delete('/categories/{slug}',[CategoryController::class,'destroy']);
            Route::get('/categories/{slug}',[CategoryController::class,'get']);
            Route::post('/categories', [CategoryController::class, 'store']);
            Route::get('/categories', [CategoryController::class, 'getAll']);
            
    
            Route::delete('/brands/{slug}',[BrandController::class,'destroy']);
            Route::patch('/brands/{slug}',[BrandController::class,'edit']);
            Route::get('/brands/{slug}',[BrandController::class,'get']);
            Route::post('/brands',[BrandController::class,'store']);
            Route::get('/brands',[BrandController::class,'getAll']);
            
            

            Route::get('/products/{slug}',[ProductController::class,'get']);
            Route::patch('/products/{slug}',[ProductController::class,'edit']);
            Route::delete('/products/{slug}',[ProductController::class,'destroy']);
            Route::post('/products',[ProductController::class,'store']);
            Route::get('/products',[ProductController::class,'getAll']);
            Route::get('/products/search',[ProductController::class,'index']); // index này là search, còn các index khác là get All
            

            Route::delete('/specifications/{id}',[SpecificationController::class,'destroy']);
            Route::patch('/specifications/{id}',[SpecificationController::class,'edit']);
            Route::get('/specifications/{id}',[SpecificationController::class,'get']);
            Route::get('/specifications',[SpecificationController::class,'index']);
            Route::post('/specifications',[SpecificationController::class,'store']);



            Route::delete('/spec-option/{id}',[SpecOptionController::class,'destroy']);
            Route::patch('/spec-options/{id}',[SpecOptionController::class,'update']);
            Route::get('/spec-options/{id}',[SpecOptionController::class,'get']);
            Route::post('/spec-options',[SpecOptionController::class,'store']);
            Route::get('/spec-options',[SpecOptionController::class,'index']);
            
        });
    });
    Route::middleware('role:customer')->group(function (){
        Route::prefix('customer')->group(function (){
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
        });

    });
    
    
}); // ngoặc xác thực api

Route::get('/products/{slug}',[ProductController::class,'get']);
Route::get('/products',[ProductController::class,'getAll']);

Route::get('/featured-products', [ProductController::class, 'getFeaturedProducts']);


