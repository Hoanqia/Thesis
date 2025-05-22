<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Đây là cấu hình CORS cho Laravel 11. Bạn có thể điều chỉnh
    | các tuỳ chọn bên dưới cho phù hợp với frontend của bạn.
    |
    */

    // Áp dụng CORS cho các đường dẫn API
    'paths' => ['api/*', 'oauth/*'],

    // Cho phép tất cả các method HTTP
    'allowed_methods' => ['*'],

    // Cho phép tất cả các origin, hoặc thay '*' bằng danh sách domain frontend
    'allowed_origins' => [
        'http://localhost:3000',
        'https://your-frontend-domain.com',
    ],

    // Patterns cho origin, nếu cần
    'allowed_origins_patterns' => [],

    // Cho phép tất cả các header
    'allowed_headers' => ['*'],

    // Các header được expose cho client (nếu cần)
    'exposed_headers' => [],

    // Thời gian cache preflight (giây)
    'max_age' => 0,

    // Cho phép cookies, authorization headers (nếu dùng Sanctum hoặc cookie-based auth)
    'supports_credentials' => true,

];
