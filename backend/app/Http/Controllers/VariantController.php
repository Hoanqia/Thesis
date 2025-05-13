<?php

namespace App\Http\Controllers;

use App\Services\VariantService;
use Illuminate\Http\Request;
use App\Exceptions\ApiExceptionHandler;

class VariantController extends Controller
{
    protected $variantService;

    public function __construct(VariantService $variantService)
    {
        $this->variantService = $variantService;
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'product_id' => 'required|exists:products,id',
                'sku'        => 'required|string|unique:product_variants,sku',
                'price'      => 'required|numeric|min:0',
                'discount'   => 'nullable|numeric|min:0',
                'stock'      => 'nullable|integer|min:0',
                'spec_values'=> 'nullable|array',
                'spec_values.*.spec_id' => 'required|exists:specifications,id',
                'spec_values.*.option_id' => 'nullable|exists:spec_options,id',
                // Các field value_text, value_int, value_decimal tùy kiểu dữ liệu
            ]);

            $variant = $this->variantService->createVariant($validated);

            return response()->json([
                'message' => 'Tạo biến thể thành công',
                'status' => 'success',
                'data' => $variant,
            ], 201);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function getByProduct($productId)
    {
        try {
            $variants = $this->variantService->getVariantsByProduct($productId);

            return response()->json([
                'message' => 'Lấy danh sách biến thể thành công',
                'status' => 'success',
                'data' => $variants,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function get($variantId)
    {
        try {
            $variant = $this->variantService->getVariantDetail($variantId);

            return response()->json([
                'message' => 'Lấy chi tiết biến thể thành công',
                'status' => 'success',
                'data' => $variant,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
}
