<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CartController;

// use app\Http\Middleware\RoleMiddleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use App\Models\User;





// Tất cả route trong api.php đều tự động có tiền tố /api
Route::prefix('auth')->group(function () {
    // Các route public
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
            
        });
    });
    Route::middleware('role:customer')->group(function (){
        Route::prefix('customer')->group(function (){
            Route::delete('/cart/{itemId}',[CartController::class,'removeItem']);
            Route::patch('/cart/{itemId}',[CartController::class,'updateItem']);
            Route::post('/cart',[CartController::class,'addToCart']);
            Route::get('/cart',[CartController::class,'getCart']);
            Route::delete('/cart',[CartController::class,'clearCart']);
        });
    });
    
    
}); // ngoặc xác thực api
Route::get('/products/{slug}',[ProductController::class,'get']);
Route::get('/products',[ProductController::class,'getAll']);
