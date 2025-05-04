<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Auth\Events\Registered;
use App\Exceptions\ApiExceptionHandler;
use App\Services\CartService;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;
class UserController extends Controller
{   

    protected $cartService;

    // Tiêm CartService qua constructor
    public function __construct(CartService $cartService)
    {
        $this->cartService = $cartService;
    }
    // Đăng ký
    public function register(Request $request)
    {
        
        try {
        $validatedData = $request->validate([
            'name'          => 'required|string|max:255',
            'email'         => 'required|email|unique:users,email',
            'password'      => 'required|string|min:6',
            'dob'           => 'nullable|date',
            'phone_number'  => 'required|string',
        ]);

            $user = User::create([
                'name'          => $validatedData['name'],
                'email'         => $validatedData['email'],
                'password'      => Hash::make($validatedData['password']),
                'dob'           => $validatedData['dob'] ?? null,
                'phone_number'  => $validatedData['phone_number'],
            ]);
            // $user->sendEmailVerificationNotification();
            return response()->json([
                'message' => 'Đăng ký thành công',
                'status' => 'success',
            ],201);
            // $token = Auth::login($user);
            // return response()->json([
            //     'status' => 'success',
            //     'user'   => $user,
            //     'token'  => $token
            // ], 201);
        } catch (\Exception $e) {
            Log::error('[' . now()->toDateTimeString() . '] Lỗi khi thêm danh mục: ' . $e->getMessage(), [
                'stack' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            
            return ApiExceptionHandler::handleException($e); // Trả về lỗi API chuẩn cho các lỗi khác
        }
    }

    // Đăng nhập
    public function login(Request $request)
{
    Log::info('Login attempt start', ['request' => $request->all()]);

    // Validate the credentials from the request
    $credentials = $request->validate([
        'email'    => 'required|email',
        'password' => 'required|string',
    ]);
    Log::info('Credentials validated', ['credentials' => $credentials]);

    // Attempt to create a token using JWTAuth
    if (!$token = JWTAuth::attempt($credentials)) {
        return response()->json([
            'status'  => 'error',
            'message' => 'Email hoặc mật khẩu không đúng'
        ], 401);
    }

    // Lấy thông tin người dùng đã đăng nhập
    $user = Auth::user();
    if($user->role === "customer"){
       $cart =  $this->cartService->getOrCreateCart();
    }
    Log::info('Auth attempt success', ['user_id' => $user->id]);

    // Tạo lại refresh token
    $refreshToken = JWTAuth::fromUser($user); // Chỉ cần tạo một lần khi đăng nhập

    // Trả về cả access token và refresh token
    return response()->json([
        'status' => 'success',
        'user'   => $user,
        'token'  => $token,             // Trả về access token
        'refresh_token' => $refreshToken // Trả về refresh token
    ], 200);
}

    
public function refreshToken(Request $request)
{
    // Lấy refresh_token từ body, sau này khi xài cookie thì mới đổi lại get từ cookie
    $refreshToken = $request->input('refresh_token');

    // Kiểm tra xem refresh_token có tồn tại không
    if (!$refreshToken) {
        return response()->json([
            'status' => 'error',
            'message' => 'Không có refresh token',
        ], 400);
    }

    try {
        // Làm mới token từ refresh_token
        // $newToken = JWTAuth::refresh($refreshToken); này là sai
        $newToken = JWTAuth::setToken($refreshToken)->refresh();

        return response()->json([
            'status' => 'success',
            'token'  => $newToken
        ], 200);

    } catch (\Tymon\JWTAuth\Exceptions\JWTException $e) {
        // Trả về lỗi nếu refresh_token không hợp lệ hoặc hết hạn
        return response()->json([
            'status' => 'error',
            'message' => 'Không thể làm mới token: ' . $e->getMessage(),
        ], 401);
    } catch (\Exception $e) {
        // Trả về lỗi nếu có vấn đề khác
        return response()->json([
            'status' => 'error',
            'message' => 'Lỗi hệ thống: ' . $e->getMessage(),
        ], 500);
    }
}

    
public function logout()
{
    Log::info('Bắt đầu hàm logout');

    try {
        // Invalidate token hiện tại
        JWTAuth::parseToken()->invalidate();

        Log::info('Token đã được invalidate thành công.');

        return response()->json([
            'status'  => 'success',
            'message' => 'Đăng xuất thành công'
        ]);
    } catch (JWTException $e) {
        Log::error('Lỗi khi logout: ' . $e->getMessage());

        return response()->json([
            'status'  => 'error',
            'message' => 'Không thể đăng xuất, token lỗi hoặc hết hạn'
        ], 401);
    } catch (\Exception $e) {
        Log::error('Lỗi server khi logout: ' . $e->getMessage());

        return response()->json([
            'status'  => 'error',
            'message' => 'Server error'
        ], 500);
    }
}


    // Lấy thông tin cá nhân
    public function getPersonalInformation()
    {
        Log::info('Bắt đầu hàm getPersonalInformation');
    
        try {
            // Lấy user từ token JWT
            $user = JWTAuth::parseToken()->authenticate();
    
            if (!$user) {
                Log::warning('Token hợp lệ nhưng không tìm thấy user.');
                return response()->json([
                    'status' => 'fail',
                    'message' => 'User not found'
                ], 404);
            }
    
            Log::info('Lấy được thông tin user:', [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email
            ]);
    
            return response()->json([
                'status' => 'success',
                'user' => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                ]
            ]);
        } catch (JWTException $e) {
            Log::error('Lỗi JWT: ' . $e->getMessage());
    
            return response()->json([
                'status' => 'error',
                'message' => 'Token is invalid or expired'
            ], 401);
        } catch (\Exception $e) {
            Log::error('Lỗi server trong getPersonalInformation: ' . $e->getMessage());
    
            return response()->json([
                'status' => 'error',
                'message' => 'Server error'
            ], 500);
        }
    }
    // Đổi mật khẩu
    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'current_password'      => 'required|string',
            'new_password'          => 'required|string|min:6',
            'new_password_confirmation' => 'required|string|min:6'
        ]);

        $user = Auth::user();
        if (!Hash::check($data['current_password'], $user->password)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Mật khẩu hiện tại không chính xác'
            ], 400);
        }
        if($data['new_password'] == $data['current_password']){
            return response()->json([
                'message' => 'Mật khẩu mới không được giống mật khẩu hiện tại',
                'status' => 'error',
            ],422);
        }
        if($data['new_password'] !== $data['new_password_confirmation']){
            return response()->json([
                'message' => 'Mật khẩu xác nhận không khớp với mật khẩu mới',
                'status' => 'error'
            ],422);
        }
      
        
        $user->password = Hash::make($data['new_password']);
        $user->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Đổi mật khẩu thành công'
        ]);
    }
    
}
