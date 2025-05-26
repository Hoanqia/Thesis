"use client";

import React, { useState, useEffect, useMemo } from "react";
import CrudGeneric, { CrudItem } from "@/components/ui/CrudGeneric";
import toast from "react-hot-toast";

// Import API function và interface
import {
  Brand,
  fetchBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  toggleBrandStatus,
} from "@/features/brands/api/brandApi";

interface UIBrand extends CrudItem {
  name: string;
  slug: string;
  status: boolean; // UI dùng boolean
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<UIBrand[]>([]);

  // Chuyển Brand (status number) sang UIBrand (status boolean)
  const mapToUIBrand = (brand: Brand): UIBrand => ({
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    status: brand.status === 1,
  });

  // Hàm fetch dữ liệu brand
  const loadBrands = () => {
    fetchBrands()
      .then((data) => {
        setBrands(data.map(mapToUIBrand));
      })
      .catch((err) => {
        toast.error("Failed to fetch brands");
        console.error("Failed to fetch brands:", err);
      });
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const filtered = useMemo(() => brands, [brands]);

  // Tạo mới brand, status mặc định true (1)
 const handleCreate = (item: Omit<UIBrand, "id" | "slug" | "status">) => {
  // Chỉ gửi name vì status có mặc định backend
  createBrand({ name: item.name })
    .then(() => {
      toast.success("Brand created successfully!");
      loadBrands();
    })
    .catch((err) => {
      toast.error("Failed to create brand");
      console.error("Create failed:", err);
    });
};


  // Cập nhật brand
  const handleUpdate = (id: number, item: Omit<UIBrand, "id">) => {
    updateBrand(item.slug, { ...item, status: item.status ? 1 : 0 })
      .then(() => {
        toast.success("Brand updated successfully!");
        loadBrands();
      })
      .catch((err) => {
        toast.error("Failed to update brand");
        console.error("Update failed:", err);
      });
  };

  // Xóa brand
  const handleDelete = (id: number) => {
    const brand = brands.find((b) => b.id === id);
    if (!brand) return;

    deleteBrand(brand.slug)
      .then(() => {
        toast.success("Brand deleted successfully!");
        loadBrands();
      })
      .catch((err) => {
        toast.error("Failed to delete brand");
        console.error("Delete failed:", err);
      });
  };

  // Toggle trạng thái brand
  const handleToggleStatus = (id: number) => {
    const brand = brands.find((b) => b.id === id);
    if (!brand) return;

    toggleBrandStatus(brand.slug, {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      status: brand.status ? 1 : 0,
    })
      .then(() => {
        toast.success(
          `Brand status ${!brand.status ? "activated" : "deactivated"}!`
        );
        loadBrands();
      })
      .catch((err) => {
        toast.error("Failed to toggle brand status");
        console.error("Toggle status failed:", err);
      });
  };

  return (
    <div className="p-6">
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
