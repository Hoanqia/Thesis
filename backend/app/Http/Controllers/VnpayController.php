<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Response;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

class VnPayController extends Controller
{
     public function createPayment(Request $request)
    {   
        try {
                      // 1. Validate đầu vào
        $validated = $request->validate([
            'orderId'     => 'required|integer|exists:orders,id',
            'bankCode'    => 'nullable|string',
            'language'    => 'nullable|string|in:vn,en',
            'description' => 'nullable|string|max:255',
        ]);

        // 2. Lấy order từ DB
        $orderId     = $validated['orderId'];
        $order       = Order::findOrFail($orderId);
        $description = $validated['description'] ?? "Thanh toán đơn #{$orderId}";

        // 3. Lấy cấu hình từ config/vnpay.php (đảm bảo trong config không có dấu ';' hoặc space dư)
        $vnp_TmnCode    = config('vnpay.tmn_code');    // ví dụ: "P4QFFDRB"
        $vnp_HashSecret = config('vnpay.hash_secret'); // ví dụ: "abcd1234secret"
        $vnp_Url        = config('vnpay.url');         // ví dụ: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
        $vnp_ReturnUrl  = config('vnpay.return_url');  // ví dụ: "https://your-public-url.com/api/vnpay_return"
        // 4. Chuẩn bị dữ liệu
        $amount      = $order->total_price;          // ví dụ: 305300 (tức 305.300 VND)
        $vnp_Amount  = $amount * 100;                // VNPay yêu cầu nhân 100 → 30530000 (30.530.000 VND)
        $vnp_TxnRef  = (string)$order->id;           // ví dụ: "25"
        $bankCode    = $validated['bankCode'] ?? null;
        $language    = $validated['language'] ?? 'vn';
        // **LƯU Ý**: vnp_OrderType phải là một mã “OrderType” hợp lệ theo hướng dẫn VNPay.
        // Trong ví dụ này, giả sử chúng ta dùng “2205” (thanh toán online đơn hàng).
        $vnp_OrderType = "2205";

        $vnp_CreateDate = now()->format('YmdHis');          // ví dụ: "20250605103858"
        $vnp_ExpireDate = now()->addMinutes(15)->format('YmdHis'); // ví dụ: "20250605105358"

        // 5. Xử lý IP (nếu là ::1 thì chuyển thành 127.0.0.1)
        $ip = $request->ip();
        if ($ip === '::1') {
            $ip = '127.0.0.1';
        }
        $vnp_IpAddr = $ip;

        // 6. Tạo mảng inputData (nhớ đúng định dạng, không thêm ký tự thừa)
        $inputData = [
            "vnp_Version"    => "2.1.0",
            "vnp_TmnCode"    => $vnp_TmnCode,
            "vnp_Amount"     => $vnp_Amount,
            "vnp_Command"    => "pay",
            "vnp_CreateDate" => $vnp_CreateDate,
            "vnp_CurrCode"   => "VND",
            "vnp_IpAddr"     => $vnp_IpAddr,
            "vnp_Locale"     => $language,
            "vnp_OrderInfo"  => $description,
            "vnp_OrderType"  => $vnp_OrderType,
            "vnp_ReturnUrl"  => $vnp_ReturnUrl,
            "vnp_TxnRef"     => $vnp_TxnRef,
            "vnp_ExpireDate" => $vnp_ExpireDate,
        ];

        // Nếu khách hàng có chọn bankCode
        if (!empty($bankCode)) {
            $inputData['vnp_BankCode'] = $bankCode;
        }

        // 7. Sắp xếp key theo thứ tự chữ cái để build hashData và query string
        ksort($inputData);

        $hashData = "";
        $query    = "";
        $i        = 0;
        foreach ($inputData as $key => $value) {
            // 8. Build hashData (chỉ nối key=value, đã urlencode, phân cách bằng &)
            if ($i === 1) {
                $hashData .= '&' . urlencode($key) . "=" . urlencode($value);
            } else {
                $hashData .= urlencode($key) . "=" . urlencode($value);
                $i = 1;
            }

            // 9. Build query string (dùng để redirect)
            $query .= urlencode($key) . "=" . urlencode($value) . '&';
        }
        // Loại bỏ dấu & dư ở cuối
        $query = rtrim($query, '&');

        // 10. Tạo chữ ký HMAC SHA512
        $vnpSecureHash = hash_hmac('sha512', $hashData, $vnp_HashSecret);

        // 11. Ghép URL thanh toán đầy đủ
        $paymentUrl = $vnp_Url . "?" . $query . '&vnp_SecureHash=' . $vnpSecureHash;
        Log::info('FULL PAYMENT URL: ' . $paymentUrl);

        // 12. Ghi log để kiểm tra (nếu cần debug)
        Log::info('=== VNPay createPayment ===');
        Log::info('InputData:', $inputData);
        Log::info('HashData: ' . $hashData);
        Log::info('QueryString: ' . $query);
        Log::info('SecureHash: ' . $vnpSecureHash);
        Log::info('PaymentUrl: ' . $paymentUrl);

        // 13. Trả về JSON cho Frontend
        return response()->json([
            'paymentUrl' => $paymentUrl
        ]);
        }catch(\Exceptio $e){
            Log::error('Error in createPayment: ' . $e->getMessage());
                Log::error($e->getTraceAsString());

                // Trả về JSON lỗi (có thể kèm message để debug)
                return response()->json([
                    'message' => 'Lỗi khi tạo payment: ' . $e->getMessage()
                ], 500);
        }
  
    }
    
