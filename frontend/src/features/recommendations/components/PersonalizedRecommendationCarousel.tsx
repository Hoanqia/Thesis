"use client";

import { useEffect, useState, useRef } from "react";
import { recommendApi, RecommendationItem, RecommendationResponse } from "@/features/recommendations/api/recommendationApi";
import { ProductCard } from "@/features/products/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from '@/features/auth/store/useAuthStore'; // Import Zustand store của bạn

// Constants for carousel display
const VISIBLE_SLOTS = 6;
const ITEM_WIDTH_PERCENTAGE = 100 / VISIBLE_SLOTS;

// Component props
interface PersonalizedRecommendationCarouselProps {
  title?: string; // Tiêu đề tùy chỉnh cho carousel, mặc định là "Sản phẩm gợi ý cho bạn"
}

export default function PersonalizedRecommendationCarousel({ title = "Sản phẩm gợi ý cho bạn" }: PersonalizedRecommendationCarouselProps) {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const carouselInnerRef = useRef<HTMLDivElement>(null);

  // Lấy trạng thái isLoggedIn và hàm checkAuth từ Zustand store
  const { isLoggedIn, checkAuth } = useAuthStore(); 

  useEffect(() => {
    // Đảm bảo Zustand store đã hydrate xong và check auth
    setHydrated(true);
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    // Không fetch gì nếu chưa hydrated hoặc không đăng nhập
    if (!hydrated || !isLoggedIn) {
      setLoading(false); // Dừng loading
      setRecommendations([]); // Đảm bảo không có data cũ
      return; // Thoát sớm nếu không đủ điều kiện để fetch
    }

    async function fetchPersonalizedRecommendations() {
      setLoading(true);
      try {
        const res: RecommendationResponse | null = await recommendApi.getRecommendations(); 

        if (res && res.status === "success" && Array.isArray(res.data)) {
          setRecommendations(res.data);
        } else if (res) {
          console.error("Failed to fetch personalized recommendations:", res.message);
        }
      } catch (err) {
        console.error("Error fetching personalized recommendations:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPersonalizedRecommendations();
  }, [hydrated, isLoggedIn]); // Dependencies chỉ cần hydrated và isLoggedIn

  // Cập nhật vị trí cuộn khi currentIndex thay đổi
  useEffect(() => {
    if (carouselInnerRef.current) {
      carouselInnerRef.current.style.transform = `translateX(-${currentIndex * ITEM_WIDTH_PERCENTAGE}%)`;
    }
  }, [currentIndex]);

  // --- LOGIC HIỂN THỊ CÓ ĐIỀU KIỆN ---

  // 1. Nếu chưa hydrated HOẶC không đăng nhập, KHÔNG HIỂN THỊ gì cả.
  //    Điều này sẽ ẩn hoàn toàn carousel cho đến khi người dùng đăng nhập
  //    hoặc dữ liệu từ Zustand store đã sẵn sàng và họ đã đăng nhập.
  if (!hydrated || !isLoggedIn) {
    return null; // Trả về null để ẩn component
  }

  // 2. Nếu đang tải (sau khi đã hydrated và đăng nhập)
  if (loading) {
    return (
      <div className="w-full my-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <div className="flex items-center">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex space-x-4 ml-4 overflow-hidden flex-1">
            {Array.from({ length: VISIBLE_SLOTS }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-shrink-0 w-1/6 h-[360px] rounded-lg"
              />
            ))}
          </div>
          <Skeleton className="w-8 h-8 ml-4 rounded-full" />
        </div>
      </div>
    );
  }

  // 3. Nếu đã đăng nhập, đã tải xong nhưng không có gợi ý nào
  if (recommendations.length === 0) {
    return (
      <div className="w-full my-8">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="text-gray-500">Hiện không có sản phẩm nào để gợi ý cho bạn.</p>
      </div>
    );
  }

  // --- HIỂN THỊ CAROUSEL KHI CÓ DỮ LIỆU ---

  const maxIndex = Math.max(0, recommendations.length - VISIBLE_SLOTS);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
  };

  return (
    <div className="w-full my-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <div className="flex items-center relative">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 z-10 absolute left-0 transform -translate-x-1/2 bg-white shadow-md"
        >
          <ChevronLeft />
        </button>
        <div className="flex-1 overflow-hidden">
          <div
            ref={carouselInnerRef}
            className="flex transition-transform duration-300 ease-in-out"
            style={{ width: `${recommendations.length * ITEM_WIDTH_PERCENTAGE}%` }}
          >
            {recommendations.map((item, idx) => (
              <div key={item.product.id || idx} className="flex-shrink-0" style={{ width: `${ITEM_WIDTH_PERCENTAGE}%` }}>
                <ProductCard product={item.product} categorySlug={item.product.categorySlug || "default-category"} /> 
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={handleNext}
          disabled={currentIndex === maxIndex}
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 z-10 absolute right-0 transform translate-x-1/2 bg-white shadow-md"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}