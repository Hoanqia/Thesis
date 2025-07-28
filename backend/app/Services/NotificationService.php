<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Collection; // Import Collection để định nghĩa kiểu trả về
use Illuminate\Contracts\Pagination\LengthAwarePaginator; // Import cho phân trang

/**
 * Class NotificationService
 * Quản lý các hoạt động liên quan đến thông báo trong ứng dụng.
 */
class NotificationService
{
    /**
     * Tạo một thông báo mới cho người dùng.
     *
     * @param User $user Đối tượng người dùng sẽ nhận thông báo.
     * @param string $type Loại thông báo (ví dụ: 'order_success', 'new_message', 'promotion').
     * @param string $content Nội dung hiển thị của thông báo.
     * @return Notification Đối tượng thông báo đã được tạo.
     */
    public function createNotification(User $user, string $type, string $content): Notification
    {
        return Notification::create([
            'user_id' => $user->id,
            'type' => $type,
            'content' => $content,
            'is_read' => false, // Mặc định là chưa đọc khi tạo mới
        ]);
    }

    /**
     * Lấy tất cả các thông báo cho một người dùng với phân trang.
     * Sắp xếp theo thời gian tạo mới nhất.
     *
     * @param User $user Đối tượng người dùng.
     * @param int $perPage Số lượng thông báo mỗi trang.
     * @return LengthAwarePaginator Đối tượng phân trang.
     */
    public function getPaginatedNotifications(User $user, int $perPage = 15): LengthAwarePaginator
    {
        return $user->notifications()->latest()->paginate($perPage);
    }


    /**
     * Lấy tất cả các thông báo (đã đọc và chưa đọc) cho một người dùng.
     * Sắp xếp theo thời gian tạo mới nhất.
     *
     * @param User $user Đối tượng người dùng.
     * @param int $limit Số lượng thông báo tối đa muốn lấy (mặc định 20).
     * @return Collection Một collection các đối tượng Notification.
     */
    public function getAllNotifications(User $user, int $limit = 20): Collection
    {
        return $user->notifications()->latest()->limit($limit)->get();
    }

    /**
     * Lấy số lượng thông báo chưa đọc cho một người dùng.
     *
     * @param User $user Đối tượng người dùng.
     * @return int Số lượng thông báo chưa đọc.
     */
    public function getUnreadNotificationsCount(User $user): int
    {
        return $user->unreadNotifications()->count();
    }
      /**
     * Lấy danh sách các thông báo chưa đọc cho một người dùng.
     * Sắp xếp theo thời gian tạo mới nhất.
     *
     * @param User $user Đối tượng người dùng.
     * @return Collection Một collection các đối tượng Notification chưa đọc.
     */
    public function getUnreadNotifications(User $user): Collection // <-- PHƯƠNG THỨC BỊ THIẾU
    {
        return $user->unreadNotifications()->latest()->get();
        // Phương thức unreadNotifications() này được định nghĩa trong User model
        // thông qua mối quan hệ hasMany và scopeUnread trên Notification model.
        // Nó đảm bảo chỉ lấy thông báo thuộc về người dùng được truyền vào và chưa đọc.
    }

    /**
     * Đánh dấu một thông báo cụ thể là đã đọc.
     *
     * @param Notification $notification Đối tượng thông báo cần đánh dấu.
     * @return Notification Đối tượng thông báo sau khi đã cập nhật trạng thái.
     */
    public function markAsRead(Notification $notification): Notification
    {
        return $notification->markAsRead(); // Sử dụng phương thức từ Model
    }

    /**
     * Đánh dấu một thông báo cụ thể là chưa đọc.
     *
     * @param Notification $notification Đối tượng thông báo cần đánh dấu.
     * @return Notification Đối tượng thông báo sau khi đã cập nhật trạng thái.
     */
    public function markAsUnread(Notification $notification): Notification
    {
        return $notification->markAsUnread(); // Sử dụng phương thức từ Model
    }

    /**
     * Đánh dấu tất cả thông báo chưa đọc của một người dùng là đã đọc.
     *
     * @param User $user Đối tượng người dùng.
     * @return int Số lượng thông báo đã được đánh dấu là đã đọc.
     */
    public function markAllAsRead(User $user): int
    {
        // Tránh N+1 query bằng cách chỉ cập nhật những thông báo chưa đọc
        return $user->unreadNotifications()->update([
            'is_read' => true,
            'read_at' => now(),
        ]);
    }

    /**
     * Xóa một thông báo cụ thể.
     *
     * @param Notification $notification Đối tượng thông báo cần xóa.
     * @return bool True nếu xóa thành công, false nếu ngược lại.
     */
    public function deleteNotification(Notification $notification): bool
    {
        return $notification->delete();
    }



      // --- Hàm mới thêm để gửi thông báo cho ADMIN ---
    /**
     * Tạo thông báo cho một (hoặc nhiều) quản trị viên cụ thể.
     *
     * @param string $type Loại thông báo dành cho admin (ví dụ: 'admin_new_order', 'admin_user_registered').
     * @param string $content Nội dung thông báo.
     * @param array|null $adminIds Mảng ID của các admin cụ thể muốn gửi. Nếu null, gửi cho tất cả admin.
     * @return Collection Collection các đối tượng Notification đã được tạo.
     */
    public function createAdminNotification(
        string $type,
        string $content,
        ?array $adminIds = null
    ): Collection {
        // Lấy tất cả admin hoặc admin cụ thể
        $adminQuery = User::where('role', 'admin'); // Sử dụng cột 'role'

        if (!is_null($adminIds) && !empty($adminIds)) {
            $adminQuery->whereIn('id', $adminIds);
        }

        $admins = $adminQuery->get();
        $createdNotifications = new Collection();

        foreach ($admins as $admin) {
            // Tái sử dụng hàm createNotification chung
            $notification = $this->createNotification($admin, $type, $content);
            $createdNotifications->push($notification);
        }

        return $createdNotifications;
    }

}