"use client";

import React, { useState, useMemo } from "react";
import CrudGeneric, { CrudItem } from "@/components/ui/CrudGeneric";
import { useRouter } from "next/navigation";

const fakeCategories: CrudItem[] = [
  { id: 1, name: "Điện thoại", slug: "dien-thoai", status: true },
  { id: 2, name: "Laptop", slug: "laptop", status: false },
];

export default function CategoriesPage() {
  const router = useRouter();  // ← thêm dòng này

  const [categories, setCategories] = useState(fakeCategories);

  const [search, setSearch] = useState("");

  // Lọc tìm kiếm dựa trên name hoặc slug
  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const lower = search.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.slug.toLowerCase().includes(lower)
    );
  }, [categories, search]);

  // Create mới
  const handleCreate = (item: Omit<CrudItem, "id">) => {
    const newItem = { id: Date.now(), ...item };
    setCategories((prev) => [...prev, newItem]);
  };

  // Update item
  const handleUpdate = (id: number, item: Omit<CrudItem, "id">) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...item } : c))
    );
  };

  // Delete
  const handleDelete = (id: number) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // Toggle status
  const handleToggleStatus = (id: number) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: !c.status } : c
      )
    );
  };

  return (
    <div className="p-6">
      {/* Search bar + create button nằm bên trong CrudGeneric rồi nên bạn có thể bỏ nếu muốn */}
      <CrudGeneric
        title="Categories"
        initialData={filtered}
        columns={["name", "slug", "status"]}
        fields={["name", "slug", "status"]}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        renderActions={(cat) => (       // ← thêm prop này
          <button
            className="text-indigo-600 hover:underline"
            onClick={() =>
              router.push(`/admin/categories/${cat.id}/specifications`)
            }
          >
            Xem thuộc tính
          </button>
        )}
      />
    </div>
  );
}
