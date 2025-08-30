<?php 

namespace App\Services;
use App\Models\UserRecommendation;
use Illuminate\Support\Collection;
use Illuminate\Database\Eloquent\Builder;
use App\Models\ItemSimilarity;
use App\Models\Product;
use App\Models\Variant;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth; // THÊM DÒNG NÀY
use Illuminate\Support\Facades\Log;

class RecommendationService{

    /**
     * Lấy danh sách sản phẩm gợi ý cho người dùng, sử dụng cache và SQL thuần để tối ưu hiệu suất.
     *
     * @param int|null $userId
     * @param int $limit
     * @return Collection
     */
    public function getRecommendations(?int $userId = null, int $limit = 10): Collection
    {
        // Nếu không có userId được truyền vào, thử lấy từ Auth
        if (is_null($userId) && Auth::check()) {
            $userId = Auth::id();
        }

        // Nếu vẫn không có userId, không có gì để gợi ý
        if (is_null($userId)) {
            return collect();
        }

        $cacheKey = "user_recommendations:{$userId}:limit:{$limit}";

        return Cache::remember($cacheKey, now()->addMinutes(60), function () use ($userId, $limit) {
            $recommendationsRaw = UserRecommendation::where('user_id', $userId)
                ->orderByDesc('score')
                ->limit($limit)
                ->get(['product_id', 'score']);

            if ($recommendationsRaw->isEmpty()) {
                return collect();
            }

            $productIds = $recommendationsRaw->pluck('product_id')->toArray();
            $scoreMap = $recommendationsRaw->keyBy('product_id')->map->score->toArray();

            // Sử dụng hàm helper chung để lấy và cấu trúc dữ liệu
            return $this->fetchAndStructureProducts($productIds, $scoreMap);
        });
    }

