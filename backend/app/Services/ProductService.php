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
use Illuminate\Support\Facades\Cache;

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
        Cache::forget("products_by_cat_{$data['cat_id']}");

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

     public function getBySlugNoCache(string $slug): ?object
    {
        $sql = <<<'SQL'
SELECT
    p.id,
    MIN(p.name)          AS name,
    MIN(p.slug)          AS slug,
    MIN(p.description)   AS description,
    MIN(p.cat_id)        AS cat_id,

    MIN(c.name)          AS category_name,
    MIN(c.slug)          AS categorySlug,
    MIN(c.id_parent)     AS category_parent_id, -- Thêm id_parent của category

    MIN(p.brand_id)      AS brand_id,
    MIN(b.name)          AS brand_name,
    MIN(b.slug)          AS brand_slug,

    MIN(p.is_featured)   AS is_featured,
    MIN(p.status)        AS status,

    COUNT(r.id)                  AS reviews_count,
    ROUND(AVG(r.rate), 2)        AS reviews_avg_rate

FROM products p
LEFT JOIN categories   c ON p.cat_id   = c.id
LEFT JOIN brands       b ON p.brand_id = b.id
LEFT JOIN reviews      r ON p.id       = r.product_id
WHERE p.slug = ? -- Thay đổi điều kiện WHERE từ cat_id sang slug
GROUP BY p.id
SQL;
        // LIMIT 10 OFFSET 0 không cần thiết khi lấy theo slug vì chỉ có 1 sản phẩm

        // Lấy thông tin sản phẩm cơ bản dựa trên slug
        $product = DB::selectOne($sql, [$slug]); // Sử dụng selectOne vì chỉ lấy 1 sản phẩm

        if (empty($product)) {
            return null; // Trả về null nếu không tìm thấy sản phẩm
        }

        // Lấy variants và tất cả dữ liệu spec liên quan cho sản phẩm này
        $productId = $product->id;

        $variantsAndSpecsRaw = DB::select(<<<"SQL"
SELECT
    v.id AS variant_id,
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
    v.image AS image_path,
    v.profit_percent, -- Thêm các thuộc tính còn thiếu từ interface Variant
    v.average_cost,
    v.status, -- Thêm status cho Variant

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
WHERE v.product_id = ? -- Điều kiện WHERE cho 1 product_id cụ thể
ORDER BY v.id, s.name -- Sắp xếp theo variant ID và tên spec để dễ xử lý
SQL
        , [$productId]);

        // Debugging variantsAndSpecsRaw
        // Log::info('Variants and Specs Raw Data for single product:', (array)$variantsAndSpecsRaw);


        // Gom nhóm dữ liệu để tạo cấu trúc Variants và SpecValues
        $variantsMap = [];
        foreach ($variantsAndSpecsRaw as $r) {
            $variantId = $r->variant_id;

            // Khởi tạo variant nếu chưa có
            if (!isset($variantsMap[$variantId])) {
                $variantsMap[$variantId] = [
                    'id'                        => $r->variant_id,
                    'product_id'                => $r->product_id,
                    'sku'                       => $r->sku,
                    'price'                     => $r->price,
                    'discount'                  => $r->discount,
                    'stock'                     => $r->stock,
                    'available_stock_for_sale'  => $r->available_stock, // Đổi tên để khớp với frontend
                    'image_url'                 => $r->image_path ? asset('storage/' . $r->image_path) : null, // Xử lý null image_path
                    'profit_percent'            => $r->profit_percent ?? 0, // Giá trị mặc định 0 nếu null
                    'average_cost'              => $r->average_cost ?? 0, // Giá trị mặc định 0 nếu null
                    'status'                    => $r->status, // Thêm status cho Variant
                    'product_name'              => $r->product_name, // Để xây dựng full_name
                    'variant_spec_values'       => [], // Khởi tạo mảng rỗng cho spec values
                    // Các thuộc tính khác từ interface Variant nếu cần
                    // 'category_name' => null, // Không có sẵn trực tiếp từ join này, hoặc cần thêm join nếu cần
                    // 'product' => null, // Sẽ được gắn sau
                    // 'variant_from_suppliers' => [], // Giả định không có trong truy vấn này
                    // 'selected_supplier_id' => null,
                    // 'selected_supplier_price' => null,
                ];
            }

            // Thêm SpecValue vào variant_spec_values nếu tồn tại dữ liệu spec
            if ($r->spec_value_id !== null) { // Chỉ thêm nếu có SpecValue thực sự
                $specValue = [
                    'id'            => $r->spec_value_id,
                    'variant_id'    => $r->variant_id,
                    'spec_id'       => $r->spec_id,
                    'value_text'    => $r->value_text,
                    'value_int'     => $r->value_int !== null ? (int)$r->value_int : null,
                    'value_decimal' => $r->value_decimal !== null ? (float)$r->value_decimal : null,
                    'option_id'     => $r->option_id,
                    'created_at'    => $r->spec_value_created_at,
                    'updated_at'    => $r->spec_value_updated_at,
                    'specification' => [
                        'id'            => $r->spec_id, // Lấy ID từ spec_id của variant_spec_values
                        'category_id'   => null, // Có thể cần JOIN thêm bảng specifications để lấy category_id
                        'name'          => $r->specification_name,
                        'data_type'     => $r->data_type,
                        'unit'          => $r->unit,
                        'description'   => $r->specification_description,
                        'created_at'    => $r->specification_created_at,
                        'updated_at'    => $r->specification_updated_at,
                    ],
                    'spec_options'  => null, // Mặc định là null
                ];

                if ($r->option_id !== null) {
                    $specValue['spec_options'] = [
                        'id'            => $r->option_id,
                        'spec_id'       => $r->spec_id, // Lấy spec_id từ SpecValue
                        'value'         => $r->spec_option_value,
                        'created_at'    => $r->spec_option_created_at,
                        'updated_at'    => $r->spec_option_updated_at,
                    ];
                }
                $variantsMap[$variantId]['variant_spec_values'][] = $specValue;
            }
        }

        // Tính toán full_name cho từng variant (logic này vẫn giữ nguyên vì nó đã tốt)
        foreach ($variantsMap as $variantId => &$variantData) { // Dùng & để sửa đổi trực tiếp trong map
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

                    // Thêm đơn vị 'GB' cho RAM/Dung lượng bộ nhớ
                    if (($specValue['specification']['name'] === 'RAM' || $specValue['specification']['name'] === 'Dung lượng bộ nhớ') && is_numeric($value)) {
                        return $value . ' GB';
                    }
                    return $value;
                })
                ->filter() // Lọc bỏ các giá trị null/empty sau map
                ->implode(' - ');

            $variantData['full_name'] = $baseName . ($specValuesParts ? ' - ' . $specValuesParts : '');

            // Xóa product_name khỏi variant nếu bạn không muốn nó hiển thị trực tiếp
            unset($variantData['product_name']);
        }

        // Debugging variantsMap
        // Log::info('Processed Variants Map for single product:', $variantsMap);


        // Đính variants, brand & category vào product
        $product->brand = [
            'id'   => $product->brand_id,
            'name' => $product->brand_name,
            'slug' => $product->brand_slug,
        ];
        $product->category = [
            'id'       => $product->cat_id,
            'name'     => $product->category_name,
            'slug'     => $product->categorySlug,
            'id_parent' => $product->category_parent_id, // Thêm id_parent vào category
        ];

        // Lấy tất cả variants từ map (vì chỉ có 1 sản phẩm)
        $product->variants = array_values($variantsMap);

        // Xóa các trường không cần thiết ở cấp độ Product sau khi đã chuyển vào các object con
        unset(
            $product->brand_id,
            $product->brand_name,
            $product->brand_slug,
            $product->cat_id,
            $product->category_name,
            $product->categorySlug,
            $product->category_parent_id // Xóa cả cái này sau khi đã gắn vào category object
        );

        // Debugging final product object
        // Log::info('Final Product Object:', (array)$product);


        return $product;
    }
   public function getBySlug(string $slug): ?object{
         return Cache::remember("get_by_slug_{$slug}", now()->addMinutes(10), function () use ($slug) {
        return $this->getBySlugNoCache($slug);
    });
   }


