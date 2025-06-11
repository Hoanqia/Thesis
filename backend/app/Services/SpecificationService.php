<?php

namespace App\Services;

use App\Models\Specification;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use App\Models\VariantSpecValue;
class SpecificationService
{
    /**
     * Lấy danh sách gợi ý giá trị text cho một specification
     *
     * @param  int     $spec_id
     * @param  string  $query
     * @return string[]
     *
     * @throws ValidationException
     */
    public function fetchSpecValuesSuggestions($spec_id, $query)
    {
        // 1. Validate đầu vào
        $validator = Validator::make([
            'spec_id' => $spec_id,
            'query'   => $query,
        ], [
            'spec_id' => 'required|integer|exists:specifications,id',
            'query'   => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        // 2. Kiểm tra specification có phải là text không
        $spec = Specification::findOrFail($spec_id);
        if ($spec->data_type !== 'text') {
            // Nếu không phải text, trả về mảng rỗng
            return [];
        }

        // 3. Query distinct value_text từ bảng variant_spec_values
        $suggestions = VariantSpecValue::query()
            ->where('spec_id', $spec_id)
            ->whereNotNull('value_text')
            ->where('value_text', 'like', '%' . $query . '%')
            ->distinct()
            ->orderBy('value_text')
            ->limit(10)
            ->pluck('value_text')
            ->toArray();

        return $suggestions;
    }
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

         $options = $data['options'] ?? [];
        unset($validated['options']);

        $spec = Specification::create($validated);

        //  if ($validated['data_type'] === 'option' && !empty($validated['options'])) {
        //     foreach ($validated['options'] as $value) {
        //         $spec->spec_options()->create([
        //             'value' => $value,
        //         ]);
        //     }
        // }
        if ($spec->data_type === 'option' && !empty($options)) {
            foreach ($options as $value) {
                $spec->spec_options()->create(['value' => $value]);
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
            'options' => 'nullable|array',
            'options.*' => 'string|max:255',
        ])->validate();

        $spec->update($validated);

        if ($spec->data_type === 'option') {
            $newOptions = $data['options'] ?? [];
            $newValues = collect($newOptions)->map(fn($v) => trim($v))->filter()->unique()->values();
            $currentOptions = $spec->spec_options()->get();

            // Xóa các options không còn nữa nếu không bị dùng
            foreach ($currentOptions as $option) {
                if (!$newValues->contains($option->value)) {
                    $isUsed = \App\Models\VariantSpecValue::where('option_id', $option->id)->exists();
                    if (!$isUsed) {
                        $option->delete();
                    }
                }
            }

            // Thêm option mới nếu chưa có
            foreach ($newValues as $value) {
                if (!$currentOptions->contains('value', $value)) {
                    $spec->spec_options()->create(['value' => $value]);
                }
            }
        }

        return $spec->load('spec_options');
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
