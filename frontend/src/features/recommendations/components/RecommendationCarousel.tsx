
"use client";

import { useEffect, useState } from "react";
import { recommendApi, RecommendationItem , RecommendationResponse} from "@/features/recommendations/api/recommendationApi";
import { ProductCard } from "@/features/products/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from '@/features/auth/store/useAuthStore';

const VISIBLE_SLOTS = 6;

interface RecommendationCarouselProps{
  categorySlug: string;
    productSlug?: string;

}
export default function RecommendationCarousel({ categorySlug, productSlug }: RecommendationCarouselProps) {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [startIndex, setStartIndex] = useState(0);
    const [hydrated, setHydrated] = useState(false);
    const checkAuth = useAuthStore((state) => state.checkAuth);

 const isLoggedIn = useAuthStore(state => state.isLoggedIn);

  // Đợi đến khi trạng thái Zustand hydrate xong

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    async function fetchItems() {
      setLoading(true);
      try {
        let res: RecommendationResponse | null = null;

        if (isLoggedIn) {
          res = await recommendApi.getRecommendations();
        } else if (productSlug) {
          res = await recommendApi.getSimilarItemsByProductId(productSlug);
        }

        if (res && res.status === "success" && Array.isArray(res.data)) {
          setRecommendations(res.data);
        } else if (res) {
          console.error("Failed to fetch recommendations:", res.message);
        }
      } catch (err) {
        console.error("Error fetching recommendations:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, [hydrated, isLoggedIn, productSlug]);

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Sản phẩm gợi ý</h2>
        </div>
        <div className="flex items-center">
          <Skeleton className="w-8 h-8" />
          <div className="flex space-x-4 ml-4 overflow-hidden">
            {Array.from({ length: VISIBLE_SLOTS }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-shrink-0 w-1/6 h-[360px] rounded-lg"
              />
            ))}
          </div>
          <Skeleton className="w-8 h-8 ml-4" />
        </div>
      </div>
    );
  }

  // if (recommendations.length === 0) {
  //   return null;
  // }
  if (!loading && recommendations.length === 0) {
  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-2">Sản phẩm gợi ý</h2>
      <p className="text-gray-500">Không có sản phẩm nào để gợi ý.</p>
    </div>
  );
}

  const maxStart = Math.max(recommendations.length - VISIBLE_SLOTS, 0);

  const handlePrev = () => {
    setStartIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    setStartIndex((prev) => Math.min(prev + 1, maxStart));
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Sản phẩm gợi ý</h2>
      </div>
      <div className="flex items-center">
        <button
          onClick={handlePrev}
          disabled={startIndex === 0}
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
        >
          <ChevronLeft />
        </button>
        <div className="flex space-x-4 overflow-hidden flex-1">
          {Array.from({ length: VISIBLE_SLOTS }).map((_, idx) => {
            const item = recommendations[startIndex + idx];
            return (
              <div key={idx} className="flex-shrink-0 w-1/6">
                {item ? (
                  <ProductCard product={item.product} categorySlug={categorySlug} />
                ) : (
                  <div className="border border-gray-200 rounded-lg h-full" />
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={handleNext}
          disabled={startIndex === maxStart}
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}
