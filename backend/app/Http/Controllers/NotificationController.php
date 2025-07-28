<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\NotificationService;
use App\Models\Notification; // Import the Notification model for route model binding
use App\Exceptions\ApiExceptionHandler; // Assume this class exists in App\Exceptions
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response; // For HTTP response codes

class NotificationController extends Controller
{
    protected $notificationService;

    /**
     * Khởi tạo NotificationService thông qua Dependency Injection.
     *
     * @param NotificationService $notificationService
     */
    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * GET /api/notifications/unread
     * Lấy danh sách các thông báo chưa đọc của người dùng hiện tại.
     * Thường dùng cho hiển thị badge/icon thông báo trên UI.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getUnread(Request $request)
    {
        try {
            $user = Auth::user(); // Lấy người dùng hiện tại đã đăng nhập

            if (!$user) {
                // Nếu người dùng chưa đăng nhập, trả về lỗi 401 Unauthorized
                return response()->json([
                    'message' => 'Bạn chưa được xác thực.',
                    'status' => 'error',
                    'data' => null
                ], Response::HTTP_UNAUTHORIZED);
            }

            $notifications = $this->notificationService->getUnreadNotifications($user);
            $unreadCount = $this->notificationService->getUnreadNotificationsCount($user);

            return response()->json([
                'message' => 'Lấy thông báo chưa đọc thành công.',
                'status' => 'success',
                'data' => $notifications,
                'unread_count' => $unreadCount, // Thêm số lượng thông báo chưa đọc
            ], Response::HTTP_OK);
        } catch (\Exception $e) {
            Log::error("NotificationController@getUnread error for user " . (Auth::id() ?? 'guest') . ": " . $e->getMessage());
            // Sử dụng ApiExceptionHandler để xử lý và trả về lỗi chuẩn
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * GET /api/notifications
     * Lấy tất cả các thông báo của người dùng hiện tại với phân trang.
     * Thường dùng cho trang "Trung tâm thông báo" chi tiết.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'message' => 'Bạn chưa được xác thực.',
                    'status' => 'error',
                    'data' => null
                ], Response::HTTP_UNAUTHORIZED);
            }

            $perPage = $request->query('per_page', 15); // Lấy số lượng thông báo mỗi trang, mặc định 15

            // Giả định NotificationService có phương thức getPaginatedNotifications
            // Bạn cần thêm phương thức này vào NotificationService nếu chưa có.
            $notifications = $this->notificationService->getPaginatedNotifications($user, (int) $perPage);

            return response()->json([
                'message' => 'Lấy tất cả thông báo thành công.',
                'status' => 'success',
                'data' => $notifications->items(), // Lấy dữ liệu thông báo cho trang hiện tại
                'pagination' => [
                    'total' => $notifications->total(),
                    'per_page' => $notifications->perPage(),
                    'current_page' => $notifications->currentPage(),
                    'last_page' => $notifications->lastPage(),
                    'from' => $notifications->firstItem(),
                    'to' => $notifications->lastItem(),
                    'prev_page_url' => $notifications->previousPageUrl(),
                    'next_page_url' => $notifications->nextPageUrl(),
                ]
            ], Response::HTTP_OK);
        } catch (\Exception $e) {
            Log::error("NotificationController@index error for user " . (Auth::id() ?? 'guest') . ": " . $e->getMessage());
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * POST /api/notifications/{notification}/mark-as-read
     * Đánh dấu một thông báo cụ thể là đã đọc.
     * Sử dụng Route Model Binding để tự động inject đối tượng Notification.
     *
     * @param \App\Models\Notification $notification Đối tượng Notification được inject bởi Route Model Binding.
     * @return \Illuminate\Http\JsonResponse
     */
    public function markAsRead(Notification $notification)
    {
        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'message' => 'Bạn chưa được xác thực.',
                    'status' => 'error',
                    'data' => null
                ], Response::HTTP_UNAUTHORIZED);
            }

            // Kiểm tra quyền: Đảm bảo thông báo thuộc về người dùng hiện tại
            if ($notification->user_id !== $user->id) {
                return response()->json([
                    'message' => 'Bạn không có quyền truy cập thông báo này.',
                    'status' => 'error',
                    'data' => null
                ], Response::HTTP_FORBIDDEN); // HTTP 403 Forbidden
            }

            $updatedNotification = $this->notificationService->markAsRead($notification);

            return response()->json([
                'message' => 'Thông báo đã được đánh dấu là đã đọc.',
                'status' => 'success',
                'data' => $updatedNotification
            ], Response::HTTP_OK);
        } catch (\Exception $e) {
            Log::error("NotificationController@markAsRead error for notification ID " . $notification->id . ": " . $e->getMessage());
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * POST /api/notifications/mark-all-as-read
     * Đánh dấu tất cả thông báo chưa đọc của người dùng hiện tại là đã đọc.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function markAllAsRead(Request $request)
    {
        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'message' => 'Bạn chưa được xác thực.',
                    'status' => 'error',
                    'data' => null
                ], Response::HTTP_UNAUTHORIZED);
            }

            $count = $this->notificationService->markAllAsRead($user);

            return response()->json([
                'message' => "Đã đánh dấu {$count} thông báo là đã đọc.",
                'status' => 'success',
                'data' => ['count' => $count]
            ], Response::HTTP_OK);
        } catch (\Exception $e) {
            Log::error("NotificationController@markAllAsRead error for user " . (Auth::id() ?? 'guest') . ": " . $e->getMessage());
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * DELETE /api/notifications/{notification}
     * Xóa một thông báo cụ thể.
     * Sử dụng Route Model Binding.
     *
     * @param \App\Models\Notification $notification Đối tượng Notification được inject.
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(Notification $notification)
    {
        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'message' => 'Bạn chưa được xác thực.',
                    'status' => 'error',
                    'data' => null
                ], Response::HTTP_UNAUTHORIZED);
            }

            // Kiểm tra quyền: Đảm bảo thông báo thuộc về người dùng hiện tại
            if ($notification->user_id !== $user->id) {
                return response()->json([
                    'message' => 'Bạn không có quyền xóa thông báo này.',
                    'status' => 'error',
                    'data' => null
                ], Response::HTTP_FORBIDDEN);
            }

            $deleted = $this->notificationService->deleteNotification($notification);

            if ($deleted) {
                return response()->json([
                    'message' => 'Thông báo đã được xóa thành công.',
                    'status' => 'success',
                    'data' => null
                ], Response::HTTP_OK);
            } else {
                return response()->json([
                    'message' => 'Không thể xóa thông báo.',
                    'status' => 'error',
                    'data' => null
                ], Response::HTTP_INTERNAL_SERVER_ERROR); // Lỗi máy chủ nếu không xóa được
            }
        } catch (\Exception $e) {
            Log::error("NotificationController@destroy error for notification ID " . $notification->id . ": " . $e->getMessage());
            return ApiExceptionHandler::handleException($e);
        }
    }

    

}