// app/page.tsx
import HeroSection from "@/components/common/Hero/HeroSection";
import ProductSection from "@/features/products/components/ProductSection"
import RecommendedSection from "@/features/products/components/RecommendSection";

export default function HomePage() {
  return (
    <div className="space-y-16">
      <HeroSection />
      <ProductSection />
      <RecommendedSection />
    </div>
  );
}
