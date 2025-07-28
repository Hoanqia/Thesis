<?php

namespace App\Http\Controllers;

use App\Services\WeightedEventProcessedService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse; // Để trả về JSON
use Illuminate\Support\Facades\Log;
use App\Exceptions\ApiExceptionHandler;

class WeightedEventController extends Controller
{
    protected $weightedEventService;

    /**
     * Constructor to inject the service.
     *
     * @param WeightedEventProcessedService $weightedEventService
     */
    public function __construct(WeightedEventProcessedService $weightedEventService)
    {
        $this->weightedEventService = $weightedEventService;
    }

    /**
     * API endpoint to store processed weighted events.
     * This method would typically be called by a backend service (e.g., your Python script
     * after processing) or an admin tool, not directly by a frontend.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {   
        Log::info('Full Request Payload:', $request->all()); // <-- ĐÃ THAY ĐỔI DD() THÀNH LOG::INFO()

        // 1. Validate the incoming request data
        // Expects 'events' as an array of objects/arrays, each with user_id, product_id, implicit_score
        $validatedData = $request->validate([
            'events' => 'required|array',
            'events.*.user_id' => 'required|integer',
            'events.*.product_id' => 'required|integer',
            'events.*.implicit_score' => 'required|numeric',
        ]);

        $data = $validatedData['events'];

        Log::info('Received data for storing weighted events.', ['count' => count($data)]);

        // 2. Call the service to store the data
        $success = $this->weightedEventService->storeProcessedEvents($data);

        // 3. Return appropriate response
        if ($success) {
            Log::info('Successfully stored processed weighted events.');
            return response()->json([
                'message' => 'Processed weighted events stored successfully.',
                'count' => count($data)
            ], 200);
        } else {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * API endpoint to get implicit scores for a list of user IDs.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getImplicitScores(Request $request): JsonResponse
    {
        // 1. Validate the incoming request data
        // Expects 'user_ids' as an array of integers
        $validatedData = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'required|integer',
        ]);

        $userIds = $validatedData['user_ids'];

        Log::info('Fetching implicit scores for user IDs.', ['user_ids_count' => count($userIds)]);

        // 2. Call the service to get the data
        $scores = $this->weightedEventService->getImplicitScoresForUsers($userIds);

        // 3. Return the data as JSON
        // Convert the Collection of models to a plain array of associative arrays
        return response()->json([
            'message' => 'Implicit scores retrieved successfully.',
            'data' => $scores->toArray(),
            'count' => $scores->count()
        ], 200);
    }

    /**
     * API endpoint to get all unique product IDs.
     *
     * @return JsonResponse
     */
    public function getUniqueProductIds(): JsonResponse
    {
        $productIds = $this->weightedEventService->getUniqueProductIds();

        return response()->json([
            'message' => 'Unique product IDs retrieved successfully.',
            'data' => $productIds->toArray(),
            'count' => $productIds->count()
        ], 200);
    }

    /**
     * API endpoint to get all unique user IDs.
     *
     * @return JsonResponse
     */
    public function getUniqueUserIds(): JsonResponse
    {
        $userIds = $this->weightedEventService->getUniqueUserIds();

        return response()->json([
            'message' => 'Unique user IDs retrieved successfully.',
            'data' => $userIds->toArray(),
            'count' => $userIds->count()
        ], 200);
    }
}