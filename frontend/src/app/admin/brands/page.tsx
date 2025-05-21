// src/app/admin/brands/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import CrudGeneric, { CrudItem } from "@/components/ui/CrudGeneric";

interface Brand {
  id: number;
  name: string;
  slug: string;
  status: boolean;
}

// UI-type chỉ gồm những field form sẽ xử lý
interface UIBrand extends CrudItem {
  name: string;
  slug: string;
  status: boolean;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<UIBrand[]>([]);

  // Fetch danh sách từ API khi mount
  useEffect(() => {
    fetch("/api/brands")
      .then((res) => res.json())
      .then((data: Brand[]) => {
        // map về UIBrand
        const ui = data.map((b) => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          status: b.status,
        }));
        setBrands(ui);
      });
  }, []);

  // Lọc (hiện tại chưa dùng search ngoài CrudGeneric)
  const filtered = useMemo(() => brands, [brands]);

  // CREATE
  const handleCreate = (item: Omit<UIBrand, "id">) => {
    fetch("/api/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    })
      .then((res) => res.json())
      .then((newBrand: Brand) => {
        setBrands((prev) => [
          ...prev,
          {
            id: newBrand.id,
            name: newBrand.name,
            slug: newBrand.slug,
            status: newBrand.status,
          },
        ]);
      });
  };

  // UPDATE
  const handleUpdate = (id: number, item: Omit<UIBrand, "id">) => {
    fetch(`/api/brands/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    })
      .then((res) => res.json())
      .then((updated: Brand) => {
        setBrands((prev) =>
          prev.map((b) =>
            b.id === id
              ? {
                  id: updated.id,
                  name: updated.name,
                  slug: updated.slug,
                  status: updated.status,
                }
              : b
          )
        );
      });
  };

  // DELETE
  const handleDelete = (id: number) => {
    fetch(`/api/brands/${id}`, { method: "DELETE" }).then(() => {
      setBrands((prev) => prev.filter((b) => b.id !== id));
    });
  };

  // TOGGLE STATUS (nếu muốn xử lý ngay client-side, còn API không cần field này)
  const handleToggleStatus = (id: number) => {
    const brand = brands.find((b) => b.id === id);
    if (!brand) return;
    const updatedStatus = !brand.status;
    fetch(`/api/brands/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...brand, status: updatedStatus }),
    })
      .then((res) => res.json())
      .then((updated: Brand) => {
        setBrands((prev) =>
          prev.map((b) =>
            b.id === id ? { ...b, status: updated.status } : b
          )
        );
      });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Brands</h1>
      <CrudGeneric<UIBrand>
        title="Brands"
        initialData={filtered}
        columns={["name", "slug", "status"]}
        fields={["name", "slug", "status"]}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  );
}