  /**
     * Lấy danh sách sản phẩm tương tự dựa trên slug của sản phẩm.
     *
     * @param string $productSlug
     * @param int $limit
     * @return Collection
     */
    public function getSimilarItemsByProductSlug(string $productSlug, int $limit = 10): Collection
    {
        $cacheKey = "similar_products:{$productSlug}:limit:{$limit}";

        return Cache::remember($cacheKey, now()->addMinutes(60), function () use ($productSlug, $limit) {
            $product = DB::table('products')->where('slug', $productSlug)->first(['id']);

            if (!$product) {
                // Ghi log cảnh báo nếu không tìm thấy slug sản phẩm
                Log::warning("Product with slug '{$productSlug}' not found for similar items recommendation.");
                return collect();
            }

            $productId = $product->id;

            // --- CẬP NHẬT: Truy vấn bảng 'item_similarity' để tìm các sản phẩm tương tự ---
            // Đã đổi tên bảng từ 'sim_id' sang 'item_similarity' theo Model bạn cung cấp
            $similarItemsRaw = DB::table('item_similarity') // Đảm bảo đúng tên bảng của bạn
                ->where(function ($query) use ($productId) {
                    $query->where('product_id_1', $productId)
                          ->orWhere('product_id_2', $productId);
                })
                // Loại trừ chính sản phẩm gốc khỏi danh sách kết quả một cách hiệu quả hơn
                ->where(function ($query) use ($productId) {
                    $query->where('product_id_1', '!=', $productId)
                          ->orWhere('product_id_2', '!=', $productId);
                })
                ->orderByDesc('score') // Sắp xếp theo điểm để lấy các sản phẩm tương tự nhất
                ->limit($limit * 2) // Lấy nhiều hơn limit để xử lý trùng lặp và loại bỏ sản phẩm gốc sau
                ->get(['product_id_1', 'product_id_2', 'score']); // Lấy cả hai ID để xác định sản phẩm tương tự và điểm

            if ($similarItemsRaw->isEmpty()) {
                // Ghi log nếu không tìm thấy mục tương tự trong bảng item_similarity
                Log::info("No similar items found in 'item_similarity' table for product ID: {$productId}.");
                return collect();
            }

            $similarProductIds = [];
            $scoreMap = [];

            foreach ($similarItemsRaw as $item) {
                // Xác định ID sản phẩm tương tự (cái không phải sản phẩm gốc)
                $similarProductId = ($item->product_id_1 == $productId) ? $item->product_id_2 : $item->product_id_1;

                // Chỉ thêm vào nếu nó hợp lệ, không phải sản phẩm gốc và chưa được thêm vào
                if ($similarProductId !== null && $similarProductId != $productId && !isset($scoreMap[$similarProductId])) {
                    $similarProductIds[] = (int) $similarProductId; // Chuyển đổi sang int
                    $scoreMap[$similarProductId] = (float) $item->score; // Chuyển đổi sang float
                }

                // Nếu đã đạt đến giới hạn mong muốn, dừng lại
                if (count($similarProductIds) >= $limit) {
                    break;
                }
            }

            // Ghi log các ID sản phẩm tương tự và điểm số đã tìm nạp
            Log::info("Similar product IDs for {$productSlug} (ID: {$productId}): ", $similarProductIds);
            Log::info("Score Map for similar products: ", $scoreMap);

            // Nếu không tìm thấy sản phẩm tương tự sau khi xử lý, trả về rỗng
            if (empty($similarProductIds)) {
                return collect();
            }

            // Gọi phương thức fetchAndStructureProducts trong cùng class này
            return $this->fetchAndStructureProducts($similarProductIds, $scoreMap);
        });
    }
     /**
     * Fetches and structures products, their variants, and specifications.
     * Includes score for each product from the scoreMap.
     *
     * @param array $productIds An array of product IDs to fetch.
     * @param array $scoreMap A map of product_id => score.
     * @return Collection A collection of structured product data, each including its score.
     */
    private function fetchAndStructureProducts(array $productIds, array $scoreMap): Collection
    {
        if (empty($productIds)) {
            return collect();
        }

        $placeholders = implode(',', array_fill(0, count($productIds), '?'));

        // 1. Lấy thông tin cơ bản của các sản phẩm (products, categories, brands, reviews)
        $productsSql = <<<SQL
SELECT
    p.id,
    p.name,
    p.slug,
    p.description,
    p.cat_id,
    c.name AS category_name,
    c.slug AS category_slug,
    c.id_parent AS category_parent_id, -- Thêm id_parent của category
    p.brand_id,
    b.name AS brand_name,
    b.slug AS brand_slug,
    p.is_featured,
    p.status,
    p.created_at AS product_created_at, -- Thêm created_at cho Product
    p.updated_at AS product_updated_at, -- Thêm updated_at cho Product
    COUNT(r.id) AS reviews_count,
    ROUND(AVG(r.rate), 2) AS reviews_avg_rate
FROM products p
LEFT JOIN categories c ON p.cat_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN reviews r ON p.id = r.product_id
WHERE p.id IN ({$placeholders})
GROUP BY
    p.id, p.name, p.slug, p.description, p.cat_id, c.name, c.slug, c.id_parent, -- Thêm c.id_parent vào GROUP BY
    p.brand_id, b.name, b.slug, p.is_featured, p.status, p.created_at, p.updated_at -- Thêm created_at/updated_at vào GROUP BY
ORDER BY FIELD(p.id, {$placeholders})
SQL;

        // Truyền $productIds 2 lần cho điều kiện IN và ORDER BY FIELD
        $productsRaw = DB::select($productsSql, array_merge($productIds, $productIds));

        // Debugging productsRaw
        // Log::info('Products Raw Data:', (array)$productsRaw);


        // 2. Lấy variants và specs chi tiết của các sản phẩm này
        $variantsSql = <<<SQL
SELECT
    v.id AS variant_id,
    v.product_id,
    v.sku,
    v.price,
    v.discount,
    v.stock,
    v.image AS image_path,
    v.profit_percent, -- Thêm profit_percent
    v.average_cost,   -- Thêm average_cost
    v.status,         -- Thêm status cho Variant
    v.created_at AS variant_created_at, -- Thêm created_at cho Variant
    v.updated_at AS variant_updated_at, -- Thêm updated_at cho Variant
    -- Tính toán available_stock
    v.stock - COALESCE(
        (SELECT SUM(rs.quantity) FROM reserved_stocks rs WHERE rs.variant_id = v.id AND rs.expires_at > NOW()), 0
    ) AS available_stock_for_sale, -- Đổi tên để khớp với frontend

    p.name AS product_name, -- product_name cho full_name

    -- Dữ liệu cho SpecValue
    vs.id AS spec_value_id,
    vs.spec_id,
    vs.value_text,
    vs.value_int,
    vs.value_decimal,
    vs.option_id,
    vs.created_at AS spec_value_created_at,
    vs.updated_at AS spec_value_updated_at,

    -- Dữ liệu cho Specification
    s.name AS specification_name,
    s.data_type,
    s.unit,
    s.description AS specification_description,
    s.created_at AS specification_created_at,
    s.updated_at AS specification_updated_at,

    -- Dữ liệu cho SpecOption
    so.value AS spec_option_value,
    so.created_at AS spec_option_created_at,
    so.updated_at AS spec_option_updated_at
FROM product_variants v
JOIN products p ON v.product_id = p.id
LEFT JOIN variant_spec_values vs ON vs.variant_id = v.id
LEFT JOIN specifications s ON vs.spec_id = s.id
LEFT JOIN spec_options so ON vs.option_id = so.id
WHERE v.product_id IN ({$placeholders})
ORDER BY v.product_id, v.id, s.name
SQL;
        $variantsRaw = DB::select($variantsSql, $productIds);

        // Debugging variantsRaw
        // Log::info('Variants Raw Data:', (array)$variantsRaw);


        // 3. Gom nhóm dữ liệu Products, Variants và Specs
        $products = [];
        foreach ($productsRaw as $prod) {
            $products[$prod->id] = [
                'id'            => (int) $prod->id,
                'name'          => $prod->name,
                'slug'          => $prod->slug,
                'description'   => $prod->description,
                'is_featured'   => (bool) $prod->is_featured,
                'status'        => (bool) $prod->status,
                'reviews_count' => (int) $prod->reviews_count,
                'reviews_avg_rate' => (float) $prod->reviews_avg_rate,
                'created_at'    => $prod->product_created_at, // Thêm created_at
                'updated_at'    => $prod->product_updated_at, // Thêm updated_at

                'brand'         => [
                    'id'   => (int) $prod->brand_id,
                    'name' => $prod->brand_name,
                    'slug' => $prod->brand_slug,
                ],
                'category'      => [
                    'id'        => (int) $prod->cat_id,
                    'name'      => $prod->category_name,
                    'slug'      => $prod->category_slug,
                    'id_parent' => $prod->category_parent_id, // Thêm id_parent
                ],
                'variants'      => [],
                'score'         => (float) ($scoreMap[$prod->id] ?? 0.0),
            ];
        }

        // Gom nhóm Variants và Specs thành cấu trúc variant_spec_values
        $variantsMap = [];
        foreach ($variantsRaw as $r) {
            $variantId = $r->variant_id;
            if (!isset($variantsMap[$variantId])) {
                $variantsMap[$variantId] = [
                    'id'                        => (int) $r->variant_id,
                    'product_id'                => (int) $r->product_id,
                    'sku'                       => $r->sku,
                    'price'                     => (float) $r->price,
                    'discount'                  => (float) $r->discount,
                    'stock'                     => (int) $r->stock,
                    'available_stock_for_sale'  => (int) $r->available_stock_for_sale, // Đổi tên
                    'image_url'                 => $r->image_path ? asset('storage/' . $r->image_path) : null,
                    'profit_percent'            => (float) ($r->profit_percent ?? 0.0), // Cast và mặc định
                    'average_cost'              => (float) ($r->average_cost ?? 0.0), // Cast và mặc định
                    'status'                    => (bool) $r->status, // Cast
                    'created_at'                => $r->variant_created_at, // Thêm created_at
                    'updated_at'                => $r->variant_updated_at, // Thêm updated_at
                    'product_name'              => $r->product_name, // Dùng tạm để tạo full_name
                    'variant_spec_values'       => [], // Khởi tạo mảng cho spec values mới
                    // 'product' => null, // Sẽ được gắn sau, không cần thiết ở đây
                    // 'variant_from_suppliers' => [], // Giả định không có trong truy vấn này
                    // 'selected_supplier_id' => null,
                    // 'selected_supplier_price' => null,
                ];
            }

            // Thêm SpecValue vào variant_spec_values nếu có dữ liệu spec
            if ($r->spec_value_id !== null) {
                $specValue = [
                    'id'            => (int) $r->spec_value_id,
                    'variant_id'    => (int) $r->variant_id,
                    'spec_id'       => (int) $r->spec_id,
                    'value_text'    => $r->value_text,
                    'value_int'     => $r->value_int !== null ? (int)$r->value_int : null,
                    'value_decimal' => $r->value_decimal !== null ? (float)$r->value_decimal : null,
                    'option_id'     => $r->option_id !== null ? (int)$r->option_id : null,
                    'created_at'    => $r->spec_value_created_at,
                    'updated_at'    => $r->spec_value_updated_at,
                    'specification' => [
                        'id'            => (int) $r->spec_id,
                        'category_id'   => null, // Specification category_id not in this query, add if needed
                        'name'          => $r->specification_name,
                        'data_type'     => $r->data_type,
                        'unit'          => $r->unit,
                        'description'   => $r->specification_description,
                        'created_at'    => $r->specification_created_at,
                        'updated_at'    => $r->specification_updated_at,
                    ],
                    'spec_options'  => null,
                ];

                if ($r->option_id !== null) {
                    $specValue['spec_options'] = [
                        'id'            => (int) $r->option_id,
                        'spec_id'       => (int) $r->spec_id,
                        'value'         => $r->spec_option_value,
                        'created_at'    => $r->spec_option_created_at,
                        'updated_at'    => $r->spec_option_updated_at,
                    ];
                }
                $variantsMap[$variantId]['variant_spec_values'][] = $specValue;
            }
        }

        // Debugging variantsMap after grouping
        // Log::info('Variants Map after initial grouping:', $variantsMap);


        // 4. Tính toán full_name cho từng variant và gắn vào product
        foreach ($variantsMap as $variantId => &$variantData) { // Sử dụng & để sửa đổi trực tiếp
            $baseName = $variantData['product_name'];
            $specValuesParts = collect($variantData['variant_spec_values'])
                ->filter(function ($specValue) {
                    $specName = $specValue['specification']['name'] ?? '';
                    return in_array($specName, ['Màu sắc', 'RAM', 'Dung lượng bộ nhớ']);
                })
                ->sortBy(function ($specValue) {
                    $specName = $specValue['specification']['name'] ?? '';
                    $order = ['Màu sắc' => 1, 'RAM' => 2, 'Dung lượng bộ nhớ' => 3];
                    return $order[$specName] ?? 99;
                })
                ->map(function ($specValue) {
                    $value = null;
                    switch ($specValue['specification']['data_type']) {
                        case 'int':
                            $value = $specValue['value_int'];
                            break;
                        case 'decimal':
                            $value = $specValue['value_decimal'];
                            break;
                        case 'text':
                            $value = $specValue['value_text'];
                            break;
                        case 'option':
                            $value = $specValue['spec_options']['value'] ?? null;
                            break;
                    }

                    if ($value === null) return null; // Bỏ qua giá trị null

                    // Thêm đơn vị 'GB' cho RAM/Dung lượng bộ nhớ nếu giá trị là số
                    if (($specValue['specification']['name'] === 'RAM' || $specValue['specification']['name'] === 'Dung lượng bộ nhớ') && is_numeric($value)) {
                        return $value . ' GB';
                    }
                    return $value;
                })
                ->filter() // Lọc bỏ các giá trị null/empty sau map
                ->implode(' - ');

            $variantData['full_name'] = $baseName . ($specValuesParts ? ' - ' . $specValuesParts : '');
            unset($variantData['product_name']); // Xóa product_name sau khi đã tạo full_name

            // Gắn variant vào sản phẩm tương ứng
            if (isset($products[$variantData['product_id']])) {
                $products[$variantData['product_id']]['variants'][] = $variantData;
            }
        }
        unset($variantData); // Unset the reference to avoid unexpected behavior


        // Debugging products after variants attached
        // Log::info('Products after variants attached:', $products);


        // 5. Final structuring: Chuyển đổi mảng products thành Collection và thêm score ở cấp độ root
        // và sắp xếp theo score
        $finalCollection = collect(array_values($products))->map(function ($productData) {
            return [
                'product' => $productData,
                'score'   => $productData['score'], // Score được lấy từ productData
            ];
        })
        ->sortByDesc('score') // Sắp xếp theo score ở cấp độ root
        ->values(); // Đảm bảo các khóa là số nguyên tuần tự

        // Debugging finalCollection
        // Log::info('Final Structured Collection with Scores:', $finalCollection->toArray());


        return $finalCollection;
    }
   

    

    
   

}