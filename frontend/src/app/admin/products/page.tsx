// src/app/admin/products/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import CrudGeneric, { CrudItem } from "@/components/ui/CrudGeneric";


// Fake product demo
const fakeProducts: UIProduct[] = [
  {
    id: 1,
    name: "iPhone 14 Pro",
    slug: "iphone-14-pro",
    description: "Smartphone thế hệ mới của Apple với màn hình 120Hz",
    cat_id: 1,
    brand_id: 1,
    image: "/images/iphone14pro.jpg",
    is_featured: true,
    status: true,
  },
  {
    id: 2,
    name: "MacBook Air M2",
    slug: "macbook-air-m2",
    description: "Laptop mỏng nhẹ chạy chip M2 cực nhanh",
    cat_id: 2,
    brand_id: 1,
    image: "/images/macbookairm2.jpg",
    is_featured: false,
    status: true,
  },
  {
    id: 3,
    name: "Samsung Galaxy S23",
    slug: "galaxy-s23",
    description: "Flagship mới nhất của Samsung với camera 200MP",
    cat_id: 1,
    brand_id: 2,
    image: "/images/galaxys23.jpg",
    is_featured: true,
    status: true,
  },
];


interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  cat_id: number;
  brand_id: number;
  image: string;       // URL hoặc path
  is_featured: boolean;
  status: boolean;
}

// UI-only type (không bao gồm tất cả mảng relation)
interface UIProduct extends CrudItem {
  name: string;
  slug: string;
  description: string;
  cat_id: number;
  brand_id: number;
  image: string;
  is_featured: boolean;
  status: boolean;
}

export default function ProductsPage() {
  const router = useRouter();
//   const [products, setProducts] = useState<UIProduct[]>([]);
const [products, setProducts] = useState<UIProduct[]>(fakeProducts);

  // 1. Fetch danh sách products khi mount
  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data: Product[]) => {
        const ui = data.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          cat_id: p.cat_id,
          brand_id: p.brand_id,
          image: p.image,
          is_featured: p.is_featured,
          status: p.status,
        }));
        setProducts(ui);
      });
  }, []);

  // 2. Lọc (để CrudGeneric xử lý search nội bộ)
  const filtered = useMemo(() => products, [products]);

  // 3. Handlers CRUD
  const handleCreate = (item: Omit<UIProduct, "id">) => {
    fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    })
      .then((res) => res.json())
      .then((newP: Product) => {
        setProducts((prev) => [
          ...prev,
          {
            id: newP.id,
            name: newP.name,
            slug: newP.slug,
            description: newP.description,
            cat_id: newP.cat_id,
            brand_id: newP.brand_id,
            image: newP.image,
            is_featured: newP.is_featured,
            status: newP.status,
          },
        ]);
      });
  };

  const handleUpdate = (id: number, item: Omit<UIProduct, "id">) => {
    fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    })
      .then((res) => res.json())
      .then((updated: Product) => {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  id: updated.id,
                  name: updated.name,
                  slug: updated.slug,
                  description: updated.description,
                  cat_id: updated.cat_id,
                  brand_id: updated.brand_id,
                  image: updated.image,
                  is_featured: updated.is_featured,
                  status: updated.status,
                }
              : p
          )
        );
      });
  };

  const handleDelete = (id: number) => {
    fetch(`/api/products/${id}`, { method: "DELETE" }).then(() => {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    });
  };

  const handleToggleStatus = (id: number) => {
    const prod = products.find((p) => p.id === id);
    if (!prod) return;
    const newStatus = !prod.status;
    fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...prod, status: newStatus }),
    })
      .then((res) => res.json())
      .then((up: Product) => {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, status: up.status } : p
          )
        );
      });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Products</h1>

      <CrudGeneric<UIProduct>
        title="Products"
        initialData={filtered}
        columns={[
          "name",
          "slug",
          "cat_id",
          "brand_id",
          "is_featured",
          "status",
        ]}
        fields={[
          "name",
          "slug",
          "description",
          "cat_id",
          "brand_id",
          "image",
          "is_featured",
          "status",
        ]}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        renderActions={(prod) => (
          <button
            className="text-indigo-600 hover:underline"
            onClick={() =>
              router.push(`/admin/products/${prod.id}/variants`)
            }
          >
            Xem variants
          </button>
        )}
      />
    </div>
  );
}
