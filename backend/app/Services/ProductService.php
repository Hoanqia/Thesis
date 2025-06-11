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
    public function getProductsByCatId($catId){
        return Product::with(['brand','category'])->where('cat_id',$catId)->get();
    }
    public function getFeaturedProducts()
    {
        return Product::with(['brand','variants'])->where('is_featured',1)->get();
    }
    public function getBySlug(string $slug)
    {
        return Product::with(['brand', 'category', 'variants'])->where('slug', $slug)->first();
    }

   public function look_for(string $keyword){
        return Product::with(['brand', 'category'])
            ->where(function ($query) use ($keyword) {
                $query->where('name', 'like', '%' . $keyword . '%')
                    ->orWhere('slug', 'like', '%' . $keyword . '%')
                    ->orWhereHas('category', function ($q) use ($keyword) {
                        $q->where('name', 'like', '%' . $keyword . '%');
                    })
                    ->orWhereHas('brand', function ($q) use ($keyword) {
                        $q->where('name', 'like', '%' . $keyword . '%');
                    });
            })
            ->get();
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
