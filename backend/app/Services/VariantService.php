<?php

namespace App\Services;

use App\Models\Variant;
use App\Models\SpecOption;
use App\Models\Product;
use App\Models\VariantSpecValue;
use Illuminate\Support\Facades\DB;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;
use App\Services\SpecValueService;
class VariantService
{   
    
    public function auto_completed_spec_value_recommendation($productId){
        $product = Product::find($productId);
        
    }   

     public function showSpecValues($variantId){
            return VariantSpecValue::where('variant_id', $variantId)
           ->get();     
    }

   


    // private function generateSkuFromSpec(array $data): string{
    //     $sku = 'V' . $data['product_id'];

    //     if (!empty($data['spec_values'])) {
    //         foreach ($data['spec_values'] as $spec) {
    //             if (!empty($spec['value_text'])) {
    //                 $sku .= '-' . strtoupper(substr($spec['value_text'], 0, 3));
    //             } elseif (!empty($spec['value_int'])) {
    //                 $sku .= '-' . $spec['value_int'];
    //             } elseif (!empty($spec['value_decimal'])) {
    //                 $sku .= '-' . str_replace('.', '', $spec['value_decimal']);
    //             } elseif (!empty($spec['option_id'])) {
    //                 $option = SpecOption::find($spec['option_id']);
    //                 if ($option) {
    //                     $sku .= '-' . strtoupper(substr($option->name, 0, 3));
    //                 }
    //             }
    //         }
    //     }

    //     // Tránh trùng SKU
    //     $originalSku = $sku;
    //     $i = 1;
    //     while (Variant::where('sku', $sku)->exists()) {
    //         $sku = $originalSku . '-' . $i;
    //         $i++;
    //     }

    //     return $sku;
    // }

    // public function createVariant(array $data){
    //     return DB::transaction(function () use ($data) {

    //         $sku = $this->generateSkuFromSpec($data);
    //         $variant = Variant::create([
    //             'product_id' => $data['product_id'],
    //             'sku'        => $sku,
    //             'price'      => $data['price'],
    //             'discount'   => $data['discount'] ?? 0,
    //             'stock'      => $data['stock'] ?? 0,
    //             'image'      => $data['image'] ?? null,

    //         ]);
        
    //         // Nếu có parent_variant_id thì clone spec_values từ đó
    //         if (!empty($data['parent_variant_id'])) {
    //             $parentSpecValues = VariantSpecValue::where('variant_id', $data['parent_variant_id'])->get();

    //             foreach ($parentSpecValues as $spec) {
    //                 VariantSpecValue::create([
    //                     'variant_id'    => $variant->id,
    //                     'spec_id'       => $spec->spec_id,
    //                     'value_text'    => $spec->value_text,
    //                     'value_int'     => $spec->value_int,
    //                     'value_decimal' => $spec->value_decimal,
    //                     'option_id'     => $spec->option_id,
    //                 ]);
    //             }
    //         }
    //         if (!empty($data['spec_values'])) {
    //                 foreach ($data['spec_values'] as $specValue) {
    //                     // Kiểm tra xem có bất kỳ giá trị nào để override không
    //                     $hasText    = array_key_exists('value_text', $specValue) && $specValue['value_text'] !== null && $specValue['value_text'] !== '';
    //                     $hasInt     = array_key_exists('value_int', $specValue)    && $specValue['value_int'] !== null;
    //                     $hasDecimal = array_key_exists('value_decimal', $specValue)&& $specValue['value_decimal'] !== null;
    //                     $hasOption  = array_key_exists('option_id', $specValue)    && $specValue['option_id'] !== null && $specValue['option_id'] !== '';

    //                     // Nếu không có gì để override thì bỏ qua
    //                     if (! ($hasText || $hasInt || $hasDecimal || $hasOption)) {
    //                         continue;
    //                     }

    //                     // Xóa spec cũ cùng spec_id đã clone
    //                     VariantSpecValue::where([
    //                         'variant_id' => $variant->id,
    //                         'spec_id'    => $specValue['spec_id'],
    //                     ])->delete();

