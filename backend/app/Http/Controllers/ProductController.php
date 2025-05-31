<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\ProductService;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;
use App\Models\Category;
class ProductController extends Controller
{
    protected $productService;

    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }

    public function store(Request $request)
    {
        try {
            $product = $this->productService->create($request->all());

            return response()->json([
                'message' => 'Thêm sản phẩm thành công',
                'status' => 'success',
                'data' => $product,
            ], 201);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function getAll()
    {
        try {
            $products = $this->productService->getAll();

            return response()->json([
                'message' => $products->isEmpty() ? 'Không có sản phẩm' : 'Lấy danh sách thành công',
                'status' => 'success',
                'data' => $products,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
    public function getAllByCatSlug($slug){
        $category = Category::where('slug',$slug)->first();
        if(!$category){
            return response()->json([
                'messsage' => 'Not found category',
                'status' => 'error',
            ],404);
        }
        try {
            $products = $this->productService->getProductsByCatId($category->id);
            return response()->json([
                'message' => $products->isEmpty() ? 'Không có sản phẩm' : 'Lấy danh sách thành công',
                'status' => 'success',
                'data' => $products,
            ]);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
    }
    public function get($slug)
    {
        try {
            $product = $this->productService->getBySlug($slug);

            if (!$product) {
                return response()->json([
                    'message' => 'Không tìm thấy sản phẩm',
                    'status' => 'error',
                ], 404);
            }

            return response()->json([
                'message' => 'Lấy sản phẩm thành công',
                'status' => 'success',
                'data' => $product,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
    public function getFeaturedProducts()
    {
        try {
            $products = $this->productService->getFeaturedProducts();

            return response()->json([
                'message' => $products->isEmpty() ? 'Không có sản phẩm' : 'Lấy danh sách thành công',
                'status' => 'success',
                'data' => $products,
            ]);
        } catch (\Exception $e) {
            // // Có thể dùng custom ApiExceptionHandler nếu bạn đã cấu hình
            return ApiExceptionHandler::handleException($e);
            // Nếu chưa có ApiExceptionHandler, dùng fallback:
            // return response()->json(['error' => $e->getMessage()], 500);
        }
    }
    public function edit($slug, Request $request)
    {
        try {
            $product = $this->productService->update($slug, $request->all());

            return response()->json([
                'message' => 'Cập nhật sản phẩm thành công',
                'status' => 'success',
                'data' => $product,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function destroy($slug)
    {
        try {
            $this->productService->delete($slug);

            return response()->json([
                'message' => 'Xoá sản phẩm thành công',
                'status' => 'success',
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
    public function index(Request $request){
        try {
            $products = $request->filled('keyword') 
            ? $this->productService->look_for($request->keyword)
            : $this->productService->getAll();

            if($products->isEmpty()){
                return response()->json([
                    'message' => 'Không có dữ liệu',
                    'status' => 'success',
                ],204);
            }
            return response()->json([
                'message' => 'Lấy dữ liệu thành công',
                'status' => 'success',
                'data' => $products,
            ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
    }
}
