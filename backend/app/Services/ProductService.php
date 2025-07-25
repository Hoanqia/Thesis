<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Variant;
use App\Models\Category;
use App\Services\SlugService;
use Illuminate\Support\Facades\Validator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;
class ProductService
{   
    //   public function searchProducts(string $query, int $limit = 10)
    // {
    //     $validator = Validator::make([
    //         'query' => $query,
    //         'limit' => $limit,
    //     ], [
    //         'query' => 'required|string|max:255',
    //         'limit' => 'nullable|integer|min:1|max:50',
    //     ]);

    //     if ($validator->fails()) {
    //         throw new ValidationException($validator);
    //     }

    //     $products = Product::query()
    //         ->where('name', 'like', '%' . $query . '%')
    //         ->orWhereHas('variants', function (Builder $variantQuery) use ($query) {
    //             $variantQuery->whereHas('variantSpecValues', function (Builder $specValueQuery) use ($query) {
    //                 $specValueQuery->where('value_text', 'like', '%' . $query . '%')
    //                                ->orWhere('value_int', 'like', '%' . $query . '%');
    //             });
    //         })
    //         ->limit($limit)
    //         ->get();

    //     return $products->map(function ($product) use ($query) {
    //         // Ensure $product is a valid object before proceeding
    //         if (!$product || !($product instanceof Product)) {
    //             return null; // Skip invalid product entries
    //         }

    //         // Lấy ra các variant có liên quan đến query
    //         $matchingVariants = $product->variants->filter(function ($variant) use ($query, $product) { // Added $product to use for clarity if needed, but not strictly for the error
    //             // Ensure $variant is a valid object before proceeding
    //             if (!$variant || !($variant instanceof Variant)) {
    //                 return false; // This variant is invalid, don't match
    //             }

    //             // Kiểm tra tên product hoặc spec values của variant
    //             $matchesProductName = str_contains(strtolower($product->name), strtolower($query)); // This line uses $product->name

    //             // This is the line usually reported as 47/48
    //             $matchesVariantSpec = $variant->variantSpecValues->contains(function ($specValue) use ($query) {
    //                 // Ensure $specValue is a valid object before proceeding
    //                 if (!$specValue) {
    //                     return false; // This specValue is invalid, don't match
    //                 }
    //                 return (isset($specValue->value_text) && str_contains(strtolower($specValue->value_text), strtolower($query))) ||
    //                        (isset($specValue->value_int) && str_contains(strtolower($specValue->value_int), strtolower($query)));
    //             });

    //             return $matchesProductName || $matchesVariantSpec;
    //         });

    //         if ($matchingVariants->isEmpty() && str_contains(strtolower($product->name), strtolower($query))) {
    //             return $product;
    //         } elseif ($matchingVariants->isNotEmpty()) {
    //             return $product;
    //         }
    //         return null;
    //     })->filter()->unique('id');
    // }



    //    public function searchProducts(string $query, int $limit = 10)
    // {
    //     $validator = Validator::make([
    //         'query' => $query,
    //         'limit' => $limit,
    //     ], [
    //         'query' => 'required|string|max:255',
    //         'limit' => 'nullable|integer|min:1|max:50',
    //     ]);

    //     if ($validator->fails()) {
    //         throw new ValidationException($validator);
    //     }

    //     $lowerCaseQuery = strtolower($query);

    //     $products = Product::query()
    //         ->where('name', 'like', '%' . $lowerCaseQuery . '%')
    //         ->orWhereHas('variants', function (Builder $variantQuery) use ($lowerCaseQuery) {
    //             // Điều kiện tổng hợp cho tất cả các tìm kiếm liên quan đến variantSpecValues
    //             $variantQuery->whereHas('variantSpecValues', function (Builder $specValueQuery) use ($lowerCaseQuery) {
    //                 $specValueQuery->where(function ($q) use ($lowerCaseQuery) {
    //                     // --- Logic tìm kiếm cho RAM và Dung lượng bộ nhớ (value_text / value_int) ---
    //                     $q->orWhere(function ($subQ) use ($lowerCaseQuery) {
    //                         $subQ->whereHas('specification', function ($spec) {
    //                             $spec->whereIn('name', ['RAM', 'Dung lượng bộ nhớ']);
    //                         })
    //                         ->where(function ($valueQuery) use ($lowerCaseQuery) {
    //                             $valueQuery->where('value_text', 'like', '%' . $lowerCaseQuery . '%')
    //                                        ->orWhere('value_int', 'like', '%' . $lowerCaseQuery . '%');
    //                         });
    //                     });