/**
     * Lấy danh sách sản phẩm theo ID danh mục với phân trang.
     * Trả về dữ liệu sản phẩm theo cấu trúc Collection đã có, nhưng được bao bọc bởi thông tin phân trang.
     *
     * @param int $catId ID của danh mục.
     * @param int $limit Số sản phẩm trên mỗi trang (mặc định 20).
     * @param int $page Số trang hiện tại (mặc định 1).
     * @return array Trả về mảng chứa 'data' (Collection sản phẩm) và các thông tin phân trang.
     */
    public function getProductsByCatIdNoCache(int $catId, int $limit = 20, int $page = 1): array
    {
        // Tính toán OFFSET
        $offset = ($page - 1) * $limit;

        // --- Bước 1: Lấy tổng số sản phẩm cho danh mục để tính toán phân trang ---
        $totalSql = <<<'SQL'
SELECT COUNT(p.id) AS total_products
FROM products p
WHERE p.cat_id = ?
SQL;
        $totalResult = DB::selectOne($totalSql, [$catId]);
        $totalProducts = $totalResult->total_products ?? 0;

        // Nếu không có sản phẩm nào, trả về mảng rỗng ngay lập tức với thông tin phân trang
        if ($totalProducts === 0) {
            return [
                'data' => collect(), // Vẫn là một Collection rỗng
                'meta' => [ // Sử dụng 'meta' để chứa thông tin phân trang
                    'total' => 0,
                    'per_page' => $limit,
                    'current_page' => $page,
                    'last_page' => 0,
                    'from' => null,
                    'to' => null,
                ]
            ];
        }

        // --- Bước 2: Lấy sản phẩm cho trang hiện tại với LIMIT và OFFSET ---
        $productSql = <<<'SQL'
SELECT
    p.id,
    MIN(p.name)           AS name,
    MIN(p.slug)           AS slug,
    MIN(p.description)    AS description,
    MIN(p.cat_id)         AS cat_id,

    MIN(c.name)           AS category_name,
    MIN(c.slug)           AS categorySlug,
    MIN(c.id_parent)      AS category_parent_id, -- Thêm id_parent của category

    MIN(p.brand_id)       AS brand_id,
    MIN(b.name)           AS brand_name,
    MIN(b.slug)           AS brand_slug,

    MIN(p.is_featured)    AS is_featured,
    MIN(p.status)         AS status,

    COUNT(r.id)                 AS reviews_count,
    ROUND(AVG(r.rate), 2)       AS reviews_avg_rate

FROM products p
LEFT JOIN categories   c ON p.cat_id   = c.id
LEFT JOIN brands       b ON p.brand_id = b.id
LEFT JOIN reviews      r ON p.id       = r.product_id
WHERE p.cat_id = ?
GROUP BY p.id
ORDER BY p.id -- Thêm ORDER BY để đảm bảo thứ tự ổn định khi phân trang
LIMIT ? OFFSET ?
SQL;

        // Lấy products cơ bản cho trang hiện tại
        $products = DB::select($productSql, [$catId, $limit, $offset]);

        // Tính toán lại productIds sau khi đã phân trang
        $productIds = array_column($products, 'id');

        // Nếu không có sản phẩm nào trên trang này, nhưng có tổng sản phẩm (trường hợp trang cuối cùng trống)
        if (empty($products)) {
            return [
                'data' => collect(),
                'meta' => [
                    'total' => $totalProducts,
                    'per_page' => $limit,
                    'current_page' => $page,
                    'last_page' => ceil($totalProducts / $limit),
                    'from' => null,
                    'to' => null,
                ]
            ];
        }

        // --- Các phần còn lại của logic xử lý sản phẩm và variants giữ nguyên ---
        $placeholders = implode(',', array_fill(0, count($productIds), '?'));

        $variantsAndSpecsRaw = DB::select(<<<"SQL"
SELECT
    v.id AS variant_id,
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
    v.image AS image_path,
    v.profit_percent,
    v.average_cost,
    v.status,

    p.name AS product_name,

    vs.id AS spec_value_id,
    vs.spec_id,
    vs.value_text,
    vs.value_int,
    vs.value_decimal,
    vs.option_id,
    vs.created_at AS spec_value_created_at,
    vs.updated_at AS spec_value_updated_at,

    s.name AS specification_name,
    s.data_type,
    s.unit,
    s.description AS specification_description,
    s.created_at AS specification_created_at,
    s.updated_at AS specification_updated_at,

    so.value AS spec_option_value,
    so.created_at AS spec_option_created_at,
    so.updated_at AS spec_option_updated_at
FROM product_variants v
JOIN products p ON v.product_id = p.id
LEFT JOIN variant_spec_values vs ON vs.variant_id = v.id
LEFT JOIN specifications s ON vs.spec_id = s.id
LEFT JOIN spec_options so ON vs.option_id = so.id
WHERE v.product_id IN ({$placeholders})
ORDER BY v.id, s.name
SQL
        , $productIds);

        $variantsMap = [];
        foreach ($variantsAndSpecsRaw as $r) {
            $variantId = $r->variant_id;

            if (!isset($variantsMap[$variantId])) {
                $variantsMap[$variantId] = [
                    'id'                        => $r->variant_id,
                    'product_id'                => $r->product_id,
                    'sku'                       => $r->sku,
                    'price'                     => $r->price,
                    'discount'                  => $r->discount,
                    'stock'                     => $r->stock,
                    'available_stock_for_sale'  => $r->available_stock,
                    'image_url'                 => $r->image_path ? asset('storage/' . $r->image_path) : null,
                    'profit_percent'            => $r->profit_percent ?? 0,
                    'average_cost'              => $r->average_cost ?? 0,
                    'status'                    => $r->status,
                    'product_name'              => $r->product_name,
                    'variant_spec_values'       => [],
                ];
            }

            if ($r->spec_value_id !== null) {
                $specValue = [
                    'id'            => $r->spec_value_id,
                    'variant_id'    => $r->variant_id,
                    'spec_id'       => $r->spec_id,
                    'value_text'    => $r->value_text,
                    'value_int'     => $r->value_int !== null ? (int)$r->value_int : null,
                    'value_decimal' => $r->value_decimal !== null ? (float)$r->value_decimal : null,
                    'option_id'     => $r->option_id,
                    'created_at'    => $r->spec_value_created_at,
                    'updated_at'    => $r->spec_value_updated_at,
                    'specification' => [
                        'id'            => $r->spec_id,
                        'category_id'   => null,
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
                        'id'            => $r->option_id,
                        'spec_id'       => $r->spec_id,
                        'value'         => $r->spec_option_value,
                        'created_at'    => $r->spec_option_created_at,
                        'updated_at'    => $r->spec_option_updated_at,
                    ];
                }
                $variantsMap[$variantId]['variant_spec_values'][] = $specValue;
            }
        }

        foreach ($variantsMap as $variantId => &$variantData) {
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

                    if ($value === null) return null;

                    if (($specValue['specification']['name'] === 'RAM' || $specValue['specification']['name'] === 'Dung lượng bộ nhớ') && is_numeric($value)) {
                        return $value . ' GB';
                    }
                    return $value;
                })
                ->filter()
                ->implode(' - ');

            $variantData['full_name'] = $baseName . ($specValuesParts ? ' - ' . $specValuesParts : '');
            unset($variantData['product_name']);
        }

        $collection = collect($products)->map(function($p) use($variantsMap) {
            $p->brand = [
                'id'   => $p->brand_id,
                'name' => $p->brand_name,
                'slug' => $p->brand_slug,
            ];
            $p->category = [
                'id'        => $p->cat_id,
                'name'      => $p->category_name,
                'slug'      => $p->categorySlug,
                'id_parent' => $p->category_parent_id,
            ];

            $p->variants = collect($variantsMap)
                            ->filter(fn($v) => (int)($v['product_id'] ?? null) === (int)$p->id)
                            ->values()
                            ->all();

            unset(
                $p->brand_id,
                $p->brand_name,
                $p->brand_slug,
                $p->cat_id,
                $p->category_name,
                $p->categorySlug,
                $p->category_parent_id
            );

            return $p;
        });

        // Tính toán thông tin phân trang
        $lastPage = ceil($totalProducts / $limit);
        $from = ($collection->isEmpty()) ? null : $offset + 1;
        $to = ($collection->isEmpty()) ? null : $offset + $collection->count();


        return [
            'data' => $collection, // Vẫn trả về Collection sản phẩm
            'meta' => [ // Thêm meta data cho phân trang
                'total' => $totalProducts,
                'per_page' => $limit,
                'current_page' => $page,
                'last_page' => (int) $lastPage, // Chắc chắn là số nguyên
                'from' => $from,
                'to' => $to,
            ]
        ];
    }



