


"use client";

import { useParams } from "next/navigation";
import React, { useState, useEffect } from "react";
import {
  supplierApi,
  VariantFromSupplier,
  SaveMultipleVariantPayloadItem,
} from "@/features/suppliers/api/supplierApi";
import { Variant, variantApi } from "@/features/variants/api/variantApi";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
// Modal chọn SKU
function SKUSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  initialSelected,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (items: Variant[]) => void;
  initialSelected: Variant[];
}) {
  const [allVariants, setAllVariants] = useState<Variant[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Variant[]>(initialSelected);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const variants = await variantApi.fetchAllVariants();
      setAllVariants(variants);
      setSelected(initialSelected);
    })();
  }, [isOpen, initialSelected]);

  const toggleSelect = (v: Variant) => {
    setSelected((prev) =>
      prev.some((x) => x.id === v.id)
        ? prev.filter((x) => x.id !== v.id)
        : [...prev, v]
    );
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-11/12 h-5/6 rounded-lg overflow-hidden flex">
        {/* Danh sách SKU toàn hệ thống */}
        <div className="w-3/5 p-4 flex flex-col">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm SKU..."
            className="w-full border rounded p-2 mb-4"
          />
          <div className="flex-1 overflow-y-auto">
            {allVariants
              .filter((v) =>
                v.full_name
                  ?.toLowerCase()
                  .includes(search.trim().toLowerCase())
              )
              .map((v) => (
                <label
                  key={v.id}
                  className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.some((x) => x.id === v.id)}
                    onChange={() => toggleSelect(v)}
                    className="mr-2"
                  />
                  <img
                    src={v.image_url}
                    alt={v.full_name}
                    className="w-8 h-8 object-cover rounded mr-2"
                  />
                  <span>{v.full_name}</span>
                </label>
              ))}
          </div>
          <div className="mt-4 text-right">
            <button
              onClick={onClose}
              className="px-4 py-2 mr-2 border rounded"
            >
              Hủy
            </button>
            <button
              onClick={() => onConfirm(selected)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Thêm
            </button>
          </div>
        </div>
        {/* Danh sách SKU đã chọn */}
        <div className="w-2/5 border-l p-4 flex flex-col">
          <h3 className="font-semibold mb-2">{selected.length} SKU đã chọn</h3>
          <div className="flex-1 overflow-y-auto">
            {selected.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-2"
              >
                <div className="flex items-center">
                  <img
                    src={v.image_url}
                    alt={v.full_name}
                    className="w-8 h-8 object-cover rounded mr-2"
                  />
                  <span>{v.full_name}</span>
                </div>
                <button onClick={() => toggleSelect(v)}>
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Trang chính tạo/cập nhật nhiều SKU
export default function SupplierVariantBulkPage() {
  const params = useParams();
  const supplierId = params.supplier_id ? Number(params.supplier_id) : null;

  const [selected, setSelected] = useState<VariantFromSupplier[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [prices, setPrices] = useState<Record<number, number>>({});
  const [modalOpen, setModalOpen] = useState(false);

  // Load dữ liệu ban đầu
  useEffect(() => {
    if (!supplierId) return;
    (async () => {
      const data = await supplierApi.getSupplierVariants(supplierId);
      setSelected(data);
      // Prefill qty & price
      const q: Record<number, number> = {};
      const p: Record<number, number> = {};
      data.forEach((d) => {
        q[d.variant_id] = 1;
        p[d.variant_id] = d.current_purchase_price;
      });
      setQuantities(q);
      setPrices(p);
    })();
  }, [supplierId]);

  // Xử lý modal confirm
  const handleConfirm = (items: Variant[]) => {
    const mapped: VariantFromSupplier[] = items.map((v) => ({
      id: v.id,
      supplier_id: supplierId!,
      variant_id: v.id,
      variant: v,
      current_purchase_price: prices[v.id] ?? 0,
      variant_supplier_sku: null,
      is_active: true,
    }));
    setSelected(mapped);
    // ensure defaults
    const q = { ...quantities };
    const p = { ...prices };
    items.forEach((v) => {
      if (q[v.id] == null) q[v.id] = 1;
      if (p[v.id] == null) p[v.id] = 0;
    });
    setQuantities(q);
    setPrices(p);
    setModalOpen(false);
  };

  // Xử lý lưu
  const handleSubmit = async () => {
    if (!supplierId) return;
    const payload: SaveMultipleVariantPayloadItem[] = selected.map((d) => ({
      variant_id: d.variant_id,
      current_purchase_price: prices[d.variant_id] || 0,
      variant_supplier_sku: d.variant_supplier_sku || null,
      is_active: d.is_active,
    }));
    await supplierApi.saveMultipleSupplierVariants(supplierId, payload);
    alert("Lưu thành công");
  };

  const totalCost = selected.reduce(
    (sum, d) =>
      sum + (quantities[d.variant_id] || 0) * (prices[d.variant_id] || 0),
    0
  );

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">
        Tạo / Cập nhật Biến thể NCC {supplierId}
      </h1>

      <button
        onClick={() => setModalOpen(true)}
        className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
      >
        Chọn SKU để thêm
      </button>

      {/* Bảng chính */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">Sản phẩm</th>
              <th className="px-4 py-2 border">Mã SKU</th>
              <th className="px-4 py-2 border">* Giá nhập</th>
              <th className="px-4 py-2 border">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {selected.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-4">
                  Không có dòng nào.
                </td>
              </tr>
            )}
            {selected.map((d) => (
              <tr key={d.variant_id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border">{d.variant?.full_name}</td>
                <td className="px-4 py-2 border">{d.variant?.sku}</td>

                <td className="px-4 py-2 border">
                  <Input
                    type="number"
                    min={0}
                    value={prices[d.variant_id] || 0}
                    onChange={(e) =>
                      setPrices((p) => ({
                        ...p,
                        [d.variant_id]: Number(e.target.value),
                      }))
                    }
                    className="w-24 p-1 border rounded"
                  />
                </td>
              
                <td className="px-4 py-2 border">
                  <Button
                    onClick={() =>
                      setSelected((s) =>
                        s.filter((x) => x.variant_id !== d.variant_id)
                      )
                    }
                  >
                    Xóa
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

   

      <div className="flex justify-end space-x-4">
        <button
          onClick={() => history.back()}
          className="px-4 py-2 border rounded"
        >
          Thoát
        </button>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          Xác nhận
        </button>
      </div>

      <SKUSelectionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        initialSelected={selected.map((d) => d.variant!)}
      />
    </div>
  );
}
