<?php

namespace App\Exceptions;

use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\QueryException;
use Tymon\JWTAuth\Exceptions\JWTException;

class ApiExceptionHandler
{
    public static function handleException(\Exception $exception): Response
    {
        // Log lỗi chung
        Log::error('[' . now()->toDateTimeString() . '] Lỗi: ' . $exception->getMessage(), [
            'stack' => $exception->getTraceAsString(),
            'exception_data' => $exception->getMessage(),
        ]);
        
        // Kiểm tra và xử lý ValidationException
        if ($exception instanceof ValidationException) {
            return response()->json([
                'status' => 'error',
                'message' => $exception->getMessage(),
                'errors' => $exception->errors(),
            ], 422);
        }

        // Kiểm tra và xử lý QueryException
        if ($exception instanceof QueryException) {
            return response()->json([
                'status' => 'error',
                'message' => 'Database query error: ' . $exception->getMessage(),
            ], 500);
        }

        // Kiểm tra và xử lý JWTException
        if ($exception instanceof JWTException) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized - Token is missing or invalid.',
            ], 401);
        }

        // Lỗi chung trả về mã 500
        return response()->json([
            'status' => 'error',
            'message' => 'Internal Server Error: ' . $exception->getMessage(),
        ], 500);
    }
}