// /**
//  * Lấy danh sách sản phẩm theo ID danh mục với phân trang, sử dụng dữ liệu denormalized.
//  * Trả về dữ liệu sản phẩm theo cấu trúc Collection đã có, nhưng được bao bọc bởi thông tin phân trang.
//  *
//  * @param int $catId ID của danh mục.
//  * @param int $limit Số sản phẩm trên mỗi trang (mặc định 20).
//  * @param int $page Số trang hiện tại (mặc định 1).
//  * @return array Trả về mảng chứa 'data' (Collection sản phẩm) và các thông tin phân trang.
//  */
// public function getProductsByCatIdNoCache(int $catId, int $limit = 20, int $page = 1): array
// {
//     // Tính toán OFFSET
//     $offset = ($page - 1) * $limit;

//     // --- Bước 1: Lấy tổng số sản phẩm cho danh mục để tính toán phân trang ---
//     // Chỉ cần COUNT DISTINCT product_id từ bảng variant_summaries
//     $totalProducts = DB::table('variant_summaries')
//                         ->where('cat_id', $catId)
//                         ->distinct('product_id')
//                         ->count('product_id');

//     // Nếu không có sản phẩm nào, trả về mảng rỗng
//     if ($totalProducts === 0) {
//         return [
//             'data' => collect(),
//             'meta' => [
//                 'total' => 0,
//                 'per_page' => $limit,
//                 'current_page' => $page,
//                 'last_page' => 0,
//                 'from' => null,
//                 'to' => null,
//             ]
//         ];
//     }
    
