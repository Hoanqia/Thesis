<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\ProductService;
use App\Exceptions\ApiExceptionHandler;

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
}
