"use client";

import React, { useState, useEffect, useMemo } from "react";
import CrudGeneric, { CrudItem } from "@/components/ui/CrudGeneric";
import { axiosRequest } from "@/lib/axiosRequest";
import toast from "react-hot-toast";

interface Brand {
  id: number;
  name: string;
  slug: string;
  status: number; // backend trả 0/1
}

interface UIBrand extends CrudItem {
  name: string;
  slug: string;
  status: boolean; // UI dùng boolean
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<UIBrand[]>([]);

  // Hàm fetch dữ liệu brand, tái sử dụng ở nhiều chỗ
  const fetchBrands = () => {
    axiosRequest<{
      message: string;
      status: string;
      data: Brand[];
    }>("/admin/brands", "GET")
      .then(({ data }) => {
        const ui = data.map((b) => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          status: Boolean(b.status),
        }));
        setBrands(ui);
      })
      .catch((err) => {
        toast.error("Failed to fetch brands");
        console.error("Failed to fetch brands:", err);
      });
  };

  // Lần đầu tải trang thì gọi fetchBrands
  useEffect(() => {
    fetchBrands();
  }, []);

  const filtered = useMemo(() => brands, [brands]);

  // Tạo mới, mặc định status = 1
  const handleCreate = (item: Omit<UIBrand, "id" | "slug">) => {
    const payload = { ...item, status: 1 };
    axiosRequest<Brand>("/admin/brands", "POST", payload)
      .then(() => {
        toast.success("Brand created successfully!");
        fetchBrands(); // reload lại danh sách sau khi tạo
      })
      .catch((err) => {
        toast.error("Failed to create brand");
        console.error("Create failed:", err);
      });
  };

  // Cập nhật
  const handleUpdate = (id: number, item: Omit<UIBrand, "id">) => {
    const payload = { ...item, status: item.status ? 1 : 0 };
    axiosRequest<Brand>(`/admin/brands/${item.slug}`, "PATCH", payload)
      .then(() => {
        toast.success("Brand updated successfully!");
        fetchBrands(); // reload lại danh sách sau khi cập nhật
      })
      .catch((err) => {
        toast.error("Failed to update brand");
        console.error("Update failed:", err);
      });
  };

  // Xóa
  const handleDelete = (id: number) => {
    const brand = brands.find((b) => b.id === id);
    if (!brand) return;
    axiosRequest<void>(`/admin/brands/${brand.slug}`, "DELETE")
      .then(() => {
        toast.success("Brand deleted successfully!");
        fetchBrands(); // reload lại danh sách sau khi xóa
      })
      .catch((err) => {
        toast.error("Failed to delete brand");
        console.error("Delete failed:", err);
      });
  };

  // Chuyển trạng thái
  const handleToggleStatus = (id: number) => {
    const brand = brands.find((b) => b.id === id);
    if (!brand) return;

    const updatedStatus = !brand.status;
    const payload = { ...brand, status: updatedStatus ? 1 : 0 };

    axiosRequest<Brand>(`/admin/brands/${brand.slug}`, "PATCH", payload)
      .then(() => {
        toast.success(
          `Brand status ${updatedStatus ? "activated" : "deactivated"}!`
        );
        fetchBrands(); // reload lại danh sách sau khi đổi trạng thái
      })
      .catch((err) => {
        toast.error("Failed to toggle brand status");
        console.error("Toggle status failed:", err);
      });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Brands</h1>
      <CrudGeneric<UIBrand>
        title="Brands"
        initialData={filtered}
        columns={["name", "slug", "status"]}
        fields={["name"]}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  );
}