//     // --- Bước 2: Lấy danh sách ID sản phẩm cho trang hiện tại ---
//     $productIdsForPage = DB::table('variant_summaries')
//                             ->where('cat_id', $catId)
//                             ->select('product_id')
//                             ->distinct()
//                             ->orderBy('product_id') // Đảm bảo thứ tự ổn định khi phân trang
//                             ->limit($limit)
//                             ->offset($offset)
//                             ->get()
//                             ->pluck('product_id')
//                             ->all();
    
//     // Nếu không có sản phẩm nào trên trang này
//     if (empty($productIdsForPage)) {
//         return [
//             'data' => collect(),
//             'meta' => [
//                 'total' => $totalProducts,
//                 'per_page' => $limit,
//                 'current_page' => $page,
//                 'last_page' => ceil($totalProducts / $limit),
//                 'from' => null,
//                 'to' => null,
//             ]
//         ];
//     }

//     // --- Bước 3: Lấy tất cả các variants cho các sản phẩm đã được phân trang ---
//     $variantsData = DB::table('variant_summaries')
//                         ->whereIn('product_id', $productIdsForPage)
//                         ->orderBy('product_id')
//                         ->get()
//                         ->groupBy('product_id'); // Nhóm variants theo product_id

//     // --- Bước 4: Tạo cấu trúc dữ liệu mong muốn trong PHP ---
//     $productsCollection = collect();
//     foreach ($productIdsForPage as $productId) {
//         $variants = $variantsData[$productId] ?? collect();
//         if ($variants->isEmpty()) continue;

