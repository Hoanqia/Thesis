<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RecommenderSetting extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'recommender_settings'; // Tên bảng mà model này tương ứng

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'key',         // Tên tham số (ví dụ: TOP_K)
        'value',       // Giá trị của tham số (ví dụ: 10, 0.5)
        'data_type',   // Kiểu dữ liệu của tham số (ví dụ: integer, float, string)
        'description', // Mô tả tham số
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        // Bạn có thể thêm các quy tắc cast ở đây nếu muốn tự động chuyển đổi kiểu dữ liệu
        // Ví dụ: 'value' => 'string' (đã là string mặc định),
        // Hoặc nếu 'value' có thể là JSON: 'value' => 'array' (cần đảm bảo dữ liệu trong DB là JSON hợp lệ)
    ];

    /**
     * Get a setting value, casting it to the correct type.
     *
     * @param string $key
     * @return mixed|null
     */
    public static function getValueByKey(string $key)
    {
        $setting = self::where('key', $key)->first();

        if (!$setting) {
            return null;
        }

        switch ($setting->data_type) {
            case 'integer':
                return (int) $setting->value;
            case 'float':
                return (float) $setting->value;
            case 'boolean':
                return (bool) $setting->value;
            case 'json':
                return json_decode($setting->value, true);
            default:
                return $setting->value;
        }
    }

    /**
     * Update a setting value.
     *
     * @param string $key
     * @param mixed $newValue
     * @return bool
     */
    public static function updateValueByKey(string $key, $newValue): bool
    {
        $setting = self::where('key', $key)->first();

        if (!$setting) {
            return false; // Setting not found
        }

        // Convert complex types to string/JSON before saving
        if (is_array($newValue) || is_object($newValue)) {
            $newValue = json_encode($newValue);
        }

        $setting->value = (string) $newValue; // Ensure it's saved as a string
        return $setting->save();
    }
}

