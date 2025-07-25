<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI')
    ],
     // Cấu hình riêng cho Google Mailer (Web client 2)
    'google_mailer' => [ // Đặt tên khác để phân biệt với 'google'
        'client_id' => env('GOOGLE_MAILER_CLIENT_ID'),
        'client_secret' => env('GOOGLE_MAILER_CLIENT_SECRET'),
        // Không cần 'redirect' ở đây vì nó chỉ dùng trong Job/Route tạm thời để lấy refresh token
        // nhưng nếu bạn muốn giữ cho nhất quán, bạn có thể thêm:
        // 'redirect' => env('GOOGLE_MAILER_REDIRECT_URI'),
    ],

];