//         // Lấy thông tin chung của sản phẩm từ một variant bất kỳ
//         $firstVariant = $variants->first();
//         $product = [
//             'id' => $firstVariant->product_id,
//             'name' => $firstVariant->name,
//             'slug' => $firstVariant->slug,
//             'description' => null, // Không có trong variant_summaries
//             'is_featured' => $firstVariant->is_featured,
//             'status' => $firstVariant->status,
//             'reviews_count' => $firstVariant->reviews_count,
//             'reviews_avg_rate' => $firstVariant->reviews_avg_rate,
//             'category' => [
//                 'id' => $firstVariant->cat_id,
//                 'name' => $firstVariant->category_name,
//                 'slug' => $firstVariant->slug,
//                 'id_parent' => null, // Không có trong variant_summaries
//             ],
//             'brand' => [
//                 'id' => null, // Không có trong variant_summaries
//                 'name' => $firstVariant->brand_name,
//                 'slug' => null, // Không có trong variant_summaries
//             ],
//             'variants' => $variants->map(function($v) {
//                 // Xử lý denormalized_specs
//                 $specs = json_decode($v->denormalized_specs, true);
//                 $v->denormalized_specs = $specs;
//                 $v->image_url = asset('storage/' . $v->image_url);

//                 return $v;
//             })->values()->all(),
//         ];
//         $productsCollection->push($product);
//     }

