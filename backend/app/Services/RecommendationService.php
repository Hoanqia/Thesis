<?php 

namespace App\Services;
use App\Models\UserRecommendation;
use Illuminate\Support\Collection;
use Illuminate\Database\Eloquent\Builder;
use App\Models\ItemSimilarity;
use App\Models\Product;
use App\Models\Variant;
class RecommendationService{
  public function getRecommendations(int $userId, int $limit = 10): Collection{
    return UserRecommendation::where('user_id', $userId)
        ->with([
            'product', 
            'product.variants.variantSpecValues.specification',
            'product.variants.variantSpecValues.spec_options'
        ])
        ->orderByDesc('score')
        ->limit($limit)
        ->get()
        ->filter(fn($rec) => $rec->product !== null)
        ->map(function (UserRecommendation $rec) {
            $product = $rec->product;
            return [
                'product' => [
                    'id'          => $product->id,
                    'name'        => $product->name,
                    'slug'        => $product->slug,
                    'description' => $product->description,
                    'cat_id'      => $product->cat_id,
                    'categorySlug' => $product->category->slug,
                    'brand_id'    => $product->brand_id,
                    'is_featured' => $product->is_featured,
                    'status' => $product->status,
                ],
                'variants' => $product->variants->map(function ($variant) {
                    return [
                        'id'          => $variant->id,
                        'price'       => $variant->price,
                        'discount'    => $variant->discount,
                        'image'       => $variant->image,
                        'specs'       => $variant->variantSpecValues->map(function ($sv) {
                            return [
                                'specification' => [
                                    'name'      => $sv->specification->name,
                                    'data_type' => $sv->specification->data_type,
                                    'unit'      => $sv->specification->unit,
                                ],
                                'value_int'     => $sv->value_int,
                                'value_decimal' => $sv->value_decimal,
                                'value_text'    => $sv->value_text,
                                'option'        => optional($sv->spec_options)->value,
                            ];
                        }),
                    ];
                }),
                'score' => (float) $rec->score,
            ];
        });
    }
  /**
     * Lấy danh sách các sản phẩm tương đồng với một sản phẩm cụ thể,
     * trả về dữ liệu được định dạng sẵn sàng cho frontend productCard.
     *
     * @param int $productId ID của sản phẩm gốc.
     * @param int $limit Số lượng sản phẩm tương đồng tối đa muốn lấy.
     * @return Collection Một Collection chứa các mảng dữ liệu sản phẩm tương đồng.
     */
    public function get_similar_items_for_product(int $productId, int $limit = 10): Collection
    {
        // 1. Tìm các sản phẩm tương đồng từ bảng item_similarity
        $similarities = ItemSimilarity::where(function ($query) use ($productId) {
                $query->where('product_id_1', $productId)
                      ->orWhere('product_id_2', $productId);
            })
            ->orderByDesc('score')
            ->limit($limit + 5) // Lấy nhiều hơn một chút để đảm bảo đủ sau khi lọc
            ->get();
        // dd($similarities->toArray());
        // 2. Trích xuất các ID sản phẩm tương đồng và điểm số, loại bỏ sản phẩm gốc
        $similarProductIdsWithScores = [];
        foreach ($similarities as $sim) {
            $currentSimilarProductId = ($sim->product_id_1 == $productId) ? $sim->product_id_2 : $sim->product_id_1;

            if ($currentSimilarProductId !== $productId) {
                // Sử dụng max để lấy điểm số cao nhất nếu có nhiều bản ghi cho cùng một cặp sản phẩm (product_id_1, product_id_2)
                $similarProductIdsWithScores[$currentSimilarProductId] = max(
                    $similarProductIdsWithScores[$currentSimilarProductId] ?? 0,
                    $sim->score
                );
            }
        }
        // 3. Sắp xếp các sản phẩm tương đồng theo điểm số và lấy top-$limit
        arsort($similarProductIdsWithScores); // Sắp xếp giảm dần theo giá trị (score)
        $slicedArray = array_slice($similarProductIdsWithScores, 0, $limit,true);
        $topSimilarIds = array_keys($slicedArray); 
        // Nếu không có sản phẩm tương đồng nào, trả về collection rỗng
        if (empty($topSimilarIds)) {
            return collect();
        }

        // 4. Lấy thông tin chi tiết của các sản phẩm tương đồng với eager loading
        $similarProducts = Product::whereIn('id', $topSimilarIds)
            ->with([
                'variants.variantSpecValues.specification',
                'variants.variantSpecValues.spec_options',
                'category', // Đảm bảo mối quan hệ category được tải
                'brand'     // Đảm bảo mối quan hệ brand được tải (nếu cần)
            ])
            ->get();

        // 5. Định dạng lại dữ liệu theo cấu trúc mong muốn và đảm bảo thứ tự
        $formattedProducts = collect($topSimilarIds)->map(function ($id) use ($similarProducts) {
            $product = $similarProducts->firstWhere('id', $id);
            if (!$product) {
                return null; // Sản phẩm không tìm thấy (có thể đã bị xóa)
            }

            return [
                'product' => [
                    'id'          => $product->id,
                    'name'        => $product->name,
                    'slug'        => $product->slug,
                    'description' => $product->description,
                    'cat_id'      => $product->cat_id,
                    'categorySlug' => optional($product->category)->slug,
                    'brand_id'    => $product->brand_id,
                    'is_featured' => $product->is_featured,
                    'status'      => $product->status,
                ],
                'variants' => $product->variants->map(function ($variant) {
                    return [
                        'id'          => $variant->id,
                        'price'       => $variant->price,
                        'discount'    => $variant->discount,
                        'image'       => $variant->image,
                        'specs'       => $variant->variantSpecValues->map(function ($sv) {
                            return [
                                'specification' => [
                                    'name'      => optional($sv->specification)->name,
                                    'data_type' => optional($sv->specification)->data_type,
                                    'unit'      => optional($sv->specification)->unit,
                                ],
                                'value_int'     => $sv->value_int,
                                'value_decimal' => $sv->value_decimal,
                                'value_text'    => $sv->value_text,
                                'option'        => optional($sv->spec_options)->value,
                            ];
                        }),
                    ];
                }),
                // Nếu bạn muốn trả về điểm số tương đồng, bạn có thể thêm nó ở đây.
                // 'score' => (float) $similarProductIdsWithScores[$id] ?? 0,
            ];
        })->filter()->values();

        return $formattedProducts;
    }
}