    /**
     * VNPay redirect về đây sau khi user hoàn tất (hoặc hủy) giao dịch.
     * Đây là GET endpoint, VNPay sẽ kèm param trên URL.
     */
    public function vnpayReturn(Request $request)
{
    // 1. Lấy secret
    $vnp_HashSecret = trim(config('vnpay.hash_secret'));

    // 2. Lấy tất cả param vnp_
    $inputData = [];
    foreach ($request->query() as $key => $value) {
        if (substr($key, 0, 4) === 'vnp_') {
            $inputData[$key] = $value;
        }
    }

    // 3. Tách signature do VNPAY gửi
    $vnp_SecureHash = $inputData['vnp_SecureHash'] ?? '';
    unset($inputData['vnp_SecureHash'], $inputData['vnp_SecureHashType']);

    // 4. Sắp xếp key
    ksort($inputData);

    // 5. Build chuỗi hashData (urlencode từng key và value, nối bằng &)
    $i = 0;
    $hashData = '';
    foreach ($inputData as $key => $value) {
        $encodedKey   = urlencode($key);
        $encodedValue = urlencode($value);
        if ($i === 1) {
            $hashData .= '&' . $encodedKey . '=' . $encodedValue;
        } else {
            $hashData .= $encodedKey . '=' . $encodedValue;
            $i = 1;
        }
    }

    // 6. Tính lại chữ ký
    $calculatedHash = hash_hmac('sha512', $hashData, $vnp_HashSecret);

    // 7. Log để debug nếu cần
    Log::info('VNPAY Return - hashData: ' . $hashData);
    Log::info('VNPAY Return - calculatedHash: ' . $calculatedHash);
    Log::info('VNPAY Return - vnp_SecureHash: ' . $vnp_SecureHash);

    // 8. So sánh hash
    if ($calculatedHash === $vnp_SecureHash) {
        // Chữ ký hợp lệ, kiểm tra response code
        $vnp_ResponseCode = $inputData['vnp_ResponseCode'] ?? '';
        $orderId          = $inputData['vnp_TxnRef']       ?? null;
        $amount           = ($inputData['vnp_Amount'] ?? 0) / 100;

        if ($vnp_ResponseCode === '00') {
            // Thanh toán thành công
            $order = Order::find($orderId);
            if ($order) {
                $order->is_paid = 1;
                $order->save();
                Log::info("Order #{$orderId} marked as paid.");
            } else {
                Log::error("Order #{$orderId} not found.");
            }

            $frontendBase = 'http://localhost:3000'; 
        $url = "{$frontendBase}/checkout/order_success"
             . "?orderId={$orderId}"
             . "&vnp_ResponseCode={$vnp_ResponseCode}"
             . "&payment_method=vnpay";

        return redirect()->away($url);
        } else {
            // Thanh toán thất bại hoặc hủy
            $frontendBase = 'http://localhost:3000';
        $url = "{$frontendBase}/checkout/order_success"
             . "?orderId={$orderId}"
             . "&vnp_ResponseCode=97"
             . "&payment_method=vnpay";

        return redirect()->away($url);
        }
    } else {
        // Chữ ký không hợp lệ
        Log::warning('VNPAY Return - Invalid signature');
        return response()->json([
            'code'    => '97',
            'message' => 'Invalid signature'
        ]);
    }
}

    
    
}
