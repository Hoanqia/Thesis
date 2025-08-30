<?php

namespace App\Jobs;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Google\Client;
use Google\Service\Gmail;
use Google\Service\Gmail\Message;
use Exception;
use Illuminate\Support\Facades\Log;

class SendOrderConfirmationEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $order;

    /**
     * Create a new job instance.
     *
     * @param Order $order The order model instance.
     * @return void
     */
    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        try {
            $client = new Client();
            // SỬ DỤNG CLIENT ID VÀ SECRET DÀNH RIÊNG CHO MAILER
            $client->setClientId(env('GOOGLE_MAILER_CLIENT_ID'));
            $client->setClientSecret(env('GOOGLE_MAILER_CLIENT_SECRET'));

            // Sử dụng refresh token để lấy access token mới
            $client->fetchAccessTokenWithRefreshToken(env('GOOGLE_MAILER_REFRESH_TOKEN'));

            // Đặt access token cho client
            $accessToken = $client->getAccessToken();
            $client->setAccessToken($accessToken);

            // Khởi tạo dịch vụ Gmail
            $service = new Gmail($client);

            // Lấy email người nhận từ thông tin người dùng của đơn hàng
            // Đảm bảo model Order có quan hệ 'user' và model User có trường 'email'
            $recipientEmail = $this->order->user->email;
            $senderEmail = env('GOOGLE_MAILER_EMAIL'); // Địa chỉ Gmail của bạn để gửi email

            // Xây dựng nội dung email HTML
            $emailContent = $this->buildEmailContent($this->order);
            $subject = 'Xác nhận đơn hàng #' . $this->order->id . ' của bạn';

            // Tạo đối tượng Message và thiết lập nội dung email thô (raw message)
            $message = new Message();
            $rawMessage = $this->createMessage($senderEmail, $recipientEmail, $subject, $emailContent);
            // $message->setRaw(base64_encode($rawMessage)); // Mã hóa Base64Url
            $message->setRaw(rtrim(strtr(base64_encode($rawMessage), '+/', '-_'), '='));

            // Gửi email
            $service->users_messages->send('me', $message);

            Log::info('Order confirmation email sent for Order ID: ' . $this->order->id . ' to ' . $recipientEmail);

        } catch (Exception $e) {
            Log::error('Failed to send order confirmation email for Order ID: ' . $this->order->id . '. Error: ' . $e->getMessage());
            // Tùy chọn: ném lại ngoại lệ để Job được thử lại nếu cấu hình queue cho phép
            // throw $e;
        }
    }

    /**
     * Builds the HTML content for the order confirmation email.
     *
     * @param Order $order The order model instance.
     * @return string HTML content.
     */
    protected function buildEmailContent(Order $order)
    {
        $itemsHtml = '';
        foreach ($order->orderItems as $item) {
            $itemsHtml .= '
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">' . htmlspecialchars($item->variant_name) . '</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">' . number_format($item->price) . ' VND</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">' . htmlspecialchars($item->quantity) . '</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">' . number_format($item->price * $item->quantity) . ' VND</td>
                </tr>
            ';
        }

       $subtotalBeforeProductDiscount = $order->total_price + $order->discount_on_products - $order->shipping_fee + $order->discount_on_shipping;

        $emailHtml = '
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Xác nhận đơn hàng của bạn</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #f9f9f9; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .header h1 { color: #0056b3; }
                    .order-details, .shipping-info { margin-bottom: 20px; border-top: 1px solid #eee; padding-top: 15px; }
                    .order-details p, .shipping-info p { margin: 5px 0; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .total-section { text-align: right; margin-top: 20px; }
                    .total-section p { font-size: 1.1em; font-weight: bold; margin: 5px 0; }
                    .footer { text-align: center; font-size: 0.9em; color: #777; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Xác nhận đơn hàng của bạn</h1>
                        <p>Cảm ơn bạn đã đặt hàng tại cửa hàng của chúng tôi!</p>
                    </div>

                    <div class="order-details">
                        <h2>Thông tin đơn hàng #' . htmlspecialchars($order->id) . '</h2>
                        <p><strong>Ngày đặt hàng:</strong> ' . htmlspecialchars($order->created_at->format('d/m/Y H:i:s')) . '</p>
                        <p><strong>Trạng thái:</strong> ' . htmlspecialchars($order->status) . '</p>
                        <p><strong>Phương thức thanh toán:</strong> ' . htmlspecialchars($order->payment_method) . '</p>
                    </div>

                    <div class="shipping-info">
                        <h2>Thông tin giao hàng</h2>
                        <p><strong>Người nhận:</strong> ' . htmlspecialchars($order->recipient_name) . '</p>
                        <p><strong>Điện thoại:</strong> ' . htmlspecialchars($order->recipient_phone) . '</p>
                        <p><strong>Địa chỉ:</strong> ' . htmlspecialchars($order->recipient_address) . ', ' . htmlspecialchars($order->ward) . ', ' . htmlspecialchars($order->district) . ', ' . htmlspecialchars($order->province) . '</p>
                        <p><strong>Phí vận chuyển:</strong> ' . number_format($order->shipping_fee) . ' VND</p>
                    </div>

                    <h2>Chi tiết sản phẩm</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Sản phẩm</th>
                                <th>Giá</th>
                                <th>Số lượng</th>
                                <th>Tổng</th>
                            </tr>
                        </thead>
                        <tbody>
                            ' . $itemsHtml . '
                        </tbody>
                    </table>

                    <div class="total-section">
                        <p>Tổng tiền sản phẩm: ' . number_format($subtotalBeforeProductDiscount) . ' VND</p>
                        <p>Giảm giá sản phẩm: ' . number_format($order->discount_on_products) . ' VND</p>
                        <p>Giảm giá vận chuyển: ' . number_format($order->discount_on_shipping) . ' VND</p>
                        <p>Phí vận chuyển: ' . number_format($order->shipping_fee) . ' VND</p>
                        <p>Tổng cộng: <span style="color: #d9534f;">' . number_format($order->total_price) . ' VND</span></p>
                    </div>

                    <div class="footer">
                        <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
                        <p>&copy; ' . date('Y') . ' Thế giới di động. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        ';

        return $emailHtml;
    }

    /**
     * Create a Mime message string for sending via Gmail API.
     *
     * @param string $senderEmail Sender's email address.
     * @param string $recipientEmail Recipient's email address.
     * @param string $subject Email subject.
     * @param string $messageBody Email body (HTML or plain text).
     * @return string Raw MIME message.
     */
    protected function createMessage($senderEmail, $recipientEmail, $subject, $messageBody)
    {
        $str = "From: " . $senderEmail . "\r\n";
        $str .= "To: " . $recipientEmail . "\r\n";
        $str .= "Subject: =?utf-8?B?" . base64_encode($subject) . "?=\r\n"; // Mã hóa chủ đề để hỗ trợ UTF-8
        $str .= "MIME-Version: 1.0\r\n";
        $str .= "Content-Type: text/html; charset=utf-8\r\n"; // Chỉ định nội dung là HTML và charset UTF-8
        $str .= "Content-Transfer-Encoding: quoted-printable\r\n\r\n"; // Sử dụng quoted-printable cho nội dung HTML
        $str .= quoted_printable_encode($messageBody); // Mã hóa nội dung HTML

        return $str;
    }
}