    //                     // Tạo spec mới với các giá trị override
    //                     VariantSpecValue::create([
    //                         'variant_id'    => $variant->id,
    //                         'spec_id'       => $specValue['spec_id'],
    //                         'value_text'    => $specValue['value_text']    ?? null,
    //                         'value_int'     => $specValue['value_int']     ?? null,
    //                         'value_decimal' => $specValue['value_decimal'] ?? null,
    //                         'option_id'     => $specValue['option_id']     ?? null,
    //                     ]);
    //                 }
    //             }
    //         return $variant->load(['variantSpecValues.specification', 'variantSpecValues.spec_options']);
    //     });
    // }

     private function generateSkuFromSpecFromDB(int $productId, Collection $specValues): string{
        $sku = 'V' . $productId;

        foreach ($specValues as $spec) {
            if (!empty($spec->value_text)) {
                $sku .= '-' . strtoupper(substr($spec->value_text, 0, 3));
            } elseif (!is_null($spec->value_int)) {
                $sku .= '-' . $spec->value_int;
            } elseif (!is_null($spec->value_decimal)) {
                $sku .= '-' . str_replace('.', '', $spec->value_decimal);
            } elseif (!empty($spec->option_id) && $spec->relationLoaded('spec_options') && $spec->spec_options) {
                $sku .= '-' . strtoupper(substr($spec->spec_options->name, 0, 3));
            }
        }

        // Tránh trùng SKU
        $originalSku = $sku;
        $i = 1;
        while (Variant::where('sku', $sku)->exists()) {
            $sku = $originalSku . '-' . $i;
            $i++;
        }

        return $sku;
    }

