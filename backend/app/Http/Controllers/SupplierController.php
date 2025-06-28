<?php

// app/Http/Controllers/SupplierController.php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use App\Services\SupplierService;
use App\Exceptions\ApiExceptionHandler;

class SupplierController extends Controller
{
    protected SupplierService $service;

    public function __construct(SupplierService $service)
    {
        $this->service = $service;
    }

    /**
     * GET /api/suppliers
     */
    public function index(): JsonResponse
    {
        try {
            $suppliers = $this->service->getAll();
            return response()->json([
                'message' => 'Lấy danh sách nhà cung cấp thành công',
                'status'  => 'success',
                'data'    => $suppliers
            ], Response::HTTP_OK);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * GET /api/suppliers/{id}
     */
    public function show(int $id): JsonResponse
    {
        try {
            $supplier = $this->service->getById($id);
            return response()->json([
                'message' => 'Lấy thông tin nhà cung cấp thành công',
                'status'  => 'success',
                'data'    => $supplier
            ], 200);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * POST /api/suppliers
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
                'name'    => 'required|string|max:255',
                'phone'   => 'required|string|max:50|unique:suppliers,phone',
                'address' => 'nullable|string',
            ]);

            $supplier = $this->service->create($data);

            return response()->json([
                'message' => 'Tạo nhà cung cấp thành công',
                'status'  => 'success',
                'data'    => $supplier
            ], 201);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * PUT/PATCH /api/suppliers/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $data = $request->validate([
                'name'    => 'required|string|max:255',
                'phone'   => "required|string|max:50|unique:suppliers,phone,{$id}",
                'address' => 'nullable|string',
            ]);

            $supplier = $this->service->update($id, $data);

            return response()->json([
                'message' => 'Cập nhật nhà cung cấp thành công',
                'status'  => 'success',
                'data'    => $supplier
            ], 200);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * DELETE /api/suppliers/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $this->service->delete($id);

            return response()->json([
                'message' => 'Xóa nhà cung cấp thành công',
                'status'  => 'success'
            ], 200);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }



     // --- Các hàm Controller cho VariantsFromSupplier ---

    /**
     * GET /api/suppliers/{supplierId}/variants
     * Lấy tất cả biến thể sản phẩm của một nhà cung cấp.
     */
    public function getSupplierVariants(int $supplierId): JsonResponse
    {
        try {
            $variants = $this->service->getSupplierVariants($supplierId);
            return response()->json([
                'message' => 'Lấy danh sách biến thể sản phẩm của nhà cung cấp thành công',
                'status'  => 'success',
                'data'    => $variants
            ], Response::HTTP_OK);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * GET /api/suppliers/{supplierId}/variants/{variantFromSupplierId}
     * Lấy thông tin chi tiết một biến thể sản phẩm cụ thể từ nhà cung cấp.
     */
    public function showSupplierVariant(int $supplierId, int $variantFromSupplierId): JsonResponse
    {
        try {
            $variant = $this->service->getSupplierVariantById($supplierId, $variantFromSupplierId);
            return response()->json([
                'message' => 'Lấy thông tin biến thể sản phẩm của nhà cung cấp thành công',
                'status'  => 'success',
                'data'    => $variant
            ], Response::HTTP_OK);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * POST /api/suppliers/{supplierId}/variants
     * Thêm một biến thể sản phẩm vào danh mục của nhà cung cấp.
     */
    public function addVariantToSupplier(Request $request, int $supplierId): JsonResponse
    {
        try {
            $data = $request->validate([
                'variant_id'           => 'required|integer|exists:product_variants,id',
                'current_purchase_price' => 'nullable|numeric|min:0',
            ]);

            $variantFromSupplier = $this->service->addVariantToSupplier($supplierId, $data);

            return response()->json([
                'message' => 'Thêm biến thể sản phẩm vào nhà cung cấp thành công',
                'status'  => 'success',
                'data'    => $variantFromSupplier
            ], Response::HTTP_CREATED);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * PUT/PATCH /api/suppliers/{supplierId}/variants/{variantFromSupplierId}
     * Cập nhật thông tin biến thể sản phẩm của nhà cung cấp.
     */
    public function updateSupplierVariant(Request $request, int $supplierId, int $variantFromSupplierId): JsonResponse
    {
        try {
            $data = $request->validate([
                'variant_supplier_sku' => 'nullable|string|max:255',
                'current_purchase_price' => 'required|numeric|min:0',
                'is_active'            => 'boolean',
                // variant_id không nên được cập nhật trực tiếp qua API này vì nó là unique key với supplier_id
            ]);

            $variantFromSupplier = $this->service->updateSupplierVariant($supplierId, $variantFromSupplierId, $data);

            return response()->json([
                'message' => 'Cập nhật biến thể sản phẩm của nhà cung cấp thành công',
                'status'  => 'success',
                'data'    => $variantFromSupplier
            ], Response::HTTP_OK);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function updateSupplierVariants(Request $request, int $supplierId){
        try {
              $payload = $request->input('variants');
                $upserted =   $this->service->upsertVariantsForSupplier($supplierId,$payload);
                return response()->json([
                    'message' => 'update thành công',
                    'status' => 'success',
                    'data' => $payload,
                ],200);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
      
    }
    /**
     * DELETE /api/suppliers/{supplierId}/variants/{variantFromSupplierId}
     * Xóa một biến thể sản phẩm khỏi danh mục của nhà cung cấp.
     */
    public function removeVariantFromSupplier(int $supplierId, int $variantFromSupplierId): JsonResponse
    {
        try {
            $this->service->removeVariantFromSupplier($supplierId, $variantFromSupplierId);

            return response()->json([
                'message' => 'Xóa biến thể sản phẩm khỏi nhà cung cấp thành công',
                'status'  => 'success'
            ], Response::HTTP_OK);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
    public function setDefautVariantFromSupplier(int $variantFromSupplierId): JsonResponse{
        try {
            $this->service->setDefault($variantFromSupplierId);
            return response()->json([
                'message' => 'Cập nhật trạng thái mặc định thành công',
                'status'  => 'success'
            ], Response::HTTP_OK);
        }catch(\Exception $e){
            return ApiExceptionHandler::handleException($e);
        }
    }
}
