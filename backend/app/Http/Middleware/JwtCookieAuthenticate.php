<?php

namespace App\Http\Middleware;

use Closure;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;

class JwtCookieAuthenticate
{
    public function handle($request, Closure $next)
    {
        // Lấy token từ cookie
        $token = $request->cookie('access_token');

        if (!$token) {
            return response()->json(['error' => 'Unauthorized - No token'], 401);
        }

        try {
            // Authenticate từ token
            $user = JWTAuth::setToken($token)->authenticate();

            if (!$user) {
                return response()->json(['error' => 'User not found'], 404);
            }

            // ✅ Gán user vào auth để dùng auth()->user() trong controller
            auth()->setUser($user);

        } catch (JWTException $e) {
            return response()->json(['error' => 'Token invalid or expired'], 401);
        }

        return $next($request);
    }
}
