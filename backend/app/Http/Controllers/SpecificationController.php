<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\SpecificationService;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;

class SpecificationController extends Controller
{
    protected $specificationService;

    public function __construct(SpecificationService $specificationService)
    {
        $this->specificationService = $specificationService;
    }

    public function store(Request $request)
    {
        try {
            $spec = $this->specificationService->create($request->all());

            return response()->json([
                'message' => 'Thêm thuộc tính thành công',
                'status' => 'success',
                'data' => $spec,
            ], 201);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function index(Request $request)
    {
        try {
            $specs = $request->filled('category_id')
                ? $this->specificationService->getAll($request->category_id)
                : $this->specificationService->getAll();

            if ($specs->isEmpty()) {
                return response()->json([
                    'message' => 'Không có thuộc tính',
                    'status' => 'success',
                ], 204);
            }

            return response()->json([
                'message' => 'Lấy danh sách thuộc tính thành công',
                'status' => 'success',
                'data' => $specs,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function get($id)
    {
        try {
            $spec = $this->specificationService->getById($id);

            return response()->json([
                'message' => 'Lấy thuộc tính thành công',
                'status' => 'success',
                'data' => $spec,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
    public function search(Request $request)
    {
        try {
            $request->validate([
                'keyword' => 'required|string',
                'category_id' => 'nullable|integer|exists:categories,id',
            ]);

            $keyword = $request->input('keyword');
            $categoryId = $request->input('category_id');

            $specs = $this->specService->searchByName($keyword, $categoryId);

            if ($specs->isEmpty()) {
                return response()->json([
                    'message' => 'Không tìm thấy specification nào',
                    'status' => 'success',
                    'data' => [],
                ], 204);
            }

            return response()->json([
                'message' => 'Tìm kiếm thành công',
                'status' => 'success',
                'data' => $specs,
            ], 200);

        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
    public function edit($id, Request $request)
    {
        try {
            $spec = $this->specificationService->update($id, $request->all());

            return response()->json([
                'message' => 'Cập nhật thuộc tính thành công',
                'status' => 'success',
                'data' => $spec,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function destroy($id)
    {
        try {
            $this->specificationService->delete($id);

            return response()->json([
                'message' => 'Xoá thuộc tính thành công',
                'status' => 'success',
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
}
