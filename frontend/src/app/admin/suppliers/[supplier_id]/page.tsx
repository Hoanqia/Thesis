"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { supplierApi, VariantFromSupplier } from "@/features/suppliers/api/supplierApi";
import { Badge } from "@/components/ui/badge";

export default function SupplierVariantPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.supplier_id ? Number(params.supplier_id) : null;

  const [variants, setVariants] = useState<VariantFromSupplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterActive, setFilterActive] = useState<"all"|"active"|"inactive">("all");

  // Fetch variants
  useEffect(() => {
    if (!supplierId) {
      setError("Không tìm thấy ID nhà cung cấp.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const data = await supplierApi.getSupplierVariants(supplierId);
        setVariants(data);
      } catch (err) {
        console.error(err);
        setError("Lỗi khi tải danh sách biến thể.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [supplierId]);

   // Filtered list
  const filtered = variants.filter(item => {
    const name = item.variant?.full_name ?? "";
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterActive === "all" ||
      (filterActive === "active" && item.is_active) ||
      (filterActive === "inactive" && !item.is_active);
    return matchesSearch && matchesFilter;
  });

  // Handlers
  const goToCreate = () => {
    router.push(`/admin/suppliers/${supplierId}/create`);
  };
  const goToEdit = (id: number) => {
    router.push(`/admin/suppliers/${supplierId}/create`);
  };
  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa biến thể này?")) return;
    try {
      await supplierApi.removeVariantFromSupplier(supplierId!, id);
      // reload
      const data = await supplierApi.getSupplierVariants(supplierId!);
      setVariants(data);
      alert("Xóa thành công");
    } catch (err) {
      console.error(err);
      alert("Xóa thất bại");
    }
  };

  if (loading) return <div className="p-6 text-center">Đang tải...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
  if (!supplierId) return <div className="p-6 text-center text-red-500">ID nhà cung cấp không hợp lệ.</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Danh sách Biến thể NCC {supplierId}</h1>
        <button
          onClick={goToCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Thêm mới
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Tìm kiếm theo tên biến thể..."
          className="border p-2 rounded w-full md:w-1/2"
        />
        <select
          value={filterActive}
          onChange={e => setFilterActive(e.target.value as any)}
          className="border p-2 rounded w-full md:w-1/4"
        >
          <option value="all">Tất cả</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Không hoạt động</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">ID</th>
              <th className="px-4 py-2 border">Ảnh</th>
              <th className="px-4 py-2 border">Tên biến thể</th>
              <th className="px-4 py-2 border">SKU NCC</th>
              <th className="px-4 py-2 border">Giá mua</th>
              <th className="px-4 py-2 border">Trạng thái</th>
              <th className="px-4 py-2 border">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4">Không có dữ liệu.</td>
              </tr>
            ) : (
              filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{item.id}</td>
                  <td className="px-4 py-2 border">
                    <img
                      src={item.variant?.image_url || "https://placehold.co/50x50/cccccc/ffffff?text=No+Image"}
                      alt={item.variant?.full_name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  </td>
                  <td className="px-4 py-2 border">{item.variant?.full_name}</td>
                  <td className="px-4 py-2 border">{item.variant_supplier_sku || "-"}</td>
                  <td className="px-4 py-2 border">
                    {item.current_purchase_price.toLocaleString("vi-VN")} VNĐ
                  </td>
                  <td className="px-4 py-2 border">
                    <Badge variant={item.is_active ? "default" : "destructive"}>
                      {item.is_active ? "Hoạt động" : "Không hoạt động"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 border space-x-2">
                    <button
                      onClick={() => goToEdit(item.id)}
                      className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Xoá
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
