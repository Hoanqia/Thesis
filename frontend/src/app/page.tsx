// app/page.tsx
import HeroSection from "@/components/common/Hero/HeroSection";
// import ProductSection from "@/features/products/components/ProductSection"
import FeaturedCarousel from "@/features/products/components/FeaturedCarousel";

import RecommendedSection from "@/features/products/components/RecommendSection";
import CategoryGrid from '@/components/common/CategoryGrid';

export default function HomePage() {
  return (
    <div className="space-y-16">
      <HeroSection />
    <FeaturedCarousel />    
          <CategoryGrid />   
    <RecommendedSection />
    </div>
  );
}
