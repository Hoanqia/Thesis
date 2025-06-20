<?php

// app/Services/SupplierService.php

namespace App\Services;

use App\Models\Supplier;
use App\Models\VariantFromSupplier;
use Illuminate\Database\Eloquent\Collection;

class SupplierService
{
    /**
     * Get all suppliers.
     *
     * @return Collection
     */
    public function getAll(): Collection
    {
        return Supplier::all();
    }

    /**
     * Get a supplier by ID.
     *
     * @param  int  $id
     * @return Supplier
     */
    public function getById(int $id): Supplier
    {
        return Supplier::findOrFail($id);
    }

    /**
     * Create a new supplier.
     *
     * @param  array  $data
     * @return Supplier
     */
    public function create(array $data): Supplier
    {
        return Supplier::create($data);
    }

    /**
     * Update an existing supplier.
     *
     * @param  int    $id
     * @param  array  $data
     * @return Supplier
     */
    public function update(int $id, array $data): Supplier
    {
        $supplier = $this->getById($id);
        $supplier->update($data);
        return $supplier;
    }

    /**
     * Delete a supplier.
     *
     * @param  int  $id
     * @return bool|null
     */
    public function delete(int $id): ?bool
    {
        $supplier = $this->getById($id);
        return $supplier->delete();
    }



    // --- Các hàm liên quan đến VariantFromSupplier ---

    /**
     * Get all variants supplied by a specific supplier.
     *
     * @param  int  $supplierId
     * @return Collection
     * @throws ModelNotFoundException
     */
    public function getSupplierVariants(int $supplierId): Collection
    {
        // Kiểm tra xem nhà cung cấp có tồn tại không
        $this->getById($supplierId);

        return VariantFromSupplier::where('supplier_id', $supplierId)
                                  ->with('variant') // Tải biến thể sản phẩm liên quan
                                  ->get();
    }

    /**
     * Get a specific variant from a supplier.
     *
     * @param  int  $supplierId
     * @param  int  $variantFromSupplierId ID của bản ghi trong bảng variants_from_supplier
     * @return VariantFromSupplier
     * @throws ModelNotFoundException
     */
    public function getSupplierVariantById(int $supplierId, int $variantFromSupplierId): VariantFromSupplier
    {
        // Kiểm tra xem bản ghi có thuộc về nhà cung cấp này không
        return VariantFromSupplier::where('supplier_id', $supplierId)
                                  ->where('id', $variantFromSupplierId)
                                  ->with('variant')
                                  ->firstOrFail();
    }





    /**
     * Add a product variant to a supplier's offerings.
     *
     * @param  int    $supplierId
     * @param  array  $data (chứa 'variant_id', 'variant_supplier_sku', 'current_purchase_price', 'is_active')
     * @return VariantFromSupplier
     * @throws \Exception nếu biến thể đã tồn tại cho nhà cung cấp này
     */
    public function addVariantToSupplier(int $supplierId, array $data): VariantFromSupplier
    {
        // Kiểm tra xem nhà cung cấp có tồn tại không
        $this->getById($supplierId);

        // Đảm bảo variant_id được truyền vào
        if (!isset($data['variant_id'])) {
            throw new \InvalidArgumentException('Variant ID is required to add a variant to a supplier.');
        }

        // Kiểm tra xem biến thể đã tồn tại cho nhà cung cấp này chưa để tránh duplicate unique key
        $existingVariant = VariantFromSupplier::where('supplier_id', $supplierId)
                                             ->where('variant_id', $data['variant_id'])
                                             ->first();
        if ($existingVariant) {
            throw new \Exception('Product variant already exists for this supplier.');
        }

        // Tạo bản ghi mới
        return VariantFromSupplier::create([
            'supplier_id' => $supplierId,
            'variant_id' => $data['variant_id'],
            'current_purchase_price' => $data['current_purchase_price'] ?? 0,
        ]);
    }


