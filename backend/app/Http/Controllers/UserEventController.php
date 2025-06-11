<?php

namespace App\Http\Controllers;

use App\Services\UserEventService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use InvalidArgumentException;
use LogicException;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;
class UserEventController extends Controller
{
    protected $userEventService;

    public function __construct(UserEventService $userEventService)
    {
        $this->userEventService = $userEventService;
    }

    /**
     * Nhận event từ frontend và lưu vào hệ thống.
     * POST /api/user-events
     */
   public function store(Request $request)
    {
        // Lấy user hiện tại từ authentication
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Validate input chỉ cần product_id, event_type mặc định là 'view'
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        try {
            $event = $this->userEventService->logEvent(
                $user->id,
                $data['product_id'],
                'view',      
            );

            return response()->json([
                'message' => 'Thu thâp hành vi view thành công',
                'status'  => 'success',
                'event'   => $event,
            ], 201);
        } catch (InvalidArgumentException | LogicException $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
}

// Trong routes/api.php
// Route::post('user-events', [UserEventController::class, 'store']);
