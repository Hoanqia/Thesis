<?php

namespace App\Services;

use App\Models\Voucher;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Collection;

class VoucherService
{
    /**
     * Lấy tất cả voucher
     */
    public function getAll(): Collection
    {
        return Voucher::all();
    }

    /**
     * Tìm voucher theo ID
     */
    public function findById(int $id): ?Voucher
    {
        return Voucher::find($id);
    }

    /**
     * Tìm voucher theo mã code
     */
    public function findByCode(string $code): ?Voucher
    {
        return Voucher::where('code', $code)->first();
    }

    /**
     * Tạo voucher mới
     */
    public function create(array $data): Voucher
    {
        return Voucher::create($data);
    }

    /**
     * Cập nhật voucher
     */
    public function update(int $id, array $data): ?Voucher
    {
        $voucher = Voucher::find($id);
        if ($voucher) {
            $voucher->update($data);
        }
        return $voucher;
    }

    /**
     * Xóa voucher
     */
    public function delete(int $id): bool
    {
        $voucher = Voucher::find($id);
        if ($voucher) {
            return $voucher->delete();
        }
        return false;
    }

    /**
     * Kiểm tra voucher hợp lệ
     */
    public function validateVoucher(string $code, float $orderAmount): array
    {
        $voucher = $this->findByCode($code);

        if (!$voucher) {
            return ['valid' => false, 'message' => 'Mã giảm giá không tồn tại'];
        }

        if (!$voucher->status) {
            return ['valid' => false, 'message' => 'Mã giảm giá không hoạt động'];
        }

        $now = Carbon::now();
        if ($now->lt($voucher->start_date) || $now->gt($voucher->end_date)) {
            return ['valid' => false, 'message' => 'Mã giảm giá đã hết hạn hoặc chưa bắt đầu'];
        }

        if ($voucher->max_uses !== null && $voucher->used_count >= $voucher->max_uses) {
            return ['valid' => false, 'message' => 'Mã giảm giá đã hết lượt sử dụng'];
        }

        if ($orderAmount < $voucher->minimum_order_amount) {
            return ['valid' => false, 'message' => 'Đơn hàng chưa đạt giá trị tối thiểu'];
        }

        return ['valid' => true, 'voucher' => $voucher];
    }

    /**
     * Tăng số lần sử dụng sau khi dùng voucher thành công
     */
    public function incrementUsage(string $code): void
    {
        Voucher::where('code', $code)->increment('used_count');
    }
}
