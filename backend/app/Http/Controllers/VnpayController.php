<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Response;
use App\Models\Order;

class VnPayController extends Controller
{
    /**
     * Tạo URL thanh toán và trả về JSON { paymentUrl: ... }
     */
    // public function createPayment(Request $request)
    // {   
    //      $validated = $request->validate([
    //     'orderId' => 'required|integer|exists:orders,id',
    //     'bankCode'=> 'nullable|string',
    //     'language'=> 'nullable|string|in:vn,en',
    //     'description' => 'nullable|string|max:255',

    // ]);

    //     $orderId  = $validated['orderId'];
    //     $order    = Order::findOrFail($orderId);
    //     $description = $validated['description'] ?? "Thanh toán đơn #{$orderId}";

    //     // Lấy cấu hình từ config/vnpay.php
    //     $vnp_TmnCode    = config('vnpay.tmn_code');
    //     $vnp_HashSecret = config('vnpay.hash_secret');
    //     $vnp_Url        = config('vnpay.url');
    //     $vnp_ReturnUrl  = config('vnpay.return_url');

    //     // Lấy dữ liệu từ Frontend gửi lên
    //     $orderId     = $order->id;      // VD: "ORD123456"
    //     $amount      = $order->total_price;       // Số tiền (đơn vị VND)
    //     $description = $validated['description'] ?? "Thanh toán đơn #{$orderId}";  // VD: "Thanh toán đơn ORD123456"
    //     $bankCode    = $request->input('bankCode');     // Nếu có chọn ngân hàng
    //     $language    = $request->input('language', 'vn');

    //     // Tạo mã giao dịch tham chiếu (có thể dùng time + random hoặc UUID)
    //     $vnp_TxnRef = $orderId; // + một đoạn random nếu muốn (nhưng cần mapping về đơn hàng)
        
    //     // Tính thời gian tạo và expire
    //     $vnp_CreateDate = now()->format('YmdHis');
    //     $vnp_ExpireDate = now()->addMinutes(15)->format('YmdHis');

    //     // Đơn vị VNPay yêu cầu amount phải * 100
    //     $vnp_Amount = $amount * 100;

    //     // Lấy IP của client (Next.js gọi đến)
    //     $vnp_IpAddr = $request->ip();

    //     // Tạo mảng input data
    //     $inputData = [
    //         "vnp_Version"    => "2.1.0",
    //         "vnp_TmnCode"    => $vnp_TmnCode,
    //         "vnp_Amount"     => $vnp_Amount,
    //         "vnp_Command"    => "pay",
    //         "vnp_CreateDate" => $vnp_CreateDate,
    //         "vnp_CurrCode"   => "VND",
    //         "vnp_IpAddr"     => $vnp_IpAddr,
    //         "vnp_Locale"     => $language,
    //         "vnp_OrderInfo"  => $description,
    //         "vnp_OrderType"  => 250000, 
    //         "vnp_ReturnUrl"  => $vnp_ReturnUrl,
    //         "vnp_TxnRef"     => $vnp_TxnRef,
    //         "vnp_ExpireDate" => $vnp_ExpireDate,
    //     ];

    //     // Nếu có choose bank
    //     if (!empty($bankCode)) {
    //         $inputData['vnp_BankCode'] = $bankCode;
    //     }

    //     // Sắp xếp key theo thứ tự chữ cái
    //     ksort($inputData);

    //     // Build query string và hash data
    //     $query    = "";
    //     $hashData = "";
    //     $i        = 0;
    //     foreach ($inputData as $key => $value) {
    //         if ($i === 1) {
    //             $hashData .= '&' . urlencode($key) . "=" . urlencode($value);
    //         } else {
    //             $hashData .= urlencode($key) . "=" . urlencode($value);
    //             $i = 1;
    //         }
    //         $query .= urlencode($key) . "=" . urlencode($value) . '&';
    //     }
    //     // Loại bỏ dấu & cuối cùng
    //     $query    = rtrim($query, '&');

    //     // Tạo chữ ký HMAC SHA512
    //     $vnpSecureHash = hash_hmac('sha512', $hashData, $vnp_HashSecret);

    //     // Tạo URL thanh toán đầy đủ
    //     $paymentUrl = $vnp_Url . "?" . $query . '&vnp_SecureHash=' . $vnpSecureHash;

    //     // (Có thể lưu Order vào DB với trạng thái “chờ thanh toán” ở đây, mapping với $vnp_TxnRef)

    //     // Trả về JSON cho Frontend Next.js
    //     return response()->json([
    //         'paymentUrl' => $paymentUrl
    //     ]);
    // }


