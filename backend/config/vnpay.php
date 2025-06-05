<?php
// config/vnpay.php

return [
    // Mã Terminal của merchant do VNPay cấp
    'tmn_code'    => env('VNP_TMN_CODE'),

    // Secret key của merchant
    'hash_secret' => env('VNP_HASH_SECRET'),

    // URL cổng sandbox (hoặc production khi deploy thật)
    'url'         => env('VNP_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),

    // URL callback trả về khi thanh toán xong (frontend Next.js)
    'return_url'  => env('VNP_RETURN_URL'),

    // URL IPN (nếu cần)
    'ipn_url'     => env('VNP_IPN_URL'),
];
