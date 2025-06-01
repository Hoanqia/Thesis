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
use Symfony\Component\HttpFoundation\Cookie;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Str;



class UserController extends Controller
{   

    protected $cartService;

    // Tiêm CartService qua constructor
    public function __construct(CartService $cartService)
    {
        $this->cartService = $cartService;
    }
    // Đăng ký

    /**
     * 
     * 
     * @param NA
     * @return void
    */
    public function googleLogin(){
        return Socialite::driver('google')->stateless()->redirect();
    }

    //  /**
    //  * 
    //  * 
    //  * @param NA
    //  * @return void
    // */
    // public function googleAuthentication(){
    //      try {
    //     $googleUser = Socialite::driver('google')->stateless()->user(); // thêm stateless()
    //     dd($googleUser); // Test tạm
        
    // } catch (\Exception $e) {
    //     \Log::error("Lỗi: ", [
    //         'message' => $e->getMessage(),
    //         'stack' => $e->getTraceAsString()
    //     ]);
    //     return response()->json(['error' => 'Login failed'], 500);
    // }
    // }
        
   public function googleAuthentication(){
    try {
        $googleUser = Socialite::driver('google')->stateless()->user();

        $user = User::where('google_id', $googleUser->id)->first();
        
           if ($user && $user->status === 0) {
            // Redirect về /app/home với thông báo
            $query = http_build_query([
                'error' => 'account_locked'
            ]);
            return redirect()->to("http://localhost:3000/");
        }

        if (!$user) {
            $user = User::create([
                'name' => $googleUser->name,
                'email' => $googleUser->email,
                'google_id' => $googleUser->id,
                'password' => Hash::make(Str::random(24)),
                'role' => 'customer',
            ]);
                $user->refresh();

            if ($user->role === 'customer') {
                 $cart = $this->cartService->getOrCreateCart($user);
            }
        }
        
        $accessToken = JWTAuth::fromUser($user);
        $refreshToken = JWTAuth::fromUser($user);
        // Redirect về frontend với access_token và role dưới dạng query param
        $queryParams = http_build_query([
        'access_token' => $accessToken,
        'refresh_token' => $refreshToken,
        'role' => $user->role,
    ]);

    $redirectUrl = 'http://localhost:3000/oauth-callback?' . $queryParams;


        return redirect()->to($redirectUrl);

    } catch (\Exception $e) {
        return ApiExceptionHandler::handleException($e);
    }
}







    
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
    public function register_admin(Request $request)
    {
        
        try {
        $validatedData = $request->validate([
            'name'          => 'required|string|max:255',
            'email'         => 'required|email|unique:users,email',
            'password'      => 'required|string|min:6',
            'dob'           => 'nullable|date',
            'phone_number'  => 'required|string',
            'role'          => 'required',
        ]);

            $user = User::create([
                'name'          => $validatedData['name'],
                'email'         => $validatedData['email'],
                'password'      => Hash::make($validatedData['password']),
                'dob'           => $validatedData['dob'] ?? null,
                'phone_number'  => $validatedData['phone_number'],
                'role'          => $validatedData['role'],
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

    // Validate
    $credentials = $request->validate([
        'email'    => 'required|email',
        'password' => 'required|string',
    ]);
    Log::info('Credentials validated', ['credentials' => $credentials]);

    // Attempt login
    if (! $token = JWTAuth::attempt($credentials)) {
        return response()->json([
            'status'  => 'error',
            'message' => 'Email hoặc mật khẩu không đúng'
        ], 401);
    }

    // Lấy user, tạo cart nếu cần
    $user = Auth::user();
    if ($user->role === 'customer') {
        $cart = $this->cartService->getOrCreateCart($user);
    }
    Log::info('Auth attempt success', ['user_id' => $user->id]);

    // Tạo refresh token
    $refreshToken = JWTAuth::fromUser($user);

    // Tạo cookie
   


    // Trả về JSON kèm set-cookie
    return response()->json([
        'status'        => 'success',
        'user'          => $user,
        // bạn có thể bỏ token khỏi body nếu không cần client đọc
        'token'         => $token,
        'refresh_token' => $refreshToken,
    ], 200)
    ->withCookie($accessCookie)
    ->withCookie($refreshCookie);
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

    
public function logout(Request $request)
{
    try {
        $token = $request->bearerToken(); // Lấy token từ header Authorization

        if (!$token) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Token không tồn tại trong header Authorization'
            ], 400);
        }

        JWTAuth::setToken($token)->invalidate();

        return response()->json([
            'status'  => 'success',
            'message' => 'Đăng xuất thành công'
        ]);
    } catch (JWTException $e) {
        return response()->json([
            'status'  => 'error',
            'message' => 'Không thể đăng xuất, token lỗi hoặc hết hạn'
        ], 401);
    } catch (\Exception $e) {
        return ApiExceptionHandler::handleException($e);
    }
}




    // Lấy thông tin cá nhân
   public function getPersonalInformation(){
        Log::info('Bắt đầu hàm getPersonalInformation');

        try {
            $user = auth()->user(); // lấy từ middleware đã set sẵn

            if (!$user) {
                Log::warning('Không tìm thấy user từ auth()->user().');
                return response()->json([
                    'status' => 'fail',
                    'message' => 'User not found'
                ], 404);
            }

            Log::info('Lấy được thông tin user:', [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role
            ]);

            return response()->json([
                'status' => 'success',
                'user' => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'role'  => $user->role,
                ]
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
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
    
    public function changeStatusUser($id,Request $request){
        try {
             $user = User::find($id);
        if(!$user){
            return response()->json([
                'message' => 'User không tồn tại',
                'status' => 'error',
            ],404);
        }
        $validated = $request->validate([
            'status' => 'required|numeric',
        ]);
        $user->status = $validated['status'];
        $user->save();
        return response()->json([
            'message' => 'Cập nhật trạng thái thành công',
            'status' => 'success',
            'data' => $user->status,
        ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
       
    }
    public function getAll(){
        try {
             $users = User::all();
                if($users->isEmpty()){
                    return response()->noContent();
                }
                return response()->json([
                    'message' => 'Lấy dữ liệu thành công',
                    'status' => 'success',
                    'data' => $users,
                ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
       
    }
}
