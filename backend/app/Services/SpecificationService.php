<?php

namespace App\Services;

use App\Models\Specification;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class SpecificationService
{
    /**
     * Tạo mới một specification
     */
    public function create(array $data): Specification
    {
        $validated = Validator::make($data, [
            'category_id' => 'required|exists:categories,id',
            'name' => [
                'required',
                'string',
                // Không cho phép trùng tên trong cùng category
                function ($attribute, $value, $fail) use ($data) {
                    if (Specification::where('category_id', $data['category_id'])
                        ->where('name', $value)
                        ->exists()) {
                        $fail("Tên thuộc tính đã tồn tại trong danh mục này.");
                    }
                }
            ],
            'data_type' => 'required|in:int,decimal,text,option',
            'unit' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'options' => 'sometimes|array',
            'options.*' => 'string',
        ])->validate();
        $spec = Specification::create($validated);

         if ($validated['data_type'] === 'option' && !empty($validated['options'])) {
            foreach ($validated['options'] as $value) {
                $spec->spec_options()->create([
                    'value' => $value,
                ]);
            }
        }
        return $spec;
    }

    /**
     * Lấy tất cả specification theo category (hoặc toàn bộ)
     */
    public function getAll(?int $categoryId = null)
    {
        $query = Specification::with('spec_options');

        if ($categoryId) {
            $query->where('category_id', $categoryId);
        }

        return $query->get();
    }

    /**
     * Tìm theo ID
     */
    public function getById(int $id): ?Specification
    {
        return Specification::with('spec_options')->findOrFail($id);
    }

    /**
     * Cập nhật specification
     */
    public function update(int $id, array $data): Specification
    {
        $spec = Specification::findOrFail($id);

        $validated = Validator::make($data, [
            'category_id' => 'exists:categories,id',
            'name' => [
                'string',
                function ($attribute, $value, $fail) use ($data, $id, $spec) {
                    $categoryId = $data['category_id'] ?? $spec->category_id;
                    if (Specification::where('category_id', $categoryId)
                        ->where('name', $value)
                        ->where('id', '!=', $id)
                        ->exists()) {
                        $fail("Tên thuộc tính đã tồn tại trong danh mục này.");
                    }
                }
            ],
            'data_type' => 'in:int,decimal,text,option',
            'unit' => 'nullable|string|max:50',
            'description' => 'nullable|string',
        ])->validate();

        $spec->update($validated);
        return $spec;
    }

    /**
     * Xoá specification
     */
    public function delete(int $id): bool
    {
        $spec = Specification::findOrFail($id);
        return $spec->delete();
    }

    public function searchByName(string $keyword, ?int $categoryId = null){
        $query = Specification::with('spec_options')
            ->where(function ($q) use ($keyword) {
                // Tìm specification name giống keyword
                $q->where('name', 'like', '%' . $keyword . '%')
                // hoặc tìm theo brand name liên kết qua category
                ->orWhereHas('category.brand', function ($q2) use ($keyword) {
                    $q2->where('name', 'like', '%' . $keyword . '%');
                });
            });

        if ($categoryId) {
            $query->where('category_id', $categoryId);
        }

        return $query->get();
    }


}
