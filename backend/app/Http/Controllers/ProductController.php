<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Exceptions\ApiExceptionHandler;
use App\Models\Product;
use App\Services\SlugService;

class ProductController extends Controller
{
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string',
                'description' => 'nullable|string',
                'price' => 'required|numeric|min:0',
                'discount' => 'required|numeric|min:0',
                'stock' => 'required|integer|min:0',
                'cat_id' => 'required|exists:categories,id',
                'brand_id' => 'required|exists:brands,id',
                'is_featured' => 'boolean',
                'status' => 'boolean',
            ]);

            $product = new Product($validated);
            $product->slug = SlugService::createSlug($validated['name'], Product::class);
            $product->is_featured = $request->input('is_featured', false);
            $product->status = $request->input('status', true);
            $product->save();

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
            $products = Product::with(['brand', 'category'])->get();

            return response()->json([
                'message' => $products->isEmpty() ? 'Không có sản phẩm' : 'Lấy danh sách thành công',
                'status' => 'success',
                'data' => $products,
            ], 200);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function get($slug)
    {
        try {
            $product = Product::with(['brand', 'category'])->where('slug', $slug)->first();

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
            ], 200);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function edit($slug, Request $request)
    {
        try {
            $product = Product::where('slug', $slug)->first();

            if (!$product) {
                return response()->json([
                    'message' => 'Không tìm thấy sản phẩm',
                    'status' => 'error',
                ], 404);
            }

            $validated = $request->validate([
                'name' => 'string',
                'description' => 'nullable|string',
                'price' => 'numeric|min:0',
                'discount' => 'numeric|min:0',
                'stock' => 'integer|min:0',
                'cat_id' => 'exists:categories,id',
                'brand_id' => 'exists:brands,id',
                'is_featured' => 'boolean',
                'status' => 'boolean',
            ]);

            if (isset($validated['name']) && $validated['name'] !== $product->name) {
                $validated['slug'] = SlugService::createSlug($validated['name'], Product::class);
            }

            $product->update($validated);

            return response()->json([
                'message' => 'Cập nhật sản phẩm thành công',
                'status' => 'success',
                'data' => $product,
            ], 200);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function destroy($slug)
    {
        try {
            $product = Product::where('slug', $slug)->first();

            if (!$product) {
                return response()->json([
                    'message' => 'Không tìm thấy sản phẩm',
                    'status' => 'error',
                ], 404);
            }

            $product->delete();

            return response()->json([
                'message' => 'Xoá sản phẩm thành công',
                'status' => 'success',
            ], 200);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
}
