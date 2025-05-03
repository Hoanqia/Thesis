<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;
use App\Models\Brand;

class BrandController extends Controller
{
    public function store(Request $request){
        try {
            $validateData = $request->validate([
                'name' => 'required|string',
            ]);
            $brand = Brand::create([
                'name' => $validateData['name'],
            ]);
            return response()->json([
                'message' => 'Thêm dữ liệu thành công',
                'status' => 'success',
            ],201);
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
    public function get($id){
        try {
            $brand = Brand::find($id);
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
    public function edit($id,Request $request){
        try {
            $brand = Brand::find($id);
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
            $brand->update($validateData);
            return response()->json([
                'message' => 'Cập nhật thông tin thành công',
                'status' => 'success',
            ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
    }
    public function destroy($id){
        try {
            $brand = Brand::find($id);
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
