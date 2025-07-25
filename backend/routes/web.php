<?php
// routes/web.php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use Laravel\Socialite\Facades\Socialite;
use Google\Client;
use Google\Service\Gmail;
use Illuminate\Http\Request; // <-- BẠN CẦN THÊM DÒNG NÀY

Route::get('/', function () {
    return view('welcome');
});
    Route::get('/auth/google',[UserController::class,'googleLogin']);
    Route::get('/auth/google/callback',[UserController::class,'googleAuthentication']);
// Route để bắt đầu quá trình ủy quyền cho tài khoản gửi email
// Route::get('/google/auth/mailer', function () {
//     $client = new Client();
//     $client->setClientId(env('GOOGLE_MAILER_CLIENT_ID'));     // <-- SỬ DỤNG CLIENT ID CỦA MAILER
//     $client->setClientSecret(env('GOOGLE_MAILER_CLIENT_SECRET')); // <-- SỬ DỤNG CLIENT SECRET CỦA MAILER
//     $client->setRedirectUri(env('GOOGLE_MAILER_REDIRECT_URI'));

//     $client->addScope(Gmail::MAIL_GOOGLE_COM); // Hoặc 'https://www.googleapis.com/auth/gmail.send'
//     $client->setAccessType('offline'); // RẤT QUAN TRỌNG để lấy refresh token
//     $client->setPrompt('consent'); // Yêu cầu người dùng đồng ý mỗi lần (hữu ích khi test, sau này có thể bỏ)

//     return redirect($client->createAuthUrl());
// });

// // Route callback sau khi Google ủy quyền cho tài khoản gửi email
// Route::get('/google/callback_mailer', function (Request $request) {
//     $client = new Client();
//     $client->setClientId(env('GOOGLE_MAILER_CLIENT_ID'));     // <-- SỬ DỤNG CLIENT ID CỦA MAILER
//     $client->setClientSecret(env('GOOGLE_MAILER_CLIENT_SECRET')); // <-- SỬ DỤNG CLIENT SECRET CỦA MAILER
//     $client->setRedirectUri(env('GOOGLE_MAILER_REDIRECT_URI'));

//     // Lấy access token và refresh token từ authorization code
//     $token = $client->fetchAccessTokenWithAuthCode($request->code);

//     // KIỂM TRA ĐỂ ĐẢM BẢO CÓ REFRESH TOKEN
//     if (isset($token['refresh_token'])) {
//         // HIỂN THỊ REFRESH TOKEN. SAO CHÉP VÀ DÁN VÀO BIẾN GOOGLE_MAILER_REFRESH_TOKEN TRONG FILE .env CỦA BẠN.
//         // TRONG MÔI TRƯỜNG SẢN XUẤT, BẠN CẦN LƯU TRỮ TOKEN NÀY MỘT CÁCH AN TOÀN TRONG CƠ SỞ DỮ LIỆU.
//         dd('Refresh Token của bạn là: ' . $token['refresh_token']);
//     } else {
//         dd('Không lấy được Refresh Token. Đảm bảo bạn đã thêm setAccessType("offline") và setPrompt("consent") trong route /google/auth/mailer, và đã cấp quyền đầy đủ.');
//     }
// });