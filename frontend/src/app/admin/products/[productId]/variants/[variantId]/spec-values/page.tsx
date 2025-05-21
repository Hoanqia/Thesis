// src/app/admin/variants/[variantId]/spec-values/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import CrudGeneric, { CrudItem } from "@/components/ui/CrudGeneric";


const fakeSpecValues: UIVariantSpecValue[] = [
  { id: 1, spec_option_id: 1, value: "Đen" },
  { id: 2, spec_option_id: 2, value: "128GB" },
  { id: 3, spec_option_id: 3, value: "6.5 inch" },
];


interface VariantSpecValue {
  id: number;
  variant_id: number;
  spec_option_id: number;
  value: string;
}

interface UIVariantSpecValue extends CrudItem {
  spec_option_id: number;
  value: string;
}

export default function VariantSpecValuesPage() {
  const router = useRouter();
  const { variantId } = useParams<{ variantId: string }>();
  const vId = parseInt(variantId, 10);

  const [specValues, setSpecValues] = useState<UIVariantSpecValue[]>([]);

  // Lấy dữ liệu khi load
//   useEffect(() => {
//     fetch(`/api/variants/${vId}/spec-values`)
//       .then((res) => res.json())
//       .then((data: VariantSpecValue[]) => {
//         const ui = data.map((v) => ({
//           id: v.id,
//           spec_option_id: v.spec_option_id,
//           value: v.value,
//         }));
//         setSpecValues(ui);
//       });
//   }, [vId]);

  const filtered = useMemo(() => specValues, [specValues]);

  const handleCreate = (item: Omit<UIVariantSpecValue, "id">) => {
    const payload = { ...item, variant_id: vId };
    fetch(`/api/variants/${vId}/spec-values`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((newItem: VariantSpecValue) => {
        setSpecValues((prev) => [
          ...prev,
          {
            id: newItem.id,
            spec_option_id: newItem.spec_option_id,
            value: newItem.value,
          },
        ]);
      });
  };

  const handleUpdate = (id: number, item: Omit<UIVariantSpecValue, "id">) => {
    const payload = { ...item, variant_id: vId };
    fetch(`/api/variants/${vId}/spec-values/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((updated: VariantSpecValue) => {
        setSpecValues((prev) =>
          prev.map((v) =>
            v.id === id
              ? {
                  id: updated.id,
                  spec_option_id: updated.spec_option_id,
                  value: updated.value,
                }
              : v
          )
        );
      });
  };

  const handleDelete = (id: number) => {
    fetch(`/api/variants/${vId}/spec-values/${id}`, {
      method: "DELETE",
    }).then(() => {
      setSpecValues((prev) => prev.filter((v) => v.id !== id));
    });
  };

  return (
    <div className="p-6">
      <button
        className="mb-4 text-sm text-blue-600 hover:underline"
        onClick={() => router.back()}
      >
        ← Quay lại danh sách Variants
      </button>

      <CrudGeneric<UIVariantSpecValue>
        title={`Spec Values của Variant ${vId}`}
        initialData={filtered}
        columns={["spec_option_id", "value"]}
        fields={["spec_option_id", "value"]}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
