<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\Category;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Str;

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
            
            $category = new Category();
            $category->name = $validatedData['name'];
            $slug = Str::slug($validatedData['name']);
            $i = 1; 
            $baseSlug = $slug;
            while(Category::where('slug',$slug)->exists()){
                $slug = $baseSlug . "-" . $i++;
            }
            $category->slug = $slug;
            $category->id_parent = $validatedData['id_parent'] ?? null;
            $category->status = $validatedData['status'] ?? 1;
            $ex = $category->save();
            // Trả về phản hồi thành công
            return response()->json([
                'message' => 'Thêm dữ liệu thành công',
                'status' => 'success',
            ], 201);
            
        } catch (\Exception $e) {
            // Bắt các lỗi khác       
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
    public function get($slug){
        try {
            $category = Category::where('slug',$slug)->first();
            if(!$category){
                return response()->json([
                    'message' => 'Không tìm thấy dữ liệu',
                    'status' => 'error',
                ],404);
            }
            return response()->json([
                'message' => 'Tìm thấy dữ liệu',
                'status' => 'success',
                'data' => $category,
            ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
    }
    public function edit($slug,Request $request){
        try{
            $category = Category::where('slug',$slug)->first();
            if (!$category) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Không tìm thấy danh mục với ID: ' . $id,
                ], 404);
            }
            $validatedData = $request->validate([
                'name' => 'required|string',
                'id_parent' => 'integer|nullable',
                'status' => 'nullable|boolean',
            ]);
            $category->update($validatedData);
            return response()->json([
                'message' => 'Cập nhật thành công',
                'status' => 'success',
                'data' => $category,
            ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
    }
    public function destroy($slug){
        try {
            $category = Category::where('slug',$slug)->first();
            $category->delete();
            return response()->json([
                'message' => 'Xóa thành công',
                'status' => 'success',
            ]);
        }catch(\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
}
