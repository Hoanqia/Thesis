<?php

namespace App\Http\Controllers;

use App\Services\VariantService;
use Illuminate\Http\Request;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;

use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Illuminate\Support\Facades\Storage;

use Illuminate\Http\UploadedFile;
use App\Models\Variant;
use Image;
class VariantController extends Controller
{
    protected $variantService;

    public function __construct(VariantService $variantService)
    {
        $this->variantService = $variantService;
    }

   public function store(Request $request){
                        \Log::info('All request input:', $request->all());
        try {
            $validated = $request->validate([
                'product_id' => 'required|exists:products,id',
                // 'sku'        => 'nullable',
                // 'price'      => 'nullable|numeric|min:0',
                // 'discount'   => 'nullable|numeric|min:0',
                // 'stock'      => 'nullable|integer|min:0',
                'parent_variant_id' => 'nullable|exists:product_variants,id',
                'profit_percent' => 'required|numeric|min:0',
                'spec_values' => 'nullable|array',
                'spec_values.*.spec_id' => 'required|exists:specifications,id',
                'spec_values.*.option_id' => 'nullable|exists:spec_options,id',
                'spec_values.*.value_text' => 'nullable|string',
                'spec_values.*.value_int' => 'nullable|integer',
                'spec_values.*.value_decimal' => 'nullable|numeric',
                'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048', // validate ảnh

            ]);
            if ($request->hasFile('image')) {
                $image = $request->file('image');
                $imageName = time() . '_' . $image->getClientOriginalName();
                $image->storeAs('uploads/variants', $imageName, 'public');
                $validated['image'] = 'uploads/variants/' . $imageName;
            }

                    // Gọi service xử lý
            $variant = $this->variantService->createVariant($validated);

            return response()->json([
                'message' => 'Tạo biến thể thành công',
                'status' => 'success',
                'data' => $variant,
            ], 201);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function getAll(){
        try {
            $variants = $this->variantService->getAllVariants();
            return response()->json([
                'message' => 'Lấy dữ liệu thành công',
                'status' => 'success',
                'data' => $variants,
            ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
    }
    public function getByProduct($productId)
    {
        try {
            $variants = $this->variantService->getVariantsByProduct($productId);

            return response()->json([
                'message' => 'Lấy danh sách biến thể thành công',
                'status' => 'success',
                'data' => $variants,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function get($variantId)
    {
        try {
            $variant = $this->variantService->getVariantDetail($variantId);

            return response()->json([
                'message' => 'Lấy chi tiết biến thể thành công',
                'status' => 'success',
                'data' => $variant,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function update(Request $request, $variantId){
            \Log::info('All request input:', $request->all());
        \Log::info('Spec values:', ['data' => $request->input('spec_values') ?? []]);
        try {
            $validated = $request->validate([
                // 'price'      => 'nullable|numeric|min:0',
                // 'discount'   => 'nullable|numeric|min:0',
                // 'stock'      => 'nullable|integer|min:0',
                    'status' => 'nullable',
                    'spec_values' => 'array',
                    'spec_values.*.spec_id' => 'required|exists:specifications,id',
                    'spec_values.*.value_text' => 'nullable|string',
                    'spec_values.*.value_int' => 'nullable|integer',
                    'spec_values.*.value_decimal' => 'nullable|numeric',
                    'spec_values.*.option_id' => 'nullable|exists:spec_options,id',

                            ]);
             if ($request->hasFile('image')) {
                $image = $request->file('image');
                $imageName = time() . '_' . $image->getClientOriginalName();
                $image->storeAs('uploads/variants', $imageName, 'public');
                $validated['image'] = 'uploads/variants/' . $imageName;
            }
            $variant = $this->variantService->updateVariant($variantId, $validated);

            return response()->json([
                'message' => 'Cập nhật biến thể thành công',
                'status' => 'success',
                'data' => $variant,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function destroy($variantId){
        try {
            $this->variantService->deleteVariant($variantId);

            return response()->json([
                'message' => 'Xóa biến thể thành công',
                'status' => 'success',
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function getSpecValuesByVariantId($variantId){
    try {
        // Check biến thể có tồn tại hay không (nếu có model Variant)
        $variant = Variant::findOrFail($variantId);

        $specValues = $this->variantService->showSpecValues($variantId);

        return response()->json([
            'message' => 'Lấy dữ liệu thành công',
            'status' => 'success',
            'data' => $specValues,
        ], 200);
    } catch (ModelNotFoundException $e) {
        return response()->json([
            'message' => 'Không tìm thấy biến thể',
            'status' => 'error',
        ], 404);
    } catch (\Exception $e) {
        return ApiExceptionHandler::handleException($e);
    }
}
}
