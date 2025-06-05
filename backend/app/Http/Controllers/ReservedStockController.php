<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\ReservedStockService;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Http\JsonResponse;

class ReservedStockController extends Controller
{
    protected ReservedStockService $reservedStockService;

    public function __construct(ReservedStockService $reservedStockService)
    {
        $this->reservedStockService = $reservedStockService;
    }

    /**
     * Reserve stock for the given cart items.
     *
     * @param  Request  $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.variant_id' => 'required|integer|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        $user = Auth::user();

        try {
            $this->reservedStockService->reserveStockBeforeOrder(
                $user,
                $data['items']
            );

            return response()->json([
                'message' => 'Stock reserved successfully.',
                'status' => 'success', 
            ], 201);
        } catch (\Exception $e) {
            // Log exception if needed
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Release reserved stock for a user.
     *
     * @param  Request  $request
     * @return JsonResponse
     */
    public function destroy(Request $request): JsonResponse
    {
        $user = Auth::user();

        $this->reservedStockService->releaseReservedStockForUser($user);

        return response()->json([
            'message' => 'Reserved stock released.',
        ], 200);
    }

    /**
     * Confirm reservation by attaching order_id to reserved stock entries.
     *
     * @param  Request  $request
     * @param  int  $orderId
     * @return JsonResponse
     */
    public function confirm(Request $request, int $orderId): JsonResponse
    {
        $user = Auth::user();

        try {
            $this->reservedStockService->assignReservedStockToOrder($user, $orderId);

            return response()->json([
                'message' => 'Reserved stock confirmed for order ' . $orderId,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
