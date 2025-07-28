<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Str;
use App\Services\SlugService;

class BrandController extends Controller
{
   

    public function store(Request $request)
    {
        try {
            // Validate dữ liệu đầu vào
            $validateData = $request->validate([
                'name' => 'required|string',
            ]);
            $brand = new Brand();
            $brand->name = $validateData['name'];
    
            $brand->slug = SlugService::createSlug($validateData['name'], Brand::class);

            $brand->status = $request->status ?? 1;
    
            $brand->save();

            return response()->json([
                'message' => 'Thêm dữ liệu thành công',
                'status' => 'success',
                'data' => $brand,
            ], 201);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function getAllbyCat($slug){
        $category = Category::where('slug',$slug)->first();
        if(!$category){
            return response()->json([
                'message' => 'Không tim thấy category',
                'status' => 'success',
            ],404);
        }
        try {
            $brands = Brand::whereHas('products', function ($query) use ($category){
                $query->where('cat_id',$category->id);
            })->get();
            if($brands->isEmpty()){
                return response()->noContent();
            }
            return response()->json([
                'message' => 'Lấy dữ liệu thành công',
                'status' => 'success',
                'data' => $brands,
            ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
    }
    
    public function getAll(){
        try {
            $brands = Brand::all();
            if($brands->isEmpty()){
                return response()->json([
                    'message' => 'Không có dữ liệu',
                    'status' => 'success',
                    'data' => [],
                ],200);
            }
            return response()->json([
                'message' => 'Lấy dữ liệu thành công',
                'status' => 'success',
                'data' => $brands,
            ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
    }
    public function get($slug){
        try {
            $brand = Brand::where('slug',$slug)->first();
            if(!$brand){
                return response()->json([
                    'message' => 'Không tìm thấy dữ liệu',
                    'status' => 'error',
                ],404);
            }
            return response()->json([
                'message' => 'Lấy dữ liệu thành công',
                'status' => 'success',
                'data' => $brand,
            ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
    }
    public function edit($slug,Request $request){
        try {
            $brand = Brand::where('slug',$slug)->first();
            if(!$brand){
                return response()->json([
                    'message' => 'Không tìm thấy dữ liệu',
                    'status' => 'error',
                ],404);
            }
            $validateData = $request->validate([
                'name' => 'string',
                'status' => 'integer',
            ]);
            if(isset($validateData['name']) && $validateData['name'] !== $brand->name){
               $validateData['slug'] = SlugService::createSlug($validateData['name'],Brand::class);
            }
            $brand->update($validateData);
            return response()->json([
                'message' => 'Cập nhật thông tin thành công',
                'status' => 'success',
            ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
    }
    public function destroy($slug){
        try {
            $brand = Brand::where('slug',$slug)->first();
            if(!$brand){
                return response()->json([
                    'message' => 'Không tìm thấy dữ liệu',
                    'status' => 'error',
                ],404);
            }
            $brand->delete();
            return response()->json([
                'message' => 'Xóa dữ liệu thành công',
                'status' => 'success',
            ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
    }
}
