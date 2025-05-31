<?php

namespace App\Services;

use App\Models\Variant;
use App\Models\SpecOption;

use App\Models\VariantSpecValue;
use Illuminate\Support\Facades\DB;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;

class VariantService
{   

     public function showSpecValues($variantId){
            return VariantSpecValue::where('variant_id', $variantId)
           ->get();     
    }
    private function generateSkuFromSpec(array $data): string{
        $sku = 'V' . $data['product_id'];

        if (!empty($data['spec_values'])) {
            foreach ($data['spec_values'] as $spec) {
                if (!empty($spec['value_text'])) {
                    $sku .= '-' . strtoupper(substr($spec['value_text'], 0, 3));
                } elseif (!empty($spec['value_int'])) {
                    $sku .= '-' . $spec['value_int'];
                } elseif (!empty($spec['value_decimal'])) {
                    $sku .= '-' . str_replace('.', '', $spec['value_decimal']);
                } elseif (!empty($spec['option_id'])) {
                    $option = SpecOption::find($spec['option_id']);
                    if ($option) {
                        $sku .= '-' . strtoupper(substr($option->name, 0, 3));
                    }
                }
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

            $sku = $this->generateSkuFromSpec($data);
            $variant = Variant::create([
                'product_id' => $data['product_id'],
                'sku'        => $sku,
                'price'      => $data['price'],
                'discount'   => $data['discount'] ?? 0,
                'stock'      => $data['stock'] ?? 0,
                'image'      => $data['image'] ?? null,

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


    public function getVariantDetail($variantId){
        $variant = Variant::with(['variantSpecValues.specification', 'variantSpecValues.spec_options'])
                        ->findOrFail($variantId);

        $variant->img = $variant->image ? asset('storage/' . $variant->image) : null;

        return $variant;
    }


    public function updateVariant(int $variantId, array $data){
        return DB::transaction(function () use ($variantId, $data) {
            $variant = Variant::findOrFail($variantId);
            
            
            // Nếu cần cập nhật SKU dựa theo spec_values mới, tạo lại SKU
            if (!empty($data['spec_values'])) {
                $data['sku'] = $this->generateSkuFromSpec(array_merge(['product_id' => $variant->product_id], $data));
            }

         
           $oldImage = $variant->image;

            // Cập nhật thông tin chính của variant
            $variant->update([
                'sku'      => $data['sku'] ?? $variant->sku,
                'price'    => $data['price'] ?? $variant->price,
                'discount' => $data['discount'] ?? $variant->discount,
                'stock'    => $data['stock'] ?? $variant->stock,
                'image' => $data['image'] ?? $variant->image,

            ]);
               if (!empty($data['image']) && $oldImage && Storage::disk('public')->exists($variant->image)) {
                Storage::disk('public')->delete($oldImage);
            }
            // Cập nhật spec_values nếu có
            if (!empty($data['spec_values'])) {
                foreach ($data['spec_values'] as $specValue) {
                    // Xóa spec cũ cùng spec_id nếu có
                    VariantSpecValue::where([
                        'variant_id' => $variant->id,
                        'spec_id' => $specValue['spec_id'],
                    ])->delete();

                    // Tạo spec_value mới
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
