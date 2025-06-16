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
}