//     // Tính toán thông tin phân trang
//     $lastPage = ceil($totalProducts / $limit);
//     $from = ($productsCollection->isEmpty()) ? null : $offset + 1;
//     $to = ($productsCollection->isEmpty()) ? null : $offset + $productsCollection->count();

//     return [
//         'data' => $productsCollection,
//         'meta' => [
//             'total' => $totalProducts,
//             'per_page' => $limit,
//             'current_page' => $page,
//             'last_page' => (int) $lastPage,
//             'from' => $from,
//             'to' => $to,
//         ]
//     ];
// }


    /**
     * Lấy danh sách sản phẩm theo ID danh mục với phân trang và cache.
     * Lưu ý: Caching một hàm có tham số limit/page đòi hỏi key cache phức tạp hơn.
     *
     * @param int $catId ID của danh mục.
     * @param int $limit Số sản phẩm trên mỗi trang (mặc định 20).
     * @param int $page Số trang hiện tại (mặc định 1).
     * @return array
     */
    public function getProductsByCatId(int $catId, int $limit = 20, int $page = 1): array
    {
        // Tạo key cache duy nhất cho mỗi catId, limit và page
        $cacheKey = "products_by_cat_{$catId}_limit_{$limit}_page_{$page}";

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($catId, $limit, $page) {
            return $this->getProductsByCatIdNoCache($catId, $limit, $page);
        });
    }

//     public function getProductsByCatId(int $catId): Collection
// {
//     return Cache::remember("products_by_cat_{$catId}", now()->addMinutes(10), function () use ($catId) {
//         return $this->getProductsByCatIdNoCache($catId);
//     });
// }
// public function getProductsByCatIdNoCache(int $catId): Collection
//     {
//         $sql = <<<'SQL'
// SELECT
//     p.id,
//     MIN(p.name)          AS name,
//     MIN(p.slug)          AS slug,
//     MIN(p.description)   AS description,
//     MIN(p.cat_id)        AS cat_id,

//     MIN(c.name)          AS category_name,
//     MIN(c.slug)          AS categorySlug,
//     MIN(c.id_parent)     AS category_parent_id, -- Thêm id_parent của category

//     MIN(p.brand_id)      AS brand_id,
//     MIN(b.name)          AS brand_name,
//     MIN(b.slug)          AS brand_slug,

//     MIN(p.is_featured)   AS is_featured,
//     MIN(p.status)        AS status,

//     COUNT(r.id)                  AS reviews_count,
//     ROUND(AVG(r.rate), 2)        AS reviews_avg_rate

// FROM products p
// LEFT JOIN categories   c ON p.cat_id   = c.id
// LEFT JOIN brands       b ON p.brand_id = b.id
// LEFT JOIN reviews      r ON p.id       = r.product_id
// WHERE p.cat_id = ?
// GROUP BY p.id
// LIMIT 10 OFFSET 0
// SQL;

//         // Lấy products cơ bản
//         $products = DB::select($sql, [$catId]);

//         if (empty($products)) {
//             return collect();
//         }

//         // Lấy variants và tất cả dữ liệu spec liên quan
//         $productIds = array_column($products, 'id');
//         $placeholders = implode(',', array_fill(0, count($productIds), '?'));

//         $variantsAndSpecsRaw = DB::select(<<<"SQL"
// SELECT
//     v.id AS variant_id,
//     v.product_id,
//     v.sku,
//     v.price,
//     v.discount,
//     v.stock,
//     v.stock - IFNULL((
//         SELECT SUM(rs.quantity)
//         FROM reserved_stocks rs
//         WHERE rs.variant_id = v.id
//           AND rs.expires_at > NOW()
//     ), 0) AS available_stock,
//     v.image AS image_path,
//     v.profit_percent, -- Thêm các thuộc tính còn thiếu từ interface Variant
//     v.average_cost,
//     v.status,

//     p.name AS product_name, -- product_name cho full_name

//     -- Dữ liệu cho SpecValue
//     vs.id AS spec_value_id,
//     vs.spec_id,
//     vs.value_text,
//     vs.value_int,
//     vs.value_decimal,
//     vs.option_id,
//     vs.created_at AS spec_value_created_at,
//     vs.updated_at AS spec_value_updated_at,

//     -- Dữ liệu cho Specification
//     s.name AS specification_name,
//     s.data_type,
//     s.unit,
//     s.description AS specification_description,
//     s.created_at AS specification_created_at,
//     s.updated_at AS specification_updated_at,

