// frontend\src\features\user_addresses\components\AddressList.tsx
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { AddressCard } from '@/features/user_addresses/components/AddressCard';
import AddressSelector from '@/features/user_addresses/components/AddressSelector';
import { addressApi, UserAdresss } from '@/features/user_addresses/api/addressApi';

interface AddressListProps {
  onSelect?: (addr: UserAdresss) => void;
  initialSelected?: number | null; // thêm prop để biết id đang chọn từ parent

}

export default function AddressList({ onSelect, initialSelected }: AddressListProps) {
  const [addresses, setAddresses] = useState<UserAdresss[]>([]);
  const [loading, setLoading] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(initialSelected ?? null);


   useEffect(() => {
    // Mỗi khi parent thay đổi defaultAddress (initialSelected), cập nhật lại selectedId
    setSelectedId(initialSelected ?? null);
   }, [initialSelected]);

  useEffect(() => {
    setLoading(true);
    addressApi.fetchAll()
      .then(list => setAddresses(list))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (addr: UserAdresss) => {
    setSelectedId(addr.id);
    onSelect?.(addr);
  };

  const handleAddSuccess = async (newAddr: UserAdresss) => {
    setAddresses(prev => [...prev, newAddr]);
    handleSelect(newAddr);
    setOpenAdd(false);
  };

  const handleDelete = async (id: number) => {
    await addressApi.remove(id);
    setAddresses(prev => prev.filter(a => a.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      onSelect?.(null as any);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Địa Chỉ Của Tôi</h2>

      {loading && <p>Đang tải địa chỉ...</p>}

      {addresses.map(addr => (
        <div key={addr.id} className="flex items-start">
          <input
            type="radio"
            name="selectedAddress"
            checked={selectedId === addr.id}
            onChange={() => handleSelect(addr)}
            className="mt-2 mr-3 h-4 w-4"
          />
          <div className="flex-1">
            <AddressCard
              address={addr}
                onEdit={(id) => console.log('Sửa địa chỉ ID:', id)} // hoặc gọi modal sửa địa chỉ
              onDelete={() => handleDelete(addr.id)}
            />
          </div>
        </div>
      ))}

      {/* Nút thêm địa chỉ mới mở modal */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            + Thêm Địa Chỉ Mới
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm Địa Chỉ Mới</DialogTitle>
          </DialogHeader>
          <AddressSelector
            onSuccess={handleAddSuccess}
            onCancel={() => setOpenAdd(false)}
          />
        </DialogContent>
      </Dialog>

   
    </div>
  );
}
