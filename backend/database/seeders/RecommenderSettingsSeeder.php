<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RecommenderSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Xóa dữ liệu cũ nếu có để tránh trùng lặp khi chạy lại seeder
        DB::table('recommender_settings')->truncate(); 

        DB::table('recommender_settings')->insert([
            [
                'key' => 'TOP_K',
                'value' => '10',
                'data_type' => 'integer',
                'description' => 'Số lượng item tương đồng hàng đầu cần lưu trữ cho mỗi sản phẩm (cho item-item similarity).',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'TOP_N_RECOMMENDATIONS',
                'value' => '10',
                'data_type' => 'integer',
                'description' => 'Số lượng sản phẩm gợi ý hàng đầu sẽ hiển thị cho người dùng.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'COSINE_THRESHOLD',
                'value' => '0.1',
                'data_type' => 'float',
                'description' => 'Ngưỡng điểm tương đồng cosine tối thiểu để coi hai sản phẩm là tương tự.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'HYBRID_ALPHA',
                'value' => '0.5',
                'data_type' => 'float',
                'description' => 'Trọng số cho Collaborative Filtering trong hệ thống gợi ý lai (hybrid). Content-based sẽ là (1 - alpha).',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Bạn có thể thêm các tham số khác nếu muốn điều chỉnh sau này
            // Ví dụ: BATCH_SIZE
            [
                'key' => 'BATCH_SIZE',
                'value' => '500',
                'data_type' => 'integer',
                'description' => 'Kích thước batch khi xử lý dữ liệu để tính toán. ',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Thêm các tham số khác nếu bạn muốn điều chỉnh qua admin panel
            // Ví dụ: "product_blacklist" có thể là một kiểu dữ liệu JSON string nếu cần
            
            [
                'key' => 'PRODUCT_BLACKLIST',
                'value' => '[]', // JSON array of product IDs
                'data_type' => 'json',
                'description' => 'Danh sách các ID sản phẩm bị cấm hiển thị trong gợi ý.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            
        ]);
    }
}