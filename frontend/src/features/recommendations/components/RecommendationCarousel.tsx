
// "use client";

// import { useEffect, useState } from "react";
// import { recommendApi, RecommendationItem , RecommendationResponse} from "@/features/recommendations/api/recommendationApi";
// import { ProductCard } from "@/features/products/components/ProductCard";
// import { Skeleton } from "@/components/ui/skeleton";
// import { ChevronLeft, ChevronRight } from "lucide-react";
// import { useAuthStore } from '@/features/auth/store/useAuthStore';

// const VISIBLE_SLOTS = 6;

// interface RecommendationCarouselProps{
//   categorySlug: string;
//     productSlug?: string;

// }
// export default function RecommendationCarousel({ categorySlug, productSlug }: RecommendationCarouselProps) {
//   const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [startIndex, setStartIndex] = useState(0);
//     const [hydrated, setHydrated] = useState(false);
//     const checkAuth = useAuthStore((state) => state.checkAuth);

//  const isLoggedIn = useAuthStore(state => state.isLoggedIn);

//   // Đợi đến khi trạng thái Zustand hydrate xong

//   useEffect(() => {
//     checkAuth();
//   }, [checkAuth]);

//   useEffect(() => {
//     setHydrated(true);
//   }, []);

//   useEffect(() => {
//     if (!hydrated) return;

//     async function fetchItems() {
//       setLoading(true);
//       try {
//         let res: RecommendationResponse | null = null;

//         // if (isLoggedIn) {
//         //   res = await recommendApi.getRecommendations();
//          if (productSlug) {
//           res = await recommendApi.getSimilarItemsByProductId(productSlug);
//          }

//         if (res && res.status === "success" && Array.isArray(res.data)) {
//           setRecommendations(res.data);
//         } else if (res) {
//           console.error("Failed to fetch recommendations:", res.message);
//         }
//       } catch (err) {
//         console.error("Error fetching recommendations:", err);
//       } finally {
//         setLoading(false);
//       }
//     }

//     fetchItems();
//   }, [hydrated, isLoggedIn, productSlug]);

//   if (loading) {
//     return (
//       <div className="w-full">
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-xl font-bold">Sản phẩm gợi ý</h2>
//         </div>
//         <div className="flex items-center">
//           <Skeleton className="w-8 h-8" />
//           <div className="flex space-x-4 ml-4 overflow-hidden">
//             {Array.from({ length: VISIBLE_SLOTS }).map((_, i) => (
//               <Skeleton
//                 key={i}
//                 className="flex-shrink-0 w-1/6 h-[360px] rounded-lg"
//               />
//             ))}
//           </div>
//           <Skeleton className="w-8 h-8 ml-4" />
//         </div>
//       </div>
//     );
//   }

//   // if (recommendations.length === 0) {
//   //   return null;
//   // }
//   if (!loading && recommendations.length === 0) {
//   return (
//     <div className="w-full">
//       <h2 className="text-xl font-bold mb-2">Sản phẩm gợi ý</h2>
//       <p className="text-gray-500">Không có sản phẩm nào để gợi ý.</p>
//     </div>
//   );
// }

//   const maxStart = Math.max(recommendations.length - VISIBLE_SLOTS, 0);

//   const handlePrev = () => {
//     setStartIndex((prev) => Math.max(prev - 1, 0));
//   };

//   const handleNext = () => {
//     setStartIndex((prev) => Math.min(prev + 1, maxStart));
//   };

//   return (
//     <div className="w-full">
//       <div className="flex justify-between items-center mb-4">
//         <h2 className="text-xl font-bold">Sản phẩm gợi ý</h2>
//       </div>
//       <div className="flex items-center">
//         <button
//           onClick={handlePrev}
//           disabled={startIndex === 0}
//           className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
//         >
//           <ChevronLeft />
//         </button>
//         <div className="flex space-x-4 overflow-hidden flex-1">
//           {Array.from({ length: VISIBLE_SLOTS }).map((_, idx) => {
//             const item = recommendations[startIndex + idx];
//             return (
//               <div key={idx} className="flex-shrink-0 w-1/6">
//                 {item ? (
//                   <ProductCard product={item.product} categorySlug={categorySlug} />
//                 ) : (
//                   <div className="border border-gray-200 rounded-lg h-full" />
//                 )}
//               </div>
//             );
//           })}
//         </div>
//         <button
//           onClick={handleNext}
//           disabled={startIndex === maxStart}
//           className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
//         >
//           <ChevronRight />
//         </button>
//       </div>
//     </div>
//   );
// }
"use client";

import { useEffect, useState, useRef } from "react";
import { recommendApi, RecommendationItem, RecommendationResponse } from "@/features/recommendations/api/recommendationApi";
import { ProductCard } from "@/features/products/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from '@/features/auth/store/useAuthStore';

const VISIBLE_SLOTS = 6;
const ITEM_WIDTH_PERCENTAGE = 100 / VISIBLE_SLOTS; // Mỗi item chiếm bao nhiêu phần trăm chiều rộng của container

interface RecommendationCarouselProps {
  categorySlug: string;
  productSlug?: string;
}

export default function RecommendationCarousel({ categorySlug, productSlug }: RecommendationCarouselProps) {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0); // Đổi tên từ startIndex thành currentIndex để rõ ràng hơn
  const [hydrated, setHydrated] = useState(false);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const carouselInnerRef = useRef<HTMLDivElement>(null); // Ref để điều khiển phần tử bên trong carousel

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
        if (productSlug) {
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
  }, [hydrated, productSlug]); // Loại bỏ isLoggedIn vì không sử dụng trong logic fetchItems hiện tại

  // Cập nhật vị trí cuộn khi currentIndex thay đổi
  useEffect(() => {
    if (carouselInnerRef.current) {
      // Calculate scroll position based on current index and item width
      carouselInnerRef.current.style.transform = `translateX(-${currentIndex * ITEM_WIDTH_PERCENTAGE}%)`;
    }
  }, [currentIndex]);

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Sản phẩm gợi ý</h2>
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

  if (!loading && recommendations.length === 0) {
    return (
      <div className="w-full">
        <h2 className="text-xl font-bold mb-2">Sản phẩm gợi ý</h2>
        <p className="text-gray-500">Không có sản phẩm nào để gợi ý.</p>
      </div>
    );
  }

  const maxIndex = Math.max(0, recommendations.length - VISIBLE_SLOTS);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Sản phẩm gợi ý</h2>
      </div>
      <div className="flex items-center relative"> {/* Thêm relative để định vị nút điều hướng */}
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 z-10 absolute left-0 transform -translate-x-1/2 bg-white shadow-md" // Nút trái
        >
          <ChevronLeft />
        </button>
        <div className="flex-1 overflow-hidden"> {/* Container bao bọc phần tử trượt */}
          <div
            ref={carouselInnerRef}
            className="flex transition-transform duration-300 ease-in-out" // Áp dụng transition ở đây
            style={{ width: `${recommendations.length * ITEM_WIDTH_PERCENTAGE}%` }} // Tổng chiều rộng của tất cả các item
          >
            {recommendations.map((item, idx) => (
              <div key={item.product.id || idx} className="flex-shrink-0" style={{ width: `${ITEM_WIDTH_PERCENTAGE}%` }}>
                <ProductCard product={item.product} categorySlug={categorySlug} />
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={handleNext}
          disabled={currentIndex === maxIndex}
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 z-10 absolute right-0 transform translate-x-1/2 bg-white shadow-md" // Nút phải
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}