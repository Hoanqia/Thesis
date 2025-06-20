
'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import purchaseOrderApi from '@/features/purchase_orders/api/purchaseOrderApi';
import { VariantFromSupplier, supplierApi } from '@/features/suppliers/api/supplierApi';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/features/auth/store/useAuthStore'; // <-- IMPORT useAuthStore

// Kiểu cho variant đã chọn kèm số lượng
interface SelectedVariant {
  info: VariantFromSupplier;
  ordered_quantity: number;
}

const CreatePurchaseOrderPage: React.FC = () => {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<{ label: string; value: number }[]>([]);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [expectedDate, setExpectedDate] = useState('');
  const [actualDate, setActualDate] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [variants, setVariants] = useState<VariantFromSupplier[]>([]);
  const [selected, setSelected] = useState<SelectedVariant[]>([]);

  

  // Load suppliers
  useEffect(() => {
    supplierApi.getAll().then(list =>
      setSuppliers(list.map(s => ({ label: s.name, value: s.id })))
    );
  }, []);

  // Khi chọn supplier mới
  useEffect(() => {
    setVariants([]);
    setSelected([]);
    if (supplierId) {
      supplierApi.getSupplierVariants(supplierId).then(list => setVariants(list));
    }
  }, [supplierId]);

  const toggleSelectVariant = (v: VariantFromSupplier) => {
    const exists = selected.find(s => s.info.id === v.id);
    if (exists) {
      setSelected(prev => prev.filter(s => s.info.id !== v.id));
    } else {
      setSelected(prev => [...prev, { info: v, ordered_quantity: 1 }]);
    }
  };

  const handleQtyChange = (id: number, qty: number) => {
    setSelected(prev =>
      prev.map(s => (s.info.id === id ? { ...s, ordered_quantity: qty } : s))
    );
  };

  const handleSubmit = async () => {
    if (!supplierId  || selected.length === 0) return;
    const payload = {
      supplier_id: supplierId,
      expected_delivery_date: expectedDate || undefined,
      actual_delivery_date: actualDate || undefined,
      items: selected.map(s => ({
        variant_id: s.info.variant_id,
        ordered_quantity: s.ordered_quantity,
        unit_cost: s.info.current_purchase_price,
      })),
    };
    try {
      await purchaseOrderApi.createPurchaseOrder(payload);
      router.push('/admin/purchase_orders');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Tạo đơn đặt hàng</h1>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block mb-1">Nhà cung cấp</label>
          <select
            className="w-full border p-2 rounded"
            value={supplierId ?? ''}
            onChange={e => setSupplierId(Number(e.target.value) || null)}
          >
            <option value="">-- Chọn nhà cung cấp --</option>
            {suppliers.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1">Ngày dự kiến</label>
          <Input
            type="date"
            className="w-full border p-2 rounded"
            value={expectedDate}
            onChange={e => setExpectedDate(e.target.value)}
          />
        </div>
        {/* <div>
          <label className="block mb-1">Ngày thực tế</label>
          <Input
            type="date"
            className="w-full border p-2 rounded"
            value={actualDate}
            onChange={e => setActualDate(e.target.value)}
          />
        </div> */}
      </div>

      <Button
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        disabled={!supplierId}
        onClick={() => setModalOpen(true)}
      >
        Chọn biến thể nhập hàng
      </Button>

      {/* Custom modal tailwind */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50">
          <div className="bg-white w-full max-w-6xl rounded-lg shadow-lg overflow-auto max-h-[95vh]">
            {/* Header */}
            <div className="flex justify-between items-center border-b px-4 py-3">
              <h2 className="text-xl font-semibold">Chọn SKU Sản Phẩm</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-600 hover:text-black">✕</button>
            </div>
            {/* Body */}
            <div className="flex">
              {/* Danh sách variants */}
              <div className="w-1/2 border-r p-4 space-y-2 overflow-y-auto" style={{ maxHeight: '80vh' }}>
                {variants.map(v => (
                  <label key={v.id} className="flex items-center space-x-2">
                    <Input
                      type="checkbox"
                      className="form-checkbox"
                      checked={!!selected.find(s => s.info.id === v.id)}
                      onChange={() => toggleSelectVariant(v)}
                    />
                    <img src={v.variant?.image_url} alt={v.variant?.full_name} className="w-12 h-12 object-cover rounded" />
                    <span className="flex-1">{v.variant?.full_name}</span>
                  </label>
                ))}
              </div>
              {/* Danh sách đã chọn */}
              <div className="w-1/2 p-4 space-y-2 overflow-y-auto" style={{ maxHeight: '80vh' }}>
                <h3 className="font-semibold mb-2">{selected.length} SKU đã chọn</h3>
                {selected.map(s => (
                  <div key={s.info.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <img src={s.info.variant?.image_url} alt={s.info.variant?.full_name} className="w-10 h-10 object-cover rounded" />
                      <span>{s.info.variant?.full_name}</span>
                    </div>
                    <button onClick={() => toggleSelectVariant(s.info)} className="text-red-600">X</button>
                  </div>
                ))}
              </div>
            </div>
            {/* Footer */}
            <div className="flex justify-end border-t px-4 py-3 space-x-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 border rounded">Hủy</button>
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded">Thêm</button>
            </div>
          </div>
        </div>
      )}

  <div className="mt-8 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
    <h2 className="text-xl font-bold text-gray-800 p-6 pb-4">Chi tiết đơn hàng</h2>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] border-separate border-spacing-0">
        <thead>
          <tr className="bg-gray-50 text-left text-gray-600 uppercase text-sm font-semibold tracking-wider border-b border-gray-200"> {/* Chỉ có border-b ở đây cho cả hàng header */}
            {/* Header cells - focus on py/px và text alignment */}
            <th className="py-3 px-4 rounded-tl-lg">Sản phẩm</th>
            <th className="py-3 px-4">SKU</th>
            <th className="py-3 px-4 text-center">Số lượng</th>
            <th className="py-3 px-4 text-right">Giá nhập</th>
            <th className="py-3 px-4 text-right">Tổng cộng</th>
            <th className="py-3 px-4 rounded-tr-lg text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody className="text-gray-700 text-sm">
          {selected.map((s, index) => (
            <tr
              key={s.info.id}
              className={`group hover:bg-gray-50 transition-colors duration-150 ease-in-out ${
                index < selected.length - 1 ? 'border-b border-gray-200' : '' // Thêm border-b cho mỗi hàng trừ hàng cuối cùng
              }`}
            >
              {/* Product column: Image and text, use flex for vertical alignment */}
              <td className="py-3 px-4 flex items-center space-x-3">
                <img
                  src={s.info.variant?.image_url || 'https://via.placeholder.com/40'}
                  alt={s.info.variant?.full_name || 'Product Image'}
                  className="w-10 h-10 object-cover rounded-md border border-gray-200"
                />
                <span className="font-medium text-gray-800">{s.info.variant?.full_name}</span>
              </td>
              {/* SKU column: Simple text, ensure vertical alignment */}
              <td className="py-3 px-4 align-middle">{s.info.variant_supplier_sku}</td>
              {/* Quantity column: Input field, centered using flex */}
              <td className="py-3 px-4 flex justify-center items-center">
                <Input // Assuming Input is your custom component with proper className forwarding
                  type="number"
                  min={1}
                  value={s.ordered_quantity}
                  onChange={e => handleQtyChange(s.info.id, Number(e.target.value))}
                  className="w-24 p-2 border border-gray-300 rounded-md shadow-sm text-center text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </td>
              {/* Purchase Price column: Right aligned text, ensure vertical alignment */}
              <td className="py-3 px-4 text-right align-middle">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                  s.info.current_purchase_price
                )}
              </td>
              {/* Total column: Right aligned bold text, ensure vertical alignment */}
              <td className="py-3 px-4 text-right font-semibold text-gray-900 align-middle">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                  s.ordered_quantity * s.info.current_purchase_price
                )}
              </td>
              {/* Action column: Button, centered using flex */}
              <td className="py-3 px-4 flex justify-center items-center">
                <Button // Assuming Button is your custom component with proper className forwarding
                  onClick={() => toggleSelectVariant(s.info)}
                //   className="text-red-500 hover:text-red-700 hover:bg-red-100 p-2 rounded-md transition-colors duration-150 ease-in-out"
                >
                  Xóa
                </Button>
              </td>
            </tr>
          ))}
          {/* Total row - distinct styling for summary */}
          {/* Hàng tổng cộng không có border-b nữa vì nó là hàng cuối cùng trong tbody,
              và div cha đã có border bao quanh. */}
          <tr>
            <td colSpan={4} className="py-4 px-6 text-right font-bold text-lg text-gray-800 rounded-bl-lg">Tổng giá nhập</td>
            <td className="py-4 px-6 font-bold text-lg text-blue-600 text-right">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                selected.reduce((sum, s) => sum + s.ordered_quantity * s.info.current_purchase_price, 0)
              )}
            </td>
            <td className="py-4 px-6 rounded-br-lg" />
          </tr>
        </tbody>
      </table>
    </div>
  </div>

     
      <div className="flex justify-end space-x-2 mt-6">
        <button onClick={() => router.back()} className="px-4 py-2 border rounded">Hủy</button>
        <button
          onClick={handleSubmit}
          disabled={!supplierId || selected.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          Xác nhận
        </button>
      </div>
    </div>
  );
};

export default CreatePurchaseOrderPage;
