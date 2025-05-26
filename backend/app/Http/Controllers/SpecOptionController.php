<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\SpecOptionService;
use Illuminate\Http\Request;
use App\Exceptions\ApiExceptionHandler;
use Illuminate\Support\Facades\Log;

class SpecOptionController extends Controller
{
    protected $specOptionService;

    public function __construct(SpecOptionService $specOptionService)
    {
        $this->specOptionService = $specOptionService;
    }

    /**
     * Lấy tất cả option theo spec_id
     */
    public function index($specId,Request $request)
    {
        try {
            // $specId = $request->query('spec_id');
            $options = $this->specOptionService->getAll($specId);

            return response()->json([
                'message' => 'Lấy danh sách thành công',
                'status' => 'success',
                'data' => $options
            ], 200);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Lấy chi tiết 1 option theo ID
     */
    public function get($id)
    {
        try {
            $option = $this->specOptionService->getById($id);

            return response()->json([
                'message' => 'Lấy chi tiết thành công',
                'status' => 'success',
                'data' => $option
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Tạo mới option
     */
    public function store(Request $request)
    {
        try {
            $option = $this->specOptionService->create($request->all());

            return response()->json([
                'message' => 'Tạo mới thành công',
                'status' => 'success',
                'data' => $option
            ], 201);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Cập nhật option
     */
    public function update($id, Request $request)
    {
        try {
            $option = $this->specOptionService->update($id, $request->all());

            return response()->json([
                'message' => 'Cập nhật thành công',
                'status' => 'success',
                'data' => $option
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    /**
     * Xoá option
     */
    public function destroy($id)
    {
        try {
            $deleted = $this->specOptionService->delete($id);

            return response()->json([
                'message' => 'Xoá thành công',
                'status' => 'success',
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
}
