"use client"
import { useEffect, useState, use  } from "react";
import { ProductCard } from "@/features/products/components/ProductCard";
import { Product, fetchProducts } from "@/features/products/api/productApi";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {fetchProductsbyCatSlug} from "@/features/products/api/productApi"

interface Props {
     params: Promise<{ categorySlug: string }>;

  }

export default function ProductListPage({ params }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const { categorySlug } = use(params);

  useEffect(() => {
   const loadProducts = async () => {
    try {
      const data = await fetchProductsbyCatSlug(categorySlug);
      setProducts(data);
    } catch (error) {
      console.error("Lỗi khi tải products theo categorySlug:", error);
      setProducts([]); // hoặc giữ nguyên, tùy bạn
    }
  };
  loadProducts();
}, [categorySlug]);

  return (
    <div className="grid grid-cols-12 gap-6 p-6">
      {/* Filter column */}
    <div className="col-span-12 md:col-span-2 bg-muted rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Bộ lọc</h2>

        <div className="space-y-3">
          <Input
            placeholder="Tìm kiếm sản phẩm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="outline">Lọc theo giá</Button>
          <Button variant="outline">Lọc theo hãng</Button>
          <Button variant="outline">Lọc nổi bật</Button>
        </div>
      </div>

      {/* Product list column */}
      <div className="col-span-12 md:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {products
          .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
          .map((product) => (
            <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