//     -- Dữ liệu cho SpecOption
//     so.value AS spec_option_value,
//     so.created_at AS spec_option_created_at,
//     so.updated_at AS spec_option_updated_at
// FROM product_variants v
// JOIN products p ON v.product_id = p.id
// LEFT JOIN variant_spec_values vs ON vs.variant_id = v.id
// LEFT JOIN specifications s ON vs.spec_id = s.id
// LEFT JOIN spec_options so ON vs.option_id = so.id
// WHERE v.product_id IN ({$placeholders})
// ORDER BY v.id, s.name -- Sắp xếp theo variant ID và tên spec để dễ xử lý
// SQL
//         , $productIds);

//         // Debugging variantsAndSpecsRaw
//         // Log::info('Variants and Specs Raw Data:', (array)$variantsAndSpecsRaw);


//         // Gom nhóm dữ liệu để tạo cấu trúc Variants và SpecValues
//         $variantsMap = [];
//         foreach ($variantsAndSpecsRaw as $r) {
//             $variantId = $r->variant_id;

//             // Khởi tạo variant nếu chưa có
//             if (!isset($variantsMap[$variantId])) {
//                 $variantsMap[$variantId] = [
//                     'id'                        => $r->variant_id,
//                     'product_id'                => $r->product_id,
//                     'sku'                       => $r->sku,
//                     'price'                     => $r->price,
//                     'discount'                  => $r->discount,
//                     'stock'                     => $r->stock,
//                     'available_stock_for_sale'  => $r->available_stock, // Đổi tên để khớp với frontend
//                     'image_url'                 => $r->image_path ? asset('storage/' . $r->image_path) : null, // Xử lý null image_path
//                     'profit_percent'            => $r->profit_percent ?? 0,
//                     'average_cost'              => $r->average_cost ?? 0,
//                     'status'                    => $r->status, // Thêm status
//                     'product_name'              => $r->product_name, // Để xây dựng full_name
//                     'variant_spec_values'       => [], // Khởi tạo mảng rỗng cho spec values
//                     // Các thuộc tính khác từ interface Variant nếu cần
//                     // 'category_name' => $r->category_name // Nếu bạn muốn thêm vào Variant
//                     // 'product' => null // Sẽ được gắn sau, không cần thiết ở đây
//                     // 'variant_from_suppliers' => [], // Giả định không có trong truy vấn này
//                     // 'selected_supplier_id' => null,
//                     // 'selected_supplier_price' => null,
//                 ];
//             }

//             // Thêm SpecValue vào variant_spec_values nếu tồn tại dữ liệu spec
//             if ($r->spec_value_id !== null) { // Chỉ thêm nếu có SpecValue thực sự
//                 $specValue = [
//                     'id'            => $r->spec_value_id,
//                     'variant_id'    => $r->variant_id,
//                     'spec_id'       => $r->spec_id,
//                     'value_text'    => $r->value_text,
//                     'value_int'     => $r->value_int !== null ? (int)$r->value_int : null,
//                     'value_decimal' => $r->value_decimal !== null ? (float)$r->value_decimal : null,
//                     'option_id'     => $r->option_id,
//                     'created_at'    => $r->spec_value_created_at,
//                     'updated_at'    => $r->spec_value_updated_at,
//                     'specification' => [
//                         'id'            => $r->spec_id, // Lấy ID từ spec_id của variant_spec_values
//                         'category_id'   => null, // Có thể cần JOIN thêm bảng specifications để lấy category_id
//                         'name'          => $r->specification_name,
//                         'data_type'     => $r->data_type,
//                         'unit'          => $r->unit,
//                         'description'   => $r->specification_description,
//                         'created_at'    => $r->specification_created_at,
//                         'updated_at'    => $r->specification_updated_at,
//                     ],
//                     'spec_options'  => null, // Mặc định là null
//                 ];

//                 if ($r->option_id !== null) {
//                     $specValue['spec_options'] = [
//                         'id'            => $r->option_id,
//                         'spec_id'       => $r->spec_id, // Lấy spec_id từ SpecValue
//                         'value'         => $r->spec_option_value,
//                         'created_at'    => $r->spec_option_created_at,
//                         'updated_at'    => $r->spec_option_updated_at,
//                     ];
//                 }
//                 $variantsMap[$variantId]['variant_spec_values'][] = $specValue;
//             }
//         }

