// features/products/components/ProductSection.tsx
"use client";

import { useState, useEffect } from "react";
import ProductCard, { Product } from "./ProductCard";

type ApiVariant = {
  price: string;
  discount: string;
};

type ApiProduct = {
  id: number;
  name: string;
  image: string | null;
  variants: ApiVariant[];
};

export default function ProductSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/featured-products")
      .then((res) => {
        if (!res.ok) throw new Error("Lấy dữ liệu thất bại");
        return res.json();
      })
      .then((json) => {
        // json.data là mảng ApiProduct đầy đủ
        const mapped: Product[] = json.data.map((p: ApiProduct) => {
          // Lấy variant đầu tiên làm ví dụ
          const v = p.variants[0];
          // Chuyển sang number, trừ discount (nếu discount cũng là amount)
          const priceNum =
            parseFloat(v.price) - parseFloat(v.discount);
          return {
            id: p.id,
            name: p.name,
            // dùng image từ API hoặc placeholder
            image: p.image || "/placeholder.jpg",
            price: Math.round(priceNum),
          };
        });
        setProducts(mapped);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Đang tải sản phẩm nổi bật…</p>;
  if (error) return <p className="text-red-500">Lỗi: {error}</p>;

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-6">Sản phẩm nổi bật</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
