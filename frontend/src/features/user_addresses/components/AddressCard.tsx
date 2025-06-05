import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { UserAdresss } from '@/features/user_addresses/api/addressApi';

interface AddressCardProps {
  address: UserAdresss;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function AddressCard({ address, onEdit, onDelete }: AddressCardProps) {
  const {
    id,
    province,
    district,
    ward,
    street_address,
    phone,
    is_default,
    province_name,
    district_name,
    ward_name,
  } = address;

  return (
    <Card className="max-w-md w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {is_default ? '📍 Địa chỉ mặc định' : 'Địa chỉ'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-2">
          <span className="font-semibold">Tỉnh/TP:</span> {province_name}
        </p>
        <p className="mb-2">
          <span className="font-semibold">Quận/Huyện:</span> {district_name}
        </p>
        <p className="mb-2">
          <span className="font-semibold">Phường/Xã:</span> {ward_name}
        </p>
        <p className="mb-2">
          <span className="font-semibold">Địa chỉ cụ thể:</span> {street_address}
        </p>
        <p>
          <span className="font-semibold">Điện thoại:</span> {phone}
        </p>
      </CardContent>
      {(onEdit || onDelete) && (
        <CardFooter className="flex justify-end space-x-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(id)}>
              Sửa
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={() => onDelete(id)}>
              Xoá
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
