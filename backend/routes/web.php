<?php
// routes/web.php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use Laravel\Socialite\Facades\Socialite;

Route::get('/', function () {
    return view('welcome');
});
    Route::get('/auth/google',[UserController::class,'googleLogin']);
    Route::get('/auth/google/callback',[UserController::class,'googleAuthentication']);
