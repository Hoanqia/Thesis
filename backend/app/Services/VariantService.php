<?php

namespace App\Services;

use App\Models\Variant;
use App\Models\VariantSpecValue;
use Illuminate\Support\Facades\DB;

class VariantService
{
    // public function createVariant(array $data)
    // {
    //     return DB::transaction(function () use ($data) {
    //         $variant = Variant::create([
    //             'product_id' => $data['product_id'],
    //             'sku'        => $data['sku'],
    //             'price'      => $data['price'],
    //             'discount'   => $data['discount'] ?? 0,
    //             'stock'      => $data['stock'] ?? 0,
    //         ]);

    //         if (!empty($data['spec_values'])) {
    //             foreach ($data['spec_values'] as $specValue) {
    //                 VariantSpecValue::create([
    //                     'variant_id'   => $variant->id,
    //                     'spec_id'      => $specValue['spec_id'],
    //                     'value_text'   => $specValue['value_text'] ?? null,
    //                     'value_int'    => $specValue['value_int'] ?? null,
    //                     'value_decimal'=> $specValue['value_decimal'] ?? null,
    //                     'option_id'    => $specValue['option_id'] ?? null,
    //                 ]);
    //             }
    //         }

    //         return $variant->load(['variantSpecValues.specification', 'variantSpecValues.spec_options']);
    //     });
    // }
    public function createVariant(array $data){
        return DB::transaction(function () use ($data) {
            $variant = Variant::create([
                'product_id' => $data['product_id'],
                'sku'        => $data['sku'],
                'price'      => $data['price'],
                'discount'   => $data['discount'] ?? 0,
                'stock'      => $data['stock'] ?? 0,
            ]);

            // Nếu có parent_variant_id thì clone spec_values từ đó
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

            // Nếu truyền thêm spec_values để ghi đè (VD: màu khác)
            if (!empty($data['spec_values'])) {
                foreach ($data['spec_values'] as $specValue) {
                    // Xóa spec cũ cùng spec_id nếu đã clone ở trên
                    VariantSpecValue::where([
                        'variant_id' => $variant->id,
                        'spec_id' => $specValue['spec_id'],
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
            }

            return $variant->load(['variantSpecValues.specification', 'variantSpecValues.spec_options']);
        });
    }

    public function getVariantsByProduct($productId)
    {
        return Variant::with(['variantSpecValues.specification', 'variantSpecValues.spec_options'])
                      ->where('product_id', $productId)
                      ->get();
    }

    public function getVariantDetail($variantId)
    {
        return Variant::with(['variantSpecValues.specification', 'variantSpecValues.spec_options'])
                      ->findOrFail($variantId);
    }
    
}
