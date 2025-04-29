<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\Category;
use App\Exceptions\ApiExceptionHandler;

class CategoryController extends Controller
{
    public function store(Request $request){
        try {
            // Xử lý validate
            $validatedData = $request->validate([
                'name' => 'required|string',
                'id_parent' => 'integer|nullable',
                'status' => 'nullable|boolean',
            ]);
            
            // Nếu validate thành công, tạo danh mục
            $category = Category::create([
                'name' => $validatedData['name'],
                'id_parent' => $validatedData['id_parent'] ?? null,
                'status' => $validatedData['status'] ?? true,
            ]);
            
            // Trả về phản hồi thành công
            return response()->json([
                'message' => 'Thêm dữ liệu thành công',
                'status' => 'success',
            ], 201);
            
        } catch (\Exception $e) {
            // Bắt các lỗi khác
            Log::error('[' . now()->toDateTimeString() . '] Lỗi khi thêm danh mục: ' . $e->getMessage(), [
                'stack' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            
            return ApiExceptionHandler::handleException($e); // Trả về lỗi API chuẩn cho các lỗi khác
        }
    }
    

    public function getAll(){
        try {
            $categories = Category::all();
            if($categories->isEmpty()){
                return response()->json([
                    'message' => 'Không có dữ liệu',
                    'status' => 'success',
                    'data' => [],
                ],200);
            }
            return response()->json([
                'message' => 'Lấy dữ liệu thành công',
                'status' => 'success',
                'data' => $categories,
            ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
       
    }
}
