<?php

namespace App\Services;

use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Model;

class SlugService
{
    /**
     * Generate a unique slug for a model's column.
     *
     * @param string $name         Tên gốc (sẽ chuyển thành slug)
     * @param string $modelClass   Tên class Model (VD: Brand::class)
     * @param string $column       Tên cột slug trong DB (mặc định là 'slug')
     * @return string              Slug không trùng
     */
    public static function createSlug(string $name, string $modelClass, string $column = 'slug'): string
    {
        $slug = Str::slug($name);
        $baseSlug = $slug;
        $i = 1;

        while ($modelClass::where($column, $slug)->exists()) {
            $slug = $baseSlug . '-' . $i++;
        }

        return $slug;
    }
}