   public function createVariant(array $data){
    return DB::transaction(function () use ($data) {
        // 1) Lọc spec_values có giá trị
        $temporarySku = 'TEMP-' . uniqid();

        if (!empty($data['spec_values'])) {
            $data['spec_values'] = array_values(array_filter($data['spec_values'], function ($sv) {
                $hasText = isset($sv['value_text']) && $sv['value_text'] !== '';
                $hasInt = array_key_exists('value_int', $sv) && $sv['value_int'] !== null;
                $hasDecimal = array_key_exists('value_decimal', $sv) && $sv['value_decimal'] !== null;
                $hasOption = isset($sv['option_id']) && $sv['option_id'] !== '';
                return $hasText || $hasInt || $hasDecimal || $hasOption;
            }));
        }

        // 2) Tạo variant ban đầu (chưa có SKU)
        $variant = Variant::create([
            'product_id' => $data['product_id'],
            'sku'        => $temporarySku, // Tạm thời rỗng, lát nữa cập nhật
            'price'      => $data['price'],
            'discount'   => $data['discount'] ?? 0,
            'stock'      => $data['stock'] ?? 0,
            'image'      => $data['image'] ?? null,
        ]);

        // 3) Clone spec từ parent nếu có
        if (!empty($data['parent_variant_id'])) {
            $parentSpecValues = VariantSpecValue::where('variant_id', $data['parent_variant_id'])->get();
            foreach ($parentSpecValues as $spec) {
                VariantSpecValue::create([
                    'variant_id'    => $variant->id,
                    'spec_id'       => $spec->spec_id,
                    'value_text'    => $spec->value_text,
                    'value_int'     => $spec->value_int,
                    'value_decimal' => $spec->value_decimal,
                    'option_id'     => $spec->option_id,
                ]);
            }
        }

        // 4) Ghi đè spec_values mới nếu có
        if (!empty($data['spec_values'])) {
            foreach ($data['spec_values'] as $sv) {
                VariantSpecValue::where([
                    'variant_id' => $variant->id,
                    'spec_id'    => $sv['spec_id'],
                ])->delete();

                VariantSpecValue::create([
                    'variant_id'    => $variant->id,
                    'spec_id'       => $sv['spec_id'],
                    'value_text'    => $sv['value_text'] ?? null,
                    'value_int'     => $sv['value_int'] ?? null,
                    'value_decimal' => $sv['value_decimal'] ?? null,
                    'option_id'     => $sv['option_id'] ?? null,
                ]);
            }
        }

        $product = $variant->product; // đã quan hệ product
        $baseName = $product->name;

        $specValues = VariantSpecValue::with(['spec_options', 'specification'])
            ->where('variant_id', $variant->id)
            ->get()
            ->filter(function ($sv) {
                return in_array($sv->specification->name, ['Màu sắc', 'RAM', 'Dung lượng bộ nhớ']);
            })
            ->sortBy(function ($sv) {
                $order = ['Màu sắc' => 1, 'RAM' => 2, 'Dung lượng bộ nhớ' => 3];
                return $order[$sv->specification->name] ?? 99;
            })
            ->map(function ($sv) {
                if ($sv->option_id && $sv->spec_options) {
                    return $sv->spec_options->value;
                } elseif (!is_null($sv->value_int)) {
                    return $sv->value_int . 'GB';
                } elseif (!is_null($sv->value_text)) {
                    return $sv->value_text;
                }
                return null;
            })
            ->filter()
            ->values()
            ->all();

        // Nối tên sản phẩm và spec values
        $parts = array_merge(
            [$baseName],
            $specValues ?: []
        );
        $rawSku = implode(' - ', $parts);

        // Chuyển thành slug và uppercase
        $sku = Str::upper(Str::slug($rawSku, '-'));

        // 6) Cập nhật SKU
        $variant->update(['sku' => $sku]);


        return $variant->load(['variantSpecValues.specification', 'variantSpecValues.spec_options']);
    });
}
public function updateVariant(int $variantId, array $data)
{
    return DB::transaction(function () use ($variantId, $data) {
        $variant = Variant::findOrFail($variantId);
        $oldImage = $variant->image;

        // 1) Cập nhật thông tin chính
        $variant->update([
            'price'    => $data['price'] ?? $variant->price,
            'discount' => $data['discount'] ?? $variant->discount,
            'stock'    => $data['stock'] ?? $variant->stock,
            'image'    => $data['image'] ?? $variant->image,
        ]);

        if (!empty($data['image']) && $oldImage && Storage::disk('public')->exists($oldImage)) {
            Storage::disk('public')->delete($oldImage);
        }

        // 2) Nếu có thay đổi spec_values thì cập nhật và regenerate SKU
        if (!empty($data['spec_values'])) {
            // Lọc lại các giá trị hợp lệ giống createVariant
            $data['spec_values'] = array_values(array_filter($data['spec_values'], function ($sv) {
                $hasText = isset($sv['value_text']) && $sv['value_text'] !== '';
                $hasInt = array_key_exists('value_int', $sv) && $sv['value_int'] !== null;
                $hasDecimal = array_key_exists('value_decimal', $sv) && $sv['value_decimal'] !== null;
                $hasOption = isset($sv['option_id']) && $sv['option_id'] !== '';
                return $hasText || $hasInt || $hasDecimal || $hasOption;
            }));

            foreach ($data['spec_values'] as $specValue) {
                VariantSpecValue::where([
                    'variant_id' => $variant->id,
                    'spec_id'    => $specValue['spec_id'],
                ])->delete();

                VariantSpecValue::create([
                    'variant_id'    => $variant->id,
                    'spec_id'       => $specValue['spec_id'],
                    'value_text'    => $specValue['value_text'] ?? null,
                    'value_int'     => $specValue['value_int'] ?? null,
                    'value_decimal' => $specValue['value_decimal'] ?? null,
                    'option_id'     => $specValue['option_id'] ?? null,
                ]);
            }

            // Tạo lại SKU giống createVariant
            $product = $variant->product;
            $baseName = $product->name;

            $specValues = VariantSpecValue::with(['spec_options', 'specification'])
                ->where('variant_id', $variant->id)
                ->get()
                ->filter(function ($sv) {
                    return in_array($sv->specification->name, ['Màu sắc', 'RAM', 'Dung lượng bộ nhớ']);
                })
                ->sortBy(function ($sv) {
                    $order = ['Màu sắc' => 1, 'RAM' => 2, 'Dung lượng bộ nhớ' => 3];
                    return $order[$sv->specification->name] ?? 99;
                })
                ->map(function ($sv) {
                    if ($sv->option_id && $sv->spec_options) {
                        return $sv->spec_options->value;
                    } elseif (!is_null($sv->value_int)) {
                        return $sv->value_int . 'GB';
                    } elseif (!is_null($sv->value_text)) {
                        return $sv->value_text;
                    }
                    return null;
                })
                ->filter()
                ->values()
                ->all();

            $parts = array_merge([$baseName], $specValues ?: []);
            $rawSku = implode(' - ', $parts);
            $sku = Str::upper(Str::slug($rawSku, '-'));

            $variant->update(['sku' => $sku]);
        }

        return $variant->load(['variantSpecValues.specification', 'variantSpecValues.spec_options']);
    });
}

//      public function updateVariant(int $variantId, array $data)
// {
//     return DB::transaction(function () use ($variantId, $data) {
//         $variant = Variant::findOrFail($variantId);
//         $oldImage = $variant->image;

//         // 1) Cập nhật thông tin chính
//         $variant->update([
//             'price'    => $data['price'] ?? $variant->price,
//             'discount' => $data['discount'] ?? $variant->discount,
//             'stock'    => $data['stock'] ?? $variant->stock,
//             'image'    => $data['image'] ?? $variant->image,
//         ]);

//         if (!empty($data['image']) && $oldImage && Storage::disk('public')->exists($oldImage)) {
//             Storage::disk('public')->delete($oldImage);
//         }

//         // 2) Nếu có thay đổi spec_values thì cập nhật và regenerate SKU
//         if (!empty($data['spec_values'])) {
//             // Lọc lại các giá trị hợp lệ giống createVariant
//             $data['spec_values'] = array_values(array_filter($data['spec_values'], function ($sv) {
//                 $hasText = isset($sv['value_text']) && $sv['value_text'] !== '';
//                 $hasInt = array_key_exists('value_int', $sv) && $sv['value_int'] !== null;
//                 $hasDecimal = array_key_exists('value_decimal', $sv) && $sv['value_decimal'] !== null;
//                 $hasOption = isset($sv['option_id']) && $sv['option_id'] !== '';
//                 return $hasText || $hasInt || $hasDecimal || $hasOption;
//             }));

//             foreach ($data['spec_values'] as $specValue) {
//                 VariantSpecValue::where([
//                     'variant_id' => $variant->id,
//                     'spec_id'    => $specValue['spec_id'],
//                 ])->delete();

//                 VariantSpecValue::create([
//                     'variant_id'    => $variant->id,
//                     'spec_id'       => $specValue['spec_id'],
//                     'value_text'    => $specValue['value_text'] ?? null,
//                     'value_int'     => $specValue['value_int'] ?? null,
//                     'value_decimal' => $specValue['value_decimal'] ?? null,
//                     'option_id'     => $specValue['option_id'] ?? null,
//                 ]);
//             }

//             // Lấy lại spec từ DB rồi sinh SKU mới
//             $specValues = VariantSpecValue::with('spec_options')
//                 ->where('variant_id', $variant->id)
//                 ->get();

//             $sku = $this->generateSkuFromSpecFromDB($variant->product_id, $specValues);
//             $variant->update(['sku' => $sku]);
//         }

//         return $variant->load(['variantSpecValues.specification', 'variantSpecValues.spec_options']);
//     });
// }


     public function getVariantsByProduct($productId){
        $variants = Variant::with(['variantSpecValues.specification', 'variantSpecValues.spec_options'])
                        ->where('product_id', $productId)
                        ->get();

        // Thêm thuộc tính img cho từng biến thể
        foreach ($variants as $variant) {
            $variant->image = $variant->image ? asset('storage/' . $variant->image) : null;
        }

    return $variants;
    }

    public function getAllVariants(){
        $variants = Variant::all();
        foreach ($variants as $variant){
            $variant->image = $variant->image ? asset('storage/' . $variant->image) : null;
        }
          return $variants;
    }
    public function getVariantDetail($variantId){
        $variant = Variant::with(['variantSpecValues.specification', 'variantSpecValues.spec_options'])
                        ->findOrFail($variantId);

        $variant->img = $variant->image ? asset('storage/' . $variant->image) : null;

        return $variant;
    }


   

    public function deleteVariant(int $variantId){
        return DB::transaction(function () use ($variantId) {
            $variant = Variant::findOrFail($variantId);

            // Xóa tất cả spec_values liên quan
            VariantSpecValue::where('variant_id', $variant->id)->delete();

            // Xóa variant
            $variant->delete();

            return true;
        });
    }

   
}