    //                     // --- Logic tìm kiếm cho Màu sắc (trong spec_options.value) ---
    //                     $q->orWhere(function ($subQ) use ($lowerCaseQuery) {
    //                         $subQ->whereHas('specification', function ($spec) {
    //                             $spec->where('name', 'Màu sắc'); // Lọc spec là "Màu sắc"
    //                         })
    //                         ->whereHas('spec_options', function ($specOption) use ($lowerCaseQuery) {
    //                             $specOption->where('value', 'like', '%' . $lowerCaseQuery . '%'); // Tìm trong cột `value` của `spec_options`
    //                         });
    //                     });
    //                 });
    //             });
    //         })
    //         ->limit($limit)
    //         ->get();

    //     return $products->map(function ($product) use ($lowerCaseQuery) {
    //         if (!$product || !($product instanceof Product)) {
    //             return null;
    //         }

    //         $matchingVariants = $product->variants->filter(function ($variant) use ($lowerCaseQuery, $product) {
    //             if (!$variant || !($variant instanceof Variant)) {
    //                 return false;
    //             }

    //             $matchesProductName = str_contains(strtolower($product->name), $lowerCaseQuery);

    //             // Kiểm tra các đặc điểm (RAM, Dung lượng, Màu sắc)
    //             $matchesVariantSpec = $variant->variantSpecValues->contains(function ($specValue) use ($lowerCaseQuery) {
    //                 if (!$specValue || !$specValue->specification) {
    //                     return false;
    //                 }

    //                 $specName = $specValue->specification->name;

    //                 // Logic cho RAM và Dung lượng bộ nhớ
    //                 $isRamOrStorage = in_array($specName, ['RAM', 'Dung lượng bộ nhớ']);
    //                 if ($isRamOrStorage) {
    //                     return (isset($specValue->value_text) && str_contains(strtolower($specValue->value_text), $lowerCaseQuery)) ||
    //                            (isset($specValue->value_int) && str_contains(strtolower($specValue->value_int), $lowerCaseQuery));
    //                 }

    //                 // Logic cho Màu sắc
    //                 $isColor = ($specName === 'Màu sắc');
    //                 if ($isColor) {
    //                     if ($specValue->spec_options && isset($specValue->spec_options->value)) {
    //                         return str_contains(strtolower($specValue->spec_options->value), $lowerCaseQuery);
    //                     }
    //                 }
    //                 return false; // Không khớp nếu không phải spec mong muốn hoặc không có giá trị
    //             });

    //             // Kết hợp các điều kiện khớp: tên sản phẩm HOẶC bất kỳ spec (RAM, dung lượng, màu) nào khớp
    //             return $matchesProductName || $matchesVariantSpec;
    //         });

    //         if ($matchingVariants->isEmpty() && str_contains(strtolower($product->name), $lowerCaseQuery)) {
    //             return $product;
    //         } elseif ($matchingVariants->isNotEmpty()) {
    //             return $product;
    //         }
    //         return null;
    //     })->filter()->unique('id');
    // }


