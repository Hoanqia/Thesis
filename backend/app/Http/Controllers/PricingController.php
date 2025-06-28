<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;
use App\Services\PricingService;
class PricingController extends Controller
{
    protected $pricingService;
    public function __construct(PricingService $pricingService){
        $this->pricingService = $pricingService;
    }

      /**
     * Đặt giá bán cho các biến thể dựa trên giá mua từ một VariantFromSupplier CỤ THỂ và tỷ lệ lợi nhuận mục tiêu.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function setByTargetProfitFromSupplier(Request $request)
    {
        try {
            $request->validate([
                'variants' => 'required|array',
                'variants.*.variant_id' => 'required|integer|exists:product_variants,id', // variants table
                'variants.*.variant_from_supplier_id' => 'required|integer|exists:variants_from_supplier,id', // variant_from_suppliers table
                'profit_percent' => 'required|numeric|min:-100',
                'psychological_strategy' => 'nullable|string',
            ]);

            $updatedCount = $this->pricingService->setPricesByTargetProfitAndChosenSupplier(
                $request->input('variants'),
                (float) $request->input('profit_percent'),
                $request->input('psychological_strategy')
            );

            return response()->json([
                'message' => "Đã cập nhật giá bán thành công cho {$updatedCount} sản phẩm theo lợi nhuận mục tiêu và nguồn cung cấp đã chọn.",
                'status' => 'success',
                'data' => $updatedCount,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $e->errors()
            ], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => 'Lỗi đối số: ' . $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Cập nhật lại giá bán của các biến thể dựa trên giá mua từ một VariantFromSupplier CỤ THỂ và profit_percent hiện tại của Variant.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function recalculateByChosenSupplierCost(Request $request)
    {
        try {
            $request->validate([
                'variants' => 'required|array',
                'variants.*.variant_id' => 'required|integer|exists:product_variants,id',
                'variants.*.variant_from_supplier_id' => 'required|integer|exists:variants_from_supplier,id',
                'psychological_strategy' => 'nullable|string',
            ]);

            $updatedCount = $this->pricingService->recalculatePricesByChosenSupplierCost(
                $request->input('variants'),
                $request->input('psychological_strategy')
            );

            return response()->json([
                'message' => "Đã tính toán và cập nhật lại giá bán thành công cho {$updatedCount} sản phẩm theo giá gốc từ nguồn cung cấp đã chọn.",
                'status' => 'success',
                'data' => $updatedCount,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $e->errors()
            ], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => 'Lỗi đối số: ' . $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
   public function setPricesByTargetProfit(Request $request)
    {
        try {
            $request->validate([
                'variant_ids' => 'required|array',
                'variant_ids.*' => 'integer|exists:product_variants,id', 
                'profit_percent' => 'required|numeric|min:-100', 
            ]);

            $variantIds = $request->input('variant_ids');
            $profitPercent = (float) $request->input('profit_percent');

            $updatedCount = $this->pricingService->setPricesByTargetProfit(
                $variantIds,
                $profitPercent,
            );

            return response()->json([
                'message' => "Đã cập nhật giá thành công cho {$updatedCount} sản phẩm theo lợi nhuận mục tiêu.",
                'status' => 'success',
                'data' => $updatedCount,
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => 'Lỗi đối số: ' . $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
           return ApiExceptionHandler::handleException($e);
        }
    }


     public function recalculatePricesByCurrentCost(Request $request)
    {
        try {
            $request->validate([
                'variant_ids' => 'required|array',
                'variant_ids.*' => 'integer|exists:product_variants,id', 
            ]);

            $variantIds = $request->input('variant_ids');

            $updatedCount = $this->pricingService->updatePricesByCurrentAverageCostAndProfit(
                $variantIds,
            );

            return response()->json([
                'message' => "Đã tính toán và cập nhật lại giá thành công cho {$updatedCount} sản phẩm theo giá gốc hiện tại.",
                'status' => 'success',
                'data' => $updatedCount,
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => 'Lỗi đối số: ' . $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
}
