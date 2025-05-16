"use client";
import ProductCard from "@/features/products/components/ProductCard";

const products = [
  {
    id: 1,
    name: "Sản phẩm A",
    price: 100000,
    image: "/placeholder.jpg",
  },
  {
    id: 2,
    name: "Sản phẩm B",
    price: 200000,
    image: "/placeholder.jpg",
  },
  {
    id: 3,
    name: "Sản phẩm C",
    price: 300000,
    image: "/placeholder.jpg",
  },
  {
    id: 4,
    name: "Sản phẩm D",
    price: 400000,
    image: "/placeholder.jpg",
  },
  {
    id: 5,
    name: "Sản phẩm E",
    price: 150000,
    image: "/placeholder.jpg",
  },
  {
    id: 6,
    name: "Sản phẩm F",
    price: 250000,
    image: "/placeholder.jpg",
  },
  {
    id: 7,
    name: "Sản phẩm G",
    price: 350000,
    image: "/placeholder.jpg",
  },
  {
    id: 8,
    name: "Sản phẩm H",
    price: 450000,
    image: "/placeholder.jpg",
  },
];

export default function ProductSection() {
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