     public function searchProducts(string $query, int $limit = 10)
    {
        $validator = Validator::make([
            'query' => $query,
            'limit' => $limit,
        ], [
            'query' => 'required|string|max:255',
            'limit' => 'nullable|integer|min:1|max:50',
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $lowerCaseQuery = strtolower($query);

        $products = Product::query()
            ->leftJoin('categories', 'products.cat_id', '=', 'categories.id')
                        ->select('products.*', 'categories.slug as categorySlug')

            // Tìm theo tên sản phẩm
            ->where('products.name', 'like', '%' . $lowerCaseQuery . '%')
            ->orWhere('categories.name','like','%'. $lowerCaseQuery. '%')
            // HOẶC tìm theo các thuộc tính của variants
            ->orWhereHas('variants', function (Builder $variantQuery) use ($lowerCaseQuery) {
                // Điều kiện tổng hợp cho tất cả các tìm kiếm liên quan đến variantSpecValues
                $variantQuery->whereHas('variantSpecValues', function (Builder $specValueQuery) use ($lowerCaseQuery) {
                    $specValueQuery->where(function ($q) use ($lowerCaseQuery) {
                        // --- Logic tìm kiếm cho RAM và Dung lượng bộ nhớ (value_text / value_int) ---
                        $q->orWhere(function ($subQ) use ($lowerCaseQuery) {
                            $subQ->whereHas('specification', function ($spec) {
                                $spec->whereIn('name', ['RAM', 'Dung lượng bộ nhớ']);
                            })
                            ->where(function ($valueQuery) use ($lowerCaseQuery) {
                                $valueQuery->where('value_text', 'like', '%' . $lowerCaseQuery . '%')
                                           ->orWhere('value_int', 'like', '%' . $lowerCaseQuery . '%');
                            });
                        });

                        // --- Logic tìm kiếm cho Màu sắc (trong spec_options.value) ---
                        $q->orWhere(function ($subQ) use ($lowerCaseQuery) {
                            $subQ->whereHas('specification', function ($spec) {
                                $spec->where('name', 'Màu sắc');
                            })
                            ->whereHas('spec_options', function ($specOption) use ($lowerCaseQuery) {
                                $specOption->where('value', 'like', '%' . $lowerCaseQuery . '%');
                            });
                        });
                    });
                });
            })
            // Không eager load bất kỳ mối quan hệ nào
            ->limit($limit)
            ->get();

        // Chỉ trả về các đối tượng Product duy nhất
        // Không sử dụng map/filter để tránh lazy loading variants
        return $products->unique('id');
    }
    
    /**
     * Lấy gợi ý cho thanh tìm kiếm.
     * Có thể bao gồm gợi ý từ tên sản phẩm và các giá trị đặc điểm.
     *
     * @param string $query Chuỗi tìm kiếm của người dùng
     * @param int $limit Số lượng gợi ý trả về tối đa
     * @return array
     */
    public function getSearchSuggestions(string $query, int $limit = 5): array
    {
        $suggestions = [];
        $lowerCaseQuery = strtolower($query);

        // 1. Gợi ý từ tên sản phẩm
        $productNameSuggestions = Product::query()
            ->where('name', 'like', '%' . $lowerCaseQuery . '%')
            ->distinct() // Đảm bảo tên sản phẩm là duy nhất
            ->limit($limit)
            ->pluck('name')
            ->toArray();

        $suggestions = array_merge($suggestions, $productNameSuggestions);

        // 2. Gợi ý từ tên danh mục
        $categoryNameSuggestions = Category::query() // Sử dụng Model Category
            ->where('name', 'like', '%' . $lowerCaseQuery . '%')
            ->distinct() // Đảm bảo tên danh mục là duy nhất
            ->limit($limit)
            ->pluck('name')
            ->toArray();

        $suggestions = array_merge($suggestions, $categoryNameSuggestions);

        // 3. Gợi ý từ các giá trị thuộc tính (RAM, Dung lượng bộ nhớ, Màu sắc)
        $specValueSuggestions = DB::table('variant_spec_values')
            ->join('specifications', 'variant_spec_values.spec_id', '=', 'specifications.id')
            ->leftJoin('spec_options', 'variant_spec_values.option_id', '=', 'spec_options.id')
            ->whereIn('specifications.name', ['RAM', 'Dung lượng bộ nhớ', 'Màu sắc']) // Chỉ tìm trong 3 thuộc tính này
            ->where(function ($q) use ($lowerCaseQuery) {
                // Tìm kiếm trong value_text
                $q->where('variant_spec_values.value_text', 'like', '%' . $lowerCaseQuery . '%');

                // Tìm kiếm trong value_int (chuyển sang string để tìm kiếm)
                $q->orWhere(DB::raw('CAST(variant_spec_values.value_int AS CHAR)'), 'like', '%' . $lowerCaseQuery . '%');

                // Tìm kiếm trong value của spec_options (cho Màu sắc)
                $q->orWhere('spec_options.value', 'like', '%' . $lowerCaseQuery . '%');
            })
            ->select(
                'specifications.name as spec_name',
                'spec_options.value as option_value',
                'variant_spec_values.value_int as int_value',
                'variant_spec_values.value_decimal as decimal_value',
                'variant_spec_values.value_text as text_value',
                'specifications.unit'
            )
            ->distinct() // Đảm bảo các gợi ý là duy nhất
            ->limit($limit * 2) // Lấy nhiều hơn để có thể lọc và giới hạn sau
            ->get();

        foreach ($specValueSuggestions as $suggestion) {
            $displayValue = null;
            if ($suggestion->option_value) {
                $displayValue = $suggestion->option_value;
            } elseif ($suggestion->int_value !== null) {
                $displayValue = $suggestion->int_value;
                // Thêm đơn vị cho RAM/Dung lượng nếu có
                if (in_array($suggestion->spec_name, ['RAM', 'Dung lượng bộ nhớ'])) {
                    $displayValue .= ($suggestion->unit ? ' ' . $suggestion->unit : ' GB'); // Mặc định GB nếu unit rỗng
                }
            } elseif ($suggestion->decimal_value !== null) {
                $displayValue = $suggestion->decimal_value;
                if (in_array($suggestion->spec_name, ['RAM', 'Dung lượng bộ nhớ'])) {
                    $displayValue .= ($suggestion->unit ? ' ' . $suggestion->unit : ' GB');
                }
            } elseif ($suggestion->text_value) {
                $displayValue = $suggestion->text_value;
            }

            if ($displayValue) {
                // Tạo gợi ý có ý nghĩa hơn: "Tên thuộc tính: Giá trị"
                // Đối với "Màu sắc", chỉ hiển thị màu (ví dụ: "Đỏ")
                // Đối với "RAM", "Dung lượng bộ nhớ", hiển thị "RAM 8GB" hoặc "Dung lượng bộ nhớ 256GB"
                if ($suggestion->spec_name === 'Màu sắc') {
                    $formattedSuggestion = $displayValue;
                } else {
                    $formattedSuggestion = trim($suggestion->spec_name . ' ' . $displayValue);
                }
                $suggestions[] = $formattedSuggestion;
            }
        }

        // Đảm bảo các gợi ý là duy nhất và giới hạn số lượng tổng thể cuối cùng
        $suggestions = array_values(array_unique($suggestions));
        return array_slice($suggestions, 0, $limit);
    }




    public function create(array $data)
    {
        $validated = Validator::make($data, [
            'name' => 'required|string',
            'description' => 'nullable|string',
            'cat_id' => 'required|exists:categories,id',
            'brand_id' => 'required|exists:brands,id',
            'is_featured' => 'nullable|boolean',
            'status' => 'nullable|boolean',
        ])->validate();

        $validated['slug'] = SlugService::createSlug($validated['name'], Product::class);
        $validated['is_featured'] = $data['is_featured'] ?? false;
        $validated['status'] = $data['status'] ?? true;
        
        return Product::create($validated);
    }

    public function getAll()
    {
        return Product::with(['brand', 'category'])->get();
    }
    // public function getProductsByCatId($catId){
    //             return Product::with([
    //                 'brand',
    //                 'category',
    //                 'variants.variantSpecValues.specification',
    //                 'variants.variantSpecValues.spec_options',
    //             ])
    //             ->where('cat_id', $catId)
    //             ->get();    }

   public function getBySlug(string $slug): ?object
    {
        $sql = <<<'SQL'
SELECT
    p.id,
    MIN(p.name)        AS name,
    MIN(p.slug)        AS slug,
    MIN(p.description) AS description,
    MIN(p.cat_id)      AS cat_id,

    MIN(c.name)        AS category_name,
    MIN(c.slug)        AS categorySlug,

    MIN(p.brand_id)    AS brand_id,
    MIN(b.name)        AS brand_name,
    MIN(b.slug)        AS brand_slug,

    MIN(p.is_featured) AS is_featured,
    MIN(p.status)      AS status,

    COUNT(r.id)              AS reviews_count,
    ROUND(AVG(r.rate), 2)    AS reviews_avg_rate

FROM products p
LEFT JOIN categories       c ON p.cat_id   = c.id
LEFT JOIN brands           b ON p.brand_id = b.id
LEFT JOIN reviews          r ON p.id       = r.product_id
WHERE p.slug = ? -- Thay đổi điều kiện WHERE từ cat_id sang slug
GROUP BY p.id
SQL;

        // Lấy thông tin sản phẩm cơ bản dựa trên slug
        $product = DB::selectOne($sql, [$slug]); // Sử dụng selectOne vì chỉ lấy 1 sản phẩm

        if (empty($product)) {
            return null; // Trả về null nếu không tìm thấy sản phẩm
        }

        // Lấy variants + specs (thêm product_name vào đây để tạo full_name)
        $productId = $product->id;
        // Vì chỉ có 1 sản phẩm, không cần tạo placeholders, chỉ truyền trực tiếp ID
        $variantsRaw = DB::select(<<<"SQL"
SELECT
    v.id,
    v.product_id,
    v.sku,
    v.price,
    v.discount,
    v.stock,
    v.stock - IFNULL((
        SELECT SUM(rs.quantity)
        FROM reserved_stocks rs
        WHERE rs.variant_id = v.id
          AND rs.expires_at > NOW()
    ), 0) AS available_stock,
    v.image         AS image_path,
    p.name          AS product_name, -- Thêm product_name từ bảng products
    s.name          AS spec_name,
    COALESCE(so.value, vs.value_text, vs.value_int, vs.value_decimal) AS spec_value
FROM product_variants v
JOIN products p ON v.product_id = p.id
LEFT JOIN variant_spec_values vs ON vs.variant_id = v.id
LEFT JOIN specifications    s  ON vs.spec_id      = s.id
LEFT JOIN spec_options      so ON vs.option_id    = so.id
WHERE v.product_id = ? -- Điều kiện WHERE cho 1 product_id cụ thể
ORDER BY v.id, s.name
SQL
        , [$productId]); // Truyền $productId vào đây

        // Gom nhóm specs → variants và tính toán full_name
        $variantsMap = [];
        foreach ($variantsRaw as $r) {
            if (!isset($variantsMap[$r->id])) {
                $variantsMap[$r->id] = [
                    'id'                => $r->id,
                    'product_id'        => $r->product_id,
                    'sku'               => $r->sku,
                    'price'             => $r->price,
                    'discount'          => $r->discount,
                    'stock'             => $r->stock,
                    'available_stock'   => $r->available_stock,
                    'image_url'         => asset('storage/') . '/' . $r->image_path,
                    'product_name'      => $r->product_name,
                    'specs'             => [],
                ];
            }
            $variantsMap[$r->id]['specs'][] = [
                'spec_name' => $r->spec_name,
                'value'     => $r->spec_value,
            ];
        }

        // Sau khi gom nhóm, tính full_name cho từng variant
        foreach ($variantsMap as $variantId => $variantData) {
            $baseName = $variantData['product_name'];
            $specValues = collect($variantData['specs'])
                ->filter(function ($spec) {
                    $specName = $spec['spec_name'] ?? '';
                    return in_array($specName, ['Màu sắc', 'RAM', 'Dung lượng bộ nhớ']);
                })
                ->sortBy(function ($spec) {
                    $order = ['Màu sắc' => 1, 'RAM' => 2, 'Dung lượng bộ nhớ' => 3];
                    return $order[$spec['spec_name']] ?? 99;
                })
                ->map(function ($spec) {
                    $value = $spec['value'];
                    if (($spec['spec_name'] === 'RAM' || $spec['spec_name'] === 'Dung lượng bộ nhớ') && is_numeric($value)) {
                        return $value . ' GB';
                    }
                    return $value;
                })
                ->filter()
                ->implode(' - ');

            $variantsMap[$variantId]['full_name'] = $baseName . ($specValues ? ' - ' . $specValues : '');
            // unset($variantsMap[$variantId]['product_name']); // Tùy chọn: xóa nếu không cần hiển thị
        }

        // Đính variants, brand & category vào product
        $product->brand = [
            'id'   => $product->brand_id,
            'name' => $product->brand_name,
            'slug' => $product->brand_slug,
        ];
        $product->category = [
            'id'   => $product->cat_id,
            'name' => $product->category_name,
            'slug' => $product->categorySlug,
        ];

        $product->variants = [];
        foreach ($variantsMap as $v) {
            // Ép kiểu về int để đảm bảo so sánh chính xác giữa các ID số
            if ((int)($v['product_id'] ?? null) === (int)$product->id) {
                $product->variants[] = $v;
            }
        }

        // Có thể unset các trường brand_id, brand_name, brand_slug, cat_id, category_name, categorySlug
        // từ $product nếu bạn chỉ muốn chúng nằm trong các mảng con $p->brand và $p->category
        unset($product->brand_id, $product->brand_name, $product->brand_slug, $product->cat_id, $product->category_name, $product->categorySlug);

        return $product;
    }
     public function getProductsByCatId(int $catId): Collection
    {
        $sql = <<<'SQL'
SELECT
    p.id,
    MIN(p.name)        AS name,
    MIN(p.slug)        AS slug,
    MIN(p.description) AS description,
    MIN(p.cat_id)      AS cat_id,

    MIN(c.name)        AS category_name,
    MIN(c.slug)        AS categorySlug,

    MIN(p.brand_id)    AS brand_id,
    MIN(b.name)        AS brand_name,
    MIN(b.slug)        AS brand_slug,

    MIN(p.is_featured) AS is_featured,
    MIN(p.status)      AS status,

    COUNT(r.id)              AS reviews_count,
    ROUND(AVG(r.rate), 2)    AS reviews_avg_rate

FROM products p
LEFT JOIN categories       c ON p.cat_id   = c.id
LEFT JOIN brands           b ON p.brand_id = b.id
LEFT JOIN reviews          r ON p.id       = r.product_id
WHERE p.cat_id = ?
GROUP BY p.id
SQL;

        // Lấy products cơ bản
        $products = DB::select($sql, [$catId]);

        if (empty($products)) {
            return collect();
        }

        // Lấy variants + specs (thêm product_name vào đây để tạo full_name)
        $ids = array_column($products, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        $variantsRaw = DB::select(<<<"SQL"
SELECT
    v.id,
    v.product_id,
    v.sku,
    v.price,
    v.discount,
    v.stock,
    v.stock - IFNULL((
        SELECT SUM(rs.quantity)
        FROM reserved_stocks rs
        WHERE rs.variant_id = v.id
          AND rs.expires_at > NOW()
    ), 0) AS available_stock,
    v.image         AS image_path,
    p.name          AS product_name, -- Thêm product_name từ bảng products
    s.name          AS spec_name,
    COALESCE(so.value, vs.value_text, vs.value_int, vs.value_decimal) AS spec_value
FROM product_variants v
JOIN products p ON v.product_id = p.id -- JOIN với bảng products
LEFT JOIN variant_spec_values vs ON vs.variant_id = v.id
LEFT JOIN specifications    s  ON vs.spec_id      = s.id
LEFT JOIN spec_options      so ON vs.option_id    = so.id
WHERE v.product_id IN ({$placeholders})
ORDER BY v.id, s.name -- Order by s.name để sắp xếp specs theo mong muốn
SQL
        , $ids);

        // Gom nhóm specs → variants và tính toán full_name
        $variantsMap = [];
        foreach ($variantsRaw as $r) {
            // Khởi tạo variant nếu chưa có
            if (!isset($variantsMap[$r->id])) {
                $variantsMap[$r->id] = [
                    'id'                => $r->id,
                    'product_id'        => $r->product_id,
                    'sku'               => $r->sku,
                    'price'             => $r->price,
                    'discount'          => $r->discount,
                    'stock'             => $r->stock,
                    'available_stock'   => $r->available_stock,
                    'image_url'         => asset('storage/') . '/' . $r->image_path,
                    'product_name'      => $r->product_name, // Lưu product_name
                    'specs'             => [],
                ];
            }
            // Thêm spec vào variant
            $variantsMap[$r->id]['specs'][] = [
                'spec_name' => $r->spec_name,
                'value'     => $r->spec_value,
            ];
        }

        // Sau khi gom nhóm, tính full_name cho từng variant
        foreach ($variantsMap as $variantId => $variantData) {
            $baseName = $variantData['product_name'];
            $specValues = collect($variantData['specs'])
                ->filter(function ($spec) {
                    // Chỉ lấy 3 đặc điểm cần thiết cho full_name
                    $specName = $spec['spec_name'] ?? '';
                    return in_array($specName, ['Màu sắc', 'RAM', 'Dung lượng bộ nhớ']);
                })
                ->sortBy(function ($spec) {
                    // Sắp xếp đúng thứ tự mong muốn: Màu sắc, RAM, Dung lượng bộ nhớ
                    $order = ['Màu sắc' => 1, 'RAM' => 2, 'Dung lượng bộ nhớ' => 3];
                    return $order[$spec['spec_name']] ?? 99; // Đảm bảo các spec khác không phá vỡ thứ tự
                })
                ->map(function ($spec) {
                    $value = $spec['value'];
                    // Thêm đơn vị 'GB' cho RAM/Dung lượng bộ nhớ nếu giá trị là số
                    if (($spec['spec_name'] === 'RAM' || $spec['spec_name'] === 'Dung lượng bộ nhớ') && is_numeric($value)) {
                        return $value . ' GB';
                    }
                    return $value;
                })
                ->filter() // Lọc bỏ các giá trị null/empty sau map
                ->implode(' - '); // Ghép các giá trị spec bằng ' - '

            // Gán full_name vào variant trong variantsMap
            $variantsMap[$variantId]['full_name'] = $baseName . ($specValues ? ' - ' . $specValues : '');
            
            // Xóa product_name khỏi variant nếu bạn không muốn nó hiển thị trực tiếp
            // unset($variantsMap[$variantId]['product_name']); 
        }

        // Đính variants, brand & category vào products
        $collection = collect($products)->map(function($p) use($variantsMap) {
            $p->brand = [
                'id'   => $p->brand_id,
                'name' => $p->brand_name,
                'slug' => $p->brand_slug,
            ];
            $p->category = [
                'id'   => $p->cat_id,
                'name' => $p->category_name,
                'slug' => $p->categorySlug,
            ];

            $p->variants = [];
            foreach ($variantsMap as $v) {
                // Ép kiểu về int để đảm bảo so sánh chính xác giữa các ID số
                if ((int)($v['product_id'] ?? null) === (int)$p->id) {
                    $p->variants[] = $v;
                }
            }

            // Có thể unset các trường brand_id, brand_name, brand_slug, cat_id, category_name, categorySlug
            // từ $p nếu bạn chỉ muốn chúng nằm trong các mảng con $p->brand và $p->category
            unset($p->brand_id, $p->brand_name, $p->brand_slug, $p->cat_id, $p->category_name, $p->categorySlug);

            return $p;
        });

        return $collection;
    }


    public function update(string $slug, array $data)
    {
        $product = Product::where('slug', $slug)->firstOrFail();

        $validated = Validator::make($data, [
            'name' => 'string',
            'description' => 'nullable|string',
            'cat_id' => 'exists:categories,id',
            'brand_id' => 'exists:brands,id',
            'image' => 'nullable|string',
            'is_featured' => 'boolean',
            'status' => 'boolean',
        ])->validate();

        if (isset($validated['name']) && $validated['name'] !== $product->name) {
            $validated['slug'] = SlugService::createSlug($validated['name'], Product::class);
        }

        $product->update($validated);
        return $product;
    }

    public function delete(string $slug)
    {
        $product = Product::where('slug', $slug)->firstOrFail();
        return $product->delete();
    }
}
