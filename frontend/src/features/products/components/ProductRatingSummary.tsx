// components/product/ProductRatingSummary.tsx
import React from 'react';
import { Progress } from '@/components/ui/progress'; // Giả định Shadcn/ui Progress component

interface ProductRatingSummaryProps {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { [key: string]: number }; // e.g., { '5': 7, '4': 4, '3': 1, '2': 0, '1': 0 }
}

const ProductRatingSummary: React.FC<ProductRatingSummaryProps> = ({
  averageRating,
  totalReviews,
  ratingDistribution,
}) => {

  const fullStars = Math.floor(averageRating);
const hasHalfStar = averageRating - fullStars >= 0.25 && averageRating - fullStars <= 0.75;
const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);


  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <h2 className="text-xl font-bold mb-4">Đánh giá và bình luận</h2>
      <div className="flex items-center mb-4">
        <span className="text-5xl font-bold text-gray-800 mr-2">{averageRating.toFixed(1)}</span>
        <div className="flex flex-col">
         <div className="flex text-yellow-400">
  {/* ⭐ Full stars */}
  {[...Array(fullStars)].map((_, i) => (
    <svg
      key={`full-${i}`}
      className="w-5 h-5"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.783.57-1.838-.197-1.538-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
    </svg>
  ))}

  {/* 🌓 Half star */}
  {hasHalfStar && (
    <svg
      key="half"
      className="w-5 h-5"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <defs>
        <linearGradient id="halfGrad">
          <stop offset="50%" stopColor="currentColor" />
          <stop offset="50%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        fill="url(#halfGrad)"
        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 
        0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 
        0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 
        1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 
        2.034c-.783.57-1.838-.197-1.538-1.118l1.07-3.292a1 
        1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-
        1.81h3.462a1 1 0 00.95-.69l1.07-3.292z"
      />
    </svg>
  )}

  {/* ⚪ Empty stars */}
  {[...Array(emptyStars)].map((_, i) => (
    <svg
      key={`empty-${i}`}
      className="w-5 h-5 text-gray-300"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 
      0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 
      0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 
      1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 
      2.034c-.783.57-1.838-.197-1.538-1.118l1.07-3.292a1 
      1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-
      1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
    </svg>
  ))}
</div>

          <span className="text-gray-600 text-sm">{totalReviews} lượt đánh giá</span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = ratingDistribution[star] || 0;
          const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
          return (
            <div key={star} className="flex items-center">
              <span className="text-sm font-medium w-8">{star}★</span>
              <Progress value={percentage} className="w-full h-2 rounded-full mx-2 bg-gray-200 [&>*]:bg-red-500" />
              <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Nút "Đánh giá sản phẩm" nếu bạn muốn giữ lại */}
      {/* <button className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">
        Đánh giá sản phẩm
      </button> */}
    </div>
  );
};

export default ProductRatingSummary;