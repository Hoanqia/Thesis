// app/admin/categories/[categoryId]/specifications/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import CrudGeneric, { CrudItem } from "@/components/ui/CrudGeneric";

interface Spec {
  id: number;
  category_id: number;
  name: string;
  data_type: string;
  unit: string;
  description: string;
}

// KIỂU DÙNG TRONG UI, chỉ gồm những field CRUDGeneric có:
interface UISpec extends CrudItem {
  name: string;
  data_type: string;
  unit: string;
  description: string;
}

export default function SpecsPage() {
  const router = useRouter();
  const { categoryId } = useParams<{ categoryId: string }>();
  const catId = parseInt(categoryId, 10);

  // Giữ data UI
  const [specs, setSpecs] = useState<UISpec[]>([]);

  useEffect(() => {
    // Ví dụ fetch Spec[] từ API rồi map về UISpec[]
    fetch(`/api/categories/${catId}/specifications`)
      .then((res) => res.json())
      .then((data: Spec[]) => {
        const uiList: UISpec[] = data.map((s) => ({
          id: s.id,
          name: s.name,
          data_type: s.data_type,
          unit: s.unit,
          description: s.description,
        }));
        setSpecs(uiList);
      });
  }, [catId]);

  const filtered = useMemo(() => specs, [specs]);

  // CREATE: item chỉ có name, data_type, unit, description
  const handleCreate = (item: Omit<UISpec, "id">) => {
    // gắn thêm category_id để gửi server
    const payload = { ...item, category_id: catId };
    fetch(`/api/categories/${catId}/specifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((newSpec: Spec) => {
        // map về UISpec
        setSpecs((prev) => [
          ...prev,
          {
            id: newSpec.id,
            name: newSpec.name,
            data_type: newSpec.data_type,
            unit: newSpec.unit,
            description: newSpec.description,
          },
        ]);
      });
  };

  // UPDATE: item chỉ có name, data_type, unit, description
  const handleUpdate = (id: number, item: Omit<UISpec, "id">) => {
    const payload = { ...item, category_id: catId };
    fetch(`/api/categories/${catId}/specifications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((updated: Spec) => {
        setSpecs((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  id: updated.id,
                  name: updated.name,
                  data_type: updated.data_type,
                  unit: updated.unit,
                  description: updated.description,
                }
              : s
          )
        );
      });
  };

  const handleDelete = (id: number) => {
    fetch(`/api/categories/${catId}/specifications/${id}`, {
      method: "DELETE",
    }).then(() => {
      setSpecs((prev) => prev.filter((s) => s.id !== id));
    });
  };

  return (
    <div className="p-6">
      <button
        className="mb-4 text-sm text-blue-600 hover:underline"
        onClick={() => router.back()}
      >
        ← Quay lại danh sách Categories
      </button>

      <CrudGeneric<UISpec>
        title={`Specifications của Category ${catId}`}
        initialData={filtered}
        columns={["name", "data_type", "unit", "description"]}
        fields={["name", "data_type", "unit", "description"]}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
