// components/product/ReviewList.tsx
import React from 'react';
import ReviewCard from '@/features/products/components/ReviewCard'; // Import ReviewCard
import { Review } from '@/features/reviews/api/reviewApi'; // Đảm bảo bạn có interface này

interface ReviewListProps {
  reviews: Review[];
  totalComments: number;
  // Thêm props cho phân trang nếu cần
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

const ReviewList: React.FC<ReviewListProps> = ({
  reviews,
  totalComments,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  return (
    <div className="flex-1 p-6 bg-white rounded-lg shadow-sm border">
      <h2 className="text-xl font-bold mb-4">{totalComments} Bình luận</h2>

      <div className="space-y-6">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))
        ) : (
          <p className="text-center text-gray-500">Chưa có bình luận nào cho sản phẩm này.</p>
        )}
      </div>

      {/* Logic phân trang (ví dụ cơ bản) */}
      {totalPages && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
            onClick={() => onPageChange && onPageChange(currentPage! - 1)}
            disabled={currentPage === 1}
          >
            Trước
          </button>
          <span className="text-sm text-gray-700">
            Trang {currentPage} / {totalPages}
          </span>
          <button
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
            onClick={() => onPageChange && onPageChange(currentPage! + 1)}
            disabled={currentPage === totalPages}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewList;