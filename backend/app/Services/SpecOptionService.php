<?php

namespace App\Services;

use App\Models\SpecOption;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class SpecOptionService
{
    public function getAll()
    {
        return SpecOption::with('specification')->get();
    }

    public function getById(int $id): SpecOption
    {
        return SpecOption::with('specification')->findOrFail($id);
    }

    public function create(array $data): SpecOption
    {
        $validated = Validator::make($data, [
            'spec_id' => 'required|exists:specifications,id',
            'value' => [
                'required', 'string', 'max:255',
                function ($attribute, $value, $fail) use ($data) {
                    if (isset($data['spec_id'])) {
                        $exists = SpecOption::where('spec_id', $data['spec_id'])
                            ->where('value', $value)
                            ->exists();
                        if ($exists) {
                            $fail('Giá trị này đã tồn tại trong thuộc tính.');
                        }
                    }
                },
            ],
        ])->validate();

        return SpecOption::create($validated);
    }

    public function update(int $id, array $data): SpecOption
    {
        $option = SpecOption::findOrFail($id);

        $validated = Validator::make($data, [
            'spec_id' => 'exists:specifications,id',
            'value' => [
                'string', 'max:255',
                function ($attribute, $value, $fail) use ($data, $option) {
                    $specId = $data['spec_id'] ?? $option->spec_id;
                    if (SpecOption::where('spec_id', $specId)
                        ->where('value', $value)
                        ->where('id', '!=', $option->id)
                        ->exists()) {
                        $fail('Giá trị này đã tồn tại trong thuộc tính.');
                    }
                },
            ],
        ])->validate();

        $option->update($validated);
        return $option;
    }

    public function delete(int $id): void
    {
        $option = SpecOption::findOrFail($id);
        $option->delete();
    }

    public function getBySpecId(int $specId)
    {
        return SpecOption::where('spec_id', $specId)->get();
    }
    
}
