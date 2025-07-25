// ReviewSection.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ProductRatingSummary from './ProductRatingSummary';
import ReviewList from './ReviewList';
// Đảm bảo bạn import đúng ReviewApiResponse nếu cần cho kiểu dữ liệu
import { Review, PaginationMeta, reviewApi, ReviewApiResponse } from '@/features/reviews/api/reviewApi'; 

interface ReviewSectionProps {
  productId: number;
  review_counts: number;
  review_avg_rate: number;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({
  productId,
  review_counts,
  review_avg_rate,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // KHAI BÁO STATE MỚI ĐỂ LƯU TRỮ review_distribution TỪ API
  const [apiRatingDistribution, setApiRatingDistribution] = useState<{ [key: string]: number }>({});

  const reviewsPerPage = 5;

  const fetchReviews = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      // THAY ĐỔI DÒNG NÀY: THÊM 'review_distribution' VÀO DESTRUCTURING
      const { reviews: fetchedReviews, meta, review_distribution } = await reviewApi.getPaginatedReviews(
        productId,
        page,
        reviewsPerPage
      );
      setReviews(fetchedReviews);
      setCurrentPage(meta.current_page);
      setTotalPages(meta.last_page);
      // CẬP NHẬT STATE MỚI VỚI DỮ LIỆU review_distribution TỪ API
      setApiRatingDistribution(review_distribution); 
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setError('Không thể tải bình luận. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [productId, reviewsPerPage]);

  useEffect(() => {
    fetchReviews(currentPage);
  }, [fetchReviews, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const totalComments = review_counts;
  const averageRating = review_avg_rate;

  // XÓA BỎ PHẦN TÍNH TOÁN ratingDistribution THỦ CÔNG NÀY
  // const ratingDistribution: { [key: string]: number } = {};
  // for (let i = 1; i <= 5; i++) {
  //   ratingDistribution[i] = reviews.filter((r) => r.rate === i).length;
  // }

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ===== 1. Tổng quan đánh giá ===== */}
        <div>
          <ProductRatingSummary
            averageRating={averageRating}
            totalReviews={totalComments}
            ratingDistribution={apiRatingDistribution} // <-- TRUYỀN STATE MỚI ĐÃ LẤY TỪ API
          />
        </div>

        {/* ===== 2. Danh sách bình luận ===== */}
        <div className="lg:col-span-2">
          {loading ? (
            <p className="text-center text-gray-500">Đang tải bình luận...</p>
          ) : error ? (
            <p className="text-center text-red-500">{error}</p>
          ) : (
            <ReviewList
              reviews={reviews}
              totalComments={totalComments}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default ReviewSection;