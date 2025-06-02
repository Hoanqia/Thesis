"use client";
import React, { useEffect, useState } from 'react';
import CrudGeneric, { FieldConfig } from '@/components/ui/CrudGeneric';
import { Voucher, CreateVoucherPayload, UpdateVoucherPayload, voucherApi } from '@/features/vouchers/api/voucherApi';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  useEffect(() => {
    loadVouchers();
  }, []);

  const loadVouchers = async () => {
    try {
      const data = await voucherApi.fetchAll();
      setVouchers(data);
    } catch (error: any) {
      console.error('Error loading vouchers:', error.message);
      toast.error(`Lỗi tải dữ liệu: ${error.message}`);
    }
  };

  const handleCreate = async (item: Omit<Voucher, 'id'>) => {
    const payload = item as CreateVoucherPayload;
    try {
      await voucherApi.create(payload);
      toast.success('Tạo voucher thành công');
      await loadVouchers();
    } catch (error: any) {
      toast.error(`Tạo voucher thất bại: ${error.message}`);
    }
  };

  const handleUpdate = async (id: number, item: Omit<Voucher, 'id'>) => {
    const payload = item as UpdateVoucherPayload;
    try {
      await voucherApi.update(id, payload);
      toast.success('Cập nhật voucher thành công');
      await loadVouchers();
    } catch (error: any) {
      toast.error(`Cập nhật thất bại: ${error.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await voucherApi.remove(id);
      toast.success('Xoá voucher thành công');
      await loadVouchers();
    } catch (error: any) {
      toast.error(`Xoá thất bại: ${error.message}`);
    }
  };

  const handleToggleStatus = async (id: number) => {
    const voucher = vouchers.find(v => v.id === id);
    if (!voucher) return;
    try {
      await voucherApi.update(id, { status: voucher.status ? 0 : 1 });
      toast.success(`Voucher đã ${voucher.status ? 'tắt' : 'bật'} thành công`);
      await loadVouchers();
    } catch (error: any) {
      toast.error(`Chuyển trạng thái thất bại: ${error.message}`);
    }
  };

  const fieldsConfig: Partial<Record<keyof Voucher, FieldConfig>> = {
    code: { label: 'Mã giảm giá', type: 'text', required: true },
    type: {
      label: 'Loại',
      type: 'select',
      required: true,
      options: [
        { label: 'Product Discount', value: 'product_discount' },
        { label: 'Shipping Discount', value: 'shipping_discount' }
      ]
    },
    discount_percent: { label: 'Phần trăm giảm', type: 'number', placeholder: '0-100' },
    minimum_order_amount: { label: 'Giá tối thiểu', type: 'number', placeholder: '0.00' },
    start_date: {
      label: 'Ngày bắt đầu',
      renderField: ({ value, onChange }) => (
        <input
          type="datetime-local"
          value={value?.slice(0, 16)}
          onChange={e => onChange(new Date(e.target.value).toISOString())}
          className="w-full p-2 border rounded"
        />
      )
    },
    end_date: {
      label: 'Ngày kết thúc',
      renderField: ({ value, onChange }) => (
        <input
          type="datetime-local"
          value={value?.slice(0, 16)}
          onChange={e => onChange(new Date(e.target.value).toISOString())}
          className="w-full p-2 border rounded"
        />
      )
    },
    max_uses: { label: 'Giới hạn lượt', type: 'number' },
    status: { label: 'Hoạt động', type: 'checkbox' }
  };

  const columns: (keyof Voucher)[] = [
    'id', 'code', 'type', 'discount_percent',
    'minimum_order_amount', 'start_date', 'end_date',
    'max_uses', 'used_count', 'status'
  ];

  const headerLabels: Record<keyof Voucher, string> = {
    id: 'ID',
    code: 'Mã giảm giá',
    type: 'Loại giảm',
    discount_percent: 'Phần trăm giảm',
    minimum_order_amount: 'Giá tối thiểu',
    start_date: 'Ngày bắt đầu',
    end_date: 'Ngày kết thúc',
    max_uses: 'Giới hạn lượt',
    used_count: 'Đã dùng',
    status: 'Trạng thái',
  };

  return (
    <div className="p-6">
      <CrudGeneric<Voucher>
        title="Quản lý Voucher"
        initialData={vouchers}
        columns={columns}
        headerLabels={headerLabels}
        fields={columns.filter(c => c !== 'id' && c !== 'used_count' && c !== 'code') as (keyof Voucher)[]}
        fieldsConfig={fieldsConfig}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        renderRow={(item, column) => {
          if (column === 'status') {
            return (
              <Badge variant={item.status ? 'default' : 'destructive'}>
                {item.status ? 'Active' : 'Inactive'}
              </Badge>
            );
          }
          return <span className="break-words whitespace-normal">{String(item[column])}</span>;
        }}
      />

      <style jsx global>{`
        .table-fixed th,
        .table-fixed td {
          word-break: break-word;
          white-space: normal;
        }
      `}</style>
    </div>
  );
}
