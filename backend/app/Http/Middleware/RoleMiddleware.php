<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use JWTAuth;
use JWTException;
class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, $role): Response
    {
        try {
            $user = JWTAuth::parseToken()->authenticate();

        } catch (JWTException $e) {
            return response()->json(['message' => 'Unauthorized - Token missing or invalid'], 401);
        }

        if (!$user || $user->role !== $role) {
            return response()->json(['message' => 'Forbidden - You don\'t have access'], 403);
        }

        return $next($request);
    }
}
