// components/product/ReviewSection.tsx
'use client';

import React from 'react';
import ProductRatingSummary from './ProductRatingSummary';
import ReviewList from './ReviewList';
import { Review } from '@/features/reviews/api/reviewApi';

interface ReviewSectionProps {
  review_counts: number;
  review_avg_rate: number;
  reviews: Review[];
}

const ReviewSection: React.FC<ReviewSectionProps> = ({
  reviews,
  review_counts,
  review_avg_rate,
}) => {
  const totalComments = review_counts;
  const averageRating = review_avg_rate;


  // Tính distribution: { '5': x, '4': y, ... }
  const ratingDistribution: { [key: string]: number } = {};
  for (let i = 1; i <= 5; i++) {
    ratingDistribution[i] = reviews.filter((r) => r.rate === i).length;
  }

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ===== 1. Tổng quan đánh giá ===== */}
        <div>
          <ProductRatingSummary
            averageRating={averageRating}
            totalReviews={totalComments}
            ratingDistribution={ratingDistribution}
          />
        </div>

        {/* ===== 2. Danh sách bình luận ===== */}
        <div className="lg:col-span-2">
          <ReviewList
            reviews={reviews}
            totalComments={totalComments}
            /* nếu cần phân trang thì truyền thêm currentPage, totalPages, onPageChange */
          />
        </div>
      </div>
    </section>
  );
};

export default ReviewSection;
