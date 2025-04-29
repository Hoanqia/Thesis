<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CategoryController;
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


Route::middleware(['auth:api','role:admin'])->group(function () {

    Route::prefix('admin')->group(function () {
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::get('/categories', [CategoryController::class, 'getAll']);
    });
});
