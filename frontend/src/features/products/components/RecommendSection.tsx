"use client";
import ProductCard from "@/features/products/components/ProductCard";

export default function RecommendedSection() {
  const recommended = [5, 6, 7, 8]; // Giả lập

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-6">Gợi ý cho bạn</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {recommended.map((id) => (
          <ProductCard key={id} id={id} />
        ))}
      </div>
    </section>
  );
}
