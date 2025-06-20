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