//         // Tính toán full_name cho từng variant (logic này vẫn giữ nguyên vì nó đã tốt)
//         foreach ($variantsMap as $variantId => &$variantData) { // Dùng & để sửa đổi trực tiếp trong map
//             $baseName = $variantData['product_name'];
//             $specValuesParts = collect($variantData['variant_spec_values'])
//                 ->filter(function ($specValue) {
//                     $specName = $specValue['specification']['name'] ?? '';
//                     return in_array($specName, ['Màu sắc', 'RAM', 'Dung lượng bộ nhớ']);
//                 })
//                 ->sortBy(function ($specValue) {
//                     $specName = $specValue['specification']['name'] ?? '';
//                     $order = ['Màu sắc' => 1, 'RAM' => 2, 'Dung lượng bộ nhớ' => 3];
//                     return $order[$specName] ?? 99;
//                 })
//                 ->map(function ($specValue) {
//                     $value = null;
//                     switch ($specValue['specification']['data_type']) {
//                         case 'int':
//                             $value = $specValue['value_int'];
//                             break;
//                         case 'decimal':
//                             $value = $specValue['value_decimal'];
//                             break;
//                         case 'text':
//                             $value = $specValue['value_text'];
//                             break;
//                         case 'option':
//                             $value = $specValue['spec_options']['value'] ?? null;
//                             break;
//                     }

//                     if ($value === null) return null; // Bỏ qua giá trị null

//                     // Thêm đơn vị 'GB' cho RAM/Dung lượng bộ nhớ
//                     if (($specValue['specification']['name'] === 'RAM' || $specValue['specification']['name'] === 'Dung lượng bộ nhớ') && is_numeric($value)) {
//                         return $value . ' GB';
//                     }
//                     return $value;
//                 })
//                 ->filter() // Lọc bỏ các giá trị null/empty sau map
//                 ->implode(' - ');

//             $variantData['full_name'] = $baseName . ($specValuesParts ? ' - ' . $specValuesParts : '');

//             // Xóa product_name khỏi variant nếu bạn không muốn nó hiển thị trực tiếp
//             unset($variantData['product_name']);
//         }


//         // Debugging variantsMap
//         // Log::info('Processed Variants Map:', $variantsMap);


//         // Đính variants, brand & category vào products
//         $collection = collect($products)->map(function($p) use($variantsMap) {
//             $p->brand = [
//                 'id'   => $p->brand_id,
//                 'name' => $p->brand_name,
//                 'slug' => $p->brand_slug,
//             ];
//             $p->category = [
//                 'id'       => $p->cat_id,
//                 'name'     => $p->category_name,
//                 'slug'     => $p->categorySlug,
//                 'id_parent' => $p->category_parent_id, // Thêm id_parent vào category
//             ];

//             // Filter variants that belong to the current product
//             $p->variants = collect($variantsMap)
//                             ->filter(fn($v) => (int)($v['product_id'] ?? null) === (int)$p->id)
//                             ->values() // Re-index the array after filtering
//                             ->all();

//             // Xóa các trường không cần thiết ở cấp độ Product sau khi đã chuyển vào các object con
//             unset(
//                 $p->brand_id,
//                 $p->brand_name,
//                 $p->brand_slug,
//                 $p->cat_id,
//                 $p->category_name,
//                 $p->categorySlug,
//                 $p->category_parent_id // Xóa cả cái này sau khi đã gắn vào category object
//             );

//             return $p;
//         });

//         // Debugging final collection
//         // Log::info('Final Product Collection:', $collection->toArray());


//         return $collection;
//     }



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
            // Nếu category thay đổi → xoá cache cả cat_id cũ và mới
    if (isset($validated['cat_id']) && $validated['cat_id'] !== $product->cat_id) {
        Cache::forget("products_by_cat_{$product->cat_id}");
        Cache::forget("products_by_cat_{$validated['cat_id']}");
    } else {
        // Nếu không đổi category, vẫn cần xoá cache hiện tại
        Cache::forget("products_by_cat_{$product->cat_id}");
    }

        $product->update($validated);
        return $product;
    }

    public function delete(string $slug)
    {
        $product = Product::where('slug', $slug)->firstOrFail();
        Cache::forget("products_by_cat_{$product->cat_id}");
        return $product->delete();
    }
}