    public function addVariantsToSupplier(int $supplierId, array $variantsData): array
    {
        $supplier = Supplier::find($supplierId);
        if(!$supplier){
            throw new \Exception("Not found: " . $supplierId);
        }

        $createdVariants = [];
        $errors = [];

        foreach ($variantsData as $index => $variantData) {
            try {
                // Sử dụng hàm addVariantToSupplier đã có để xử lý từng biến thể
                $createdVariants[] = $this->addVariantToSupplier($supplierId, $variantData);
            } catch (\InvalidArgumentException $e) {
                $errors[] = "Error at index {$index} (variant_id: " . ($variantData['variant_id'] ?? 'N/A') . "): " . $e->getMessage();
            } catch (\Exception $e) {
                // Bắt các ngoại lệ cụ thể từ addVariantToSupplier
                $errors[] = "Error at index {$index} (variant_id: " . ($variantData['variant_id'] ?? 'N/A') . "): " . $e->getMessage();
            }
        }

        if (!empty($errors)) {
            // Bạn có thể chọn cách xử lý lỗi ở đây:
            // 1. Ném một ngoại lệ tổng hợp chứa tất cả các lỗi.
            // 2. Trả về một mảng chứa cả các biến thể thành công và các lỗi.
            // Dưới đây là ví dụ về cách ném ngoại lệ nếu có lỗi.
            throw new \Exception("Some variants could not be added: " . implode("\n - ", $errors));
        }

        return $createdVariants;
    }


    /**
     * Update a specific product variant from a supplier's offerings.
     *
     * @param  int    $supplierId
     * @param  int    $variantFromSupplierId ID của bản ghi trong bảng variants_from_supplier
     * @param  array  $data (có thể chứa 'variant_supplier_sku', 'current_purchase_price', 'is_active')
     * @return VariantFromSupplier
     * @throws ModelNotFoundException
     */
    public function updateSupplierVariant(int $supplierId, int $variantFromSupplierId, array $data): VariantFromSupplier
    {
        $variantFromSupplier = $this->getSupplierVariantById($supplierId, $variantFromSupplierId);
        $variantId = $variantFromSupplier->variant_id; // ✅ Thêm dòng này
        
        $existing = VariantFromSupplier::where('supplier_id', $supplierId)
                    ->where('variant_id', $variantId)
                    ->first();
        if($existing){
            $existing->current_purchase_price = $data['current_purchase_price'];
              if (array_key_exists('variant_supplier_sku', $data)) {
                        $existing->variant_supplier_sku = $data['variant_supplier_sku'];
                    }
                    if (array_key_exists('is_active', $data)) {
                        $existing->is_active = $data['is_active'];
                    }
                            $existing->save();
        }
        // $variantFromSupplier->update($data);
        return $existing;
    }


     public function upsertVariantsForSupplier(int $supplierId, array $variantsData): array
    {
        $supplier = Supplier::find($supplierId);
        if (!$supplier) {
            throw new \Exception("Nhà cung cấp với ID {$supplierId} không tồn tại.");
        }

        // Loại bỏ các payload trùng variant_id trong input
        $unique = [];
        foreach ($variantsData as $item) {
            $unique[$item['variant_id']] = $item;
        }

        $results = [];

        DB::transaction(function () use ($supplierId, $unique, &$results) {
            foreach ($unique as $variantId => $data) {
                // Tìm bản ghi đã tồn tại
                $existing = VariantFromSupplier::where('supplier_id', $supplierId)
                    ->where('variant_id', $variantId)
                    ->first();

                if ($existing) {
                    // Cập nhật
                    $existing->current_purchase_price = $data['current_purchase_price'];
                    if (array_key_exists('variant_supplier_sku', $data)) {
                        $existing->variant_supplier_sku = $data['variant_supplier_sku'];
                    }
                    if (array_key_exists('is_active', $data)) {
                        $existing->is_active = $data['is_active'];
                    }
                    $existing->save();
                    $results[] = $existing;
                } else {
                    // Tạo mới
                    $new = VariantFromSupplier::create([
                        'supplier_id'           => $supplierId,
                        'variant_id'            => $variantId,
                        'current_purchase_price'=> $data['current_purchase_price'],
                    ]);
                    $results[] = $new;
                }
            }
        });

        return $results;
    }

    /**
     * Remove a product variant from a supplier's offerings.
     *
     * @param  int  $supplierId
     * @param  int  $variantFromSupplierId ID của bản ghi trong bảng variants_from_supplier
     * @return bool|null
     * @throws ModelNotFoundException
     */
    public function removeVariantFromSupplier(int $supplierId, int $variantFromSupplierId): ?bool
    {
        $variantFromSupplier = $this->getSupplierVariantById($supplierId, $variantFromSupplierId);
        return $variantFromSupplier->delete();
    }
}