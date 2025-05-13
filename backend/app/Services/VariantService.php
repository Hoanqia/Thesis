<?php

namespace App\Services;

use App\Models\Variant;
use App\Models\VariantSpecValue;
use Illuminate\Support\Facades\DB;

class VariantService
{
    public function createVariant(array $data)
    {
        return DB::transaction(function () use ($data) {
            $variant = Variant::create([
                'product_id' => $data['product_id'],
                'sku'        => $data['sku'],
                'price'      => $data['price'],
                'discount'   => $data['discount'] ?? 0,
                'stock'      => $data['stock'] ?? 0,
            ]);

            if (!empty($data['spec_values'])) {
                foreach ($data['spec_values'] as $specValue) {
                    VariantSpecValue::create([
                        'variant_id'   => $variant->id,
                        'spec_id'      => $specValue['spec_id'],
                        'value_text'   => $specValue['value_text'] ?? null,
                        'value_int'    => $specValue['value_int'] ?? null,
                        'value_decimal'=> $specValue['value_decimal'] ?? null,
                        'option_id'    => $specValue['option_id'] ?? null,
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