     public function createPayment(Request $request)
    {
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
    }
    
    /**
     * VNPay redirect về đây sau khi user hoàn tất (hoặc hủy) giao dịch.
     * Đây là GET endpoint, VNPay sẽ kèm param trên URL.
     */
    public function vnpayReturn(Request $request)
    {
        $vnp_HashSecret = config('vnpay.hash_secret');

        // Lấy toàn bộ input query string do VNPay gửi
        $inputData = $request->all();

        // Lấy chữ ký do VNPay trả về, rồi bỏ ra khỏi mảng để tự calculate lại
        $vnpSecureHash = $inputData['vnp_SecureHash'] ?? '';
        unset($inputData['vnp_SecureHash']);
        unset($inputData['vnp_SecureHashType']);

        // Sort lại key
        ksort($inputData);
        $hashData = "";
        foreach ($inputData as $key => $value) {
            if (substr($key, 0, 4) === "vnp_") {
                $hashData .= $key . "=" . $value . "&";
            }
        }
        // Loại bỏ dấu & cuối
        $hashData = rtrim($hashData, '&');

        // Tính lại hash
        $calculatedHash = hash_hmac('sha512', $hashData, $vnp_HashSecret);

        if ($calculatedHash === $vnpSecureHash) {
            // Chữ ký hợp lệ, kiểm tra status giao dịch
            $vnp_ResponseCode = $inputData['vnp_ResponseCode'];
            $vnp_TxnRef       = $inputData['vnp_TxnRef'];   // chính là orderId
            $vnp_Amount       = $inputData['vnp_Amount'] / 100; // quy về VND
            $vnp_TransactionNo= $inputData['vnp_TransactionNo'] ?? null;

            if ($vnp_ResponseCode == '00') {
                // Thanh toán thành công
                // TODO: Cập nhật trạng thái order (Order::where('order_id', $vnp_TxnRef)->update(['status'=>'PAID', 'vnp_TransactionNo'=>$vnp_TransactionNo]);)
                // Rồi redirect hoặc trả view JSON
                return response()->json([
                    'code'    => '00',
                    'message' => 'Thanh toán thành công',
                    'orderId' => $vnp_TxnRef,
                    'amount'  => $vnp_Amount,
                    'transNo' => $vnp_TransactionNo
                ]);
            } else {
                // Thanh toán thất bại hoặc user hủy
                return response()->json([
                    'code'    => $vnp_ResponseCode,
                    'message' => 'Thanh toán không thành công'
                ]);
            }
        } else {
            // Hash không trùng, nghi ngờ fake request
            return response()->json([
                'code'    => '97',
                'message' => 'Invalid signature'
            ]);
        }
    }

    /**
     * IPN (Instant Payment Notification) – nếu bạn muốn xử lý event từ VNPay (nếu họ không redirect được).
     * VNPay sẽ post data vào đây. Xử lý giống vnpayReturn nhưng bạn trả về định dạng JSON theo spec của VNPay.
     */
    public function vnpayIpn(Request $request)
    {
        $vnp_HashSecret = config('vnpay.hash_secret');
        $inputData      = $request->all();

        $vnpSecureHash = $inputData['vnp_SecureHash'] ?? '';
        unset($inputData['vnp_SecureHash']);
        unset($inputData['vnp_SecureHashType']);

        ksort($inputData);
        $hashData = "";
        foreach ($inputData as $key => $value) {
            if (substr($key, 0, 4) === "vnp_") {
                $hashData .= $key . "=" . $value . "&";
            }
        }
        $hashData = rtrim($hashData, '&');
        $calculatedHash = hash_hmac('sha512', $hashData, $vnp_HashSecret);

        if ($calculatedHash === $vnpSecureHash) {
            $vnp_ResponseCode = $inputData['vnp_ResponseCode'];
            $vnp_TxnRef       = $inputData['vnp_TxnRef'];
            $vnp_Amount       = $inputData['vnp_Amount'] / 100;

            if ($vnp_ResponseCode == '00') {
                // Cập nhật trạng thái đơn hàng nếu chưa xử lý
                // TODO: Order::where('order_id', $vnp_TxnRef)->update(['status'=>'PAID']);
                return response()->json([
                    'RspCode' => '00',
                    'Message' => 'Confirm Success'
                ]);
            } else {
                return response()->json([
                    'RspCode' => '00',
                    'Message' => 'Confirm Fail'
                ]);
            }
        } else {
            return response()->json([
                'RspCode' => '97',
                'Message' => 'Invalid signature'
            ]);
        }
    }
}
