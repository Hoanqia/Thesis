<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\UserAddressService;
use App\Exceptions\ApiExceptionHandler;

class UserAddressController extends Controller
{
    protected $userAddressService;

    public function __construct(UserAddressService $userAddressService)
    {
        $this->userAddressService = $userAddressService;
    }

    public function index()
    {
        try {
            $addresses = $this->userAddressService->getUserAddresses();

            return response()->json([
                'message' => $addresses->isEmpty() ? 'Không có địa chỉ' : 'Lấy danh sách địa chỉ thành công',
                'status' => 'success',
                'data' => $addresses,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function show($id)
    {
        try {
            $address = $this->userAddressService->getAddressById($id);

            if (!$address) {
                return response()->json([
                    'message' => 'Không tìm thấy địa chỉ',
                    'status' => 'error',
                ], 404);
            }

            return response()->json([
                'message' => 'Lấy chi tiết địa chỉ thành công',
                'status' => 'success',
                'data' => $address,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'province' => 'required|string|max:255',
                'district' => 'required|string|max:255',
                'ward' => 'required|string|max:255',
                'street_address' => 'required|string|max:255',
                'phone' => 'required|string|max:20',
                'is_default' => 'nullable|boolean',
            ]);

            $address = $this->userAddressService->create($validated);

            return response()->json([
                'message' => 'Tạo địa chỉ mới thành công',
                'status' => 'success',
                'data' => $address,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'province' => 'sometimes|string|max:255',
                'district' => 'sometimes|string|max:255',
                'ward' => 'sometimes|string|max:255',
                'street_address' => 'sometimes|string|max:255',
                'phone' => 'sometimes|string|max:20',
                'is_default' => 'nullable|boolean',
            ]);

            $address = $this->userAddressService->update($id, $validated);

            if (!$address) {
                return response()->json([
                    'message' => 'Không tìm thấy địa chỉ để cập nhật',
                    'status' => 'error',
                ], 404);
            }

            return response()->json([
                'message' => 'Cập nhật địa chỉ thành công',
                'status' => 'success',
                'data' => $address,
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }

    public function destroy($id)
    {
        try {
            $deleted = $this->userAddressService->delete($id);

            if (!$deleted) {
                return response()->json([
                    'message' => 'Không tìm thấy địa chỉ để xoá',
                    'status' => 'error',
                ], 404);
            }

            return response()->json([
                'message' => 'Xoá địa chỉ thành công',
                'status' => 'success',
            ]);
        } catch (\Exception $e) {
            return ApiExceptionHandler::handleException($e);
        }
    }
}
