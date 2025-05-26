"use client";

import React, { useState, useEffect } from "react";
import CrudGeneric, { CrudItem } from "@/components/ui/CrudGeneric";
import { useRouter } from "next/navigation";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  Category,
} from "@/features/categories/api/categoryApi";

export default function CategoriesPage() {
  const router = useRouter();

  // Map Category thành CrudItem
  const mapCategoryToCrudItem = (cat: Category): CrudItem => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    status: cat.status,
  });

  const [categories, setCategories] = useState<CrudItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load danh sách categories
  useEffect(() => {
    setLoading(true);
    fetchCategories()
      .then((data) => {
        setCategories(data.map(mapCategoryToCrudItem));
        setError(null);
      })
      .catch((err) => setError(err.message || "Lỗi tải dữ liệu"))
      .finally(() => setLoading(false));
  }, []);

  // Tạo mới
  const handleCreate = async (item: Omit<CrudItem, "id">) => {
    try {
      setLoading(true);
      const newCat = await createCategory({
        name: item.name,
        slug: item.slug,
        status: item.status,
      });
      setCategories((prev) => [...prev, mapCategoryToCrudItem(newCat)]);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Lỗi tạo mới");
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật
  const handleUpdate = async (id: number, item: Omit<CrudItem, "id">) => {
    try {
      setLoading(true);
      const oldCat = categories.find((c) => c.id === id);
      if (!oldCat) throw new Error("Category not found");

      const updatedCat = await updateCategory(oldCat.slug, {
        name: item.name,
        slug: item.slug,
        status: item.status,
      });

      setCategories((prev) =>
        prev.map((c) => (c.id === id ? mapCategoryToCrudItem(updatedCat) : c))
      );
      setError(null);
    } catch (err: any) {
      setError(err.message || "Lỗi cập nhật");
    } finally {
      setLoading(false);
    }
  };

  // Xóa
  const handleDelete = async (id: number) => {
    try {
      setLoading(true);
      const catToDelete = categories.find((c) => c.id === id);
      if (!catToDelete) throw new Error("Category not found");

      await deleteCategory(catToDelete.slug);

      setCategories((prev) => prev.filter((c) => c.id !== id));
      setError(null);
    } catch (err: any) {
      setError(err.message || "Lỗi xóa");
    } finally {
      setLoading(false);
    }
  };

  // Toggle status
  const handleToggleStatus = async (id: number) => {
    try {
      setLoading(true);
      const cat = categories.find((c) => c.id === id);
      if (!cat) throw new Error("Category not found");

      const updatedCat = await toggleCategoryStatus(cat.slug, !cat.status);

      setCategories((prev) =>
        prev.map((c) => (c.id === id ? mapCategoryToCrudItem(updatedCat) : c))
      );
      setError(null);
    } catch (err: any) {
      setError(err.message || "Lỗi chuyển trạng thái");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      {/* Truyền nguyên mảng categories (không filter trong component này nữa) */}
      <CrudGeneric
        title="Categories"
        initialData={categories}
        columns={["name", "slug", "status"]}
        fields={["name", "slug", "status"]}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
       renderActions={(cat) => (
          <button
            className="text-indigo-600 hover:underline"
            onClick={() => router.push(`/admin/categories/${cat.id}/specifications`)}
          >
            Xem thuộc tính
          </button>
        )}
        // Nếu muốn show loading state, bạn có thể bổ sung props cho CrudGeneric (hiện tại chưa có)
      />
    </div>
  );
}
