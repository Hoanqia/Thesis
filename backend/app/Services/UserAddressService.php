<?php

namespace App\Services;

use App\Models\UserAddress;
use Illuminate\Support\Facades\Auth;

class UserAddressService
{
    public function getUserAddresses()
    {
        return UserAddress::where('user_id', Auth::id())->get();
    }

    public function getAddressById($id)
    {
        return UserAddress::where('id', $id)
            ->where('user_id', Auth::id())
            ->first();
    }

    public function create(array $data)
    {
        $data['user_id'] = Auth::id();

        // Nếu là mặc định, reset các địa chỉ khác
        if (!empty($data['is_default'])) {
            UserAddress::where('user_id', Auth::id())->update(['is_default' => false]);
        }

        return UserAddress::create($data);
    }

    public function update($id, array $data)
    {
        $address = $this->getAddressById($id);
        if (!$address) return null;

        if (isset($data['is_default']) && $data['is_default']) {
            UserAddress::where('user_id', Auth::id())->update(['is_default' => false]);
        }

        $address->update($data);
        return $address;
    }

    public function delete($id)
    {
        $address = $this->getAddressById($id);
        if (!$address) return false;

        return $address->delete();
    }
}
