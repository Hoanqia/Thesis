// src/app/admin/products/[productId]/variants/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import CrudGeneric, { CrudItem } from "@/components/ui/CrudGeneric";

const fakeVariants: UIVariant[] = [
  { id: 1, sku: "SKU-001", price: 100, discount: 10, stock: 50 },
  { id: 2, sku: "SKU-002", price: 150, discount: 0, stock: 20 },
  { id: 3, sku: "SKU-003", price: 200, discount: 25, stock: 0 },
];

interface Variant {
  id: number;
  product_id: number;
  sku: string;
  price: number;
  discount: number;
  stock: number;
}

// Dùng cho UI/CrudGeneric: chỉ những field user nhập
interface UIVariant extends CrudItem {
  sku: string;
  price: number;
  discount: number;
  stock: number;
}

export default function VariantsPage() {
  const router = useRouter();
  const { productId } = useParams<{ productId: string }>();
  const prodId = parseInt(productId, 10);

  // fake data
  const [variants, setVariants] = useState<UIVariant[]>(fakeVariants);

  //   const [variants, setVariants] = useState<UIVariant[]>([]);

  // Fetch khi mount hoặc khi productId thay đổi
  useEffect(() => {
    fetch(`/api/products/${prodId}/variants`)
      .then((res) => res.json())
      .then((data: Variant[]) => {
        const ui = data.map((v) => ({
          id: v.id,
          sku: v.sku,
          price: v.price,
          discount: v.discount,
          stock: v.stock,
        }));
        setVariants(ui);
      });
  }, [prodId]);

  const filtered = useMemo(() => variants, [variants]);

  // CREATE
  const handleCreate = (item: Omit<UIVariant, "id">) => {
    const payload = { ...item, product_id: prodId };
    fetch(`/api/products/${prodId}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((newV: Variant) => {
        setVariants((prev) => [
          ...prev,
          {
            id: newV.id,
            sku: newV.sku,
            price: newV.price,
            discount: newV.discount,
            stock: newV.stock,
          },
        ]);
      });
  };

  // UPDATE
  const handleUpdate = (id: number, item: Omit<UIVariant, "id">) => {
    const payload = { ...item, product_id: prodId };
    fetch(`/api/products/${prodId}/variants/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((updated: Variant) => {
        setVariants((prev) =>
          prev.map((v) =>
            v.id === id
              ? {
                  id: updated.id,
                  sku: updated.sku,
                  price: updated.price,
                  discount: updated.discount,
                  stock: updated.stock,
                }
              : v
          )
        );
      });
  };

  // DELETE
  const handleDelete = (id: number) => {
    fetch(`/api/products/${prodId}/variants/${id}`, { method: "DELETE" }).then(
      () => setVariants((prev) => prev.filter((v) => v.id !== id))
    );
  };

  return (
    <div className="p-6">
      <button
        className="mb-4 text-sm text-blue-600 hover:underline"
        onClick={() => router.back()}
      >
        ← Quay lại danh sách Products
      </button>

      <CrudGeneric<UIVariant>
        title={`Variants của Product ${prodId}`}
        initialData={filtered}
        columns={["sku", "price", "discount", "stock", "actions"]}
        fields={["sku", "price", "discount", "stock"]}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        renderActions={(variant) => (
          <button
            className="text-sm text-blue-600 underline"
            onClick={() => router.push(`/admin/products/${productId}/variants/${variant.id}/spec-values`)}
          >
            Xem thuộc tính
          </button>
        )}
      />
    </div>
  );
}
