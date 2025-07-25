// components/product/ReviewCard.tsx
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Review } from '@/features/reviews/api/reviewApi';

interface ReviewCardProps {
  review: Review;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const timeAgo = review.created_at
    ? formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: vi })
    : 'Vừa xong';

  return (
    <div className="border-b pb-4 last:border-b-0">
      <div className="flex items-start mb-2">
        {/* Avatar mặc định cứng */}
        <img
          src="/avatar-default.png"
          alt="Avatar mặc định"
          loading="lazy"
          className="w-9 h-9 mr-3 rounded-full object-cover bg-gray-100"
        />

        <div className="flex-1">
          <div className="flex items-center mb-1">
            <span className="font-semibold text-gray-800 mr-2">{review.user_name}</span>
            <span className="text-gray-500 text-sm">• {timeAgo}</span>
          </div>
          <div className="flex text-yellow-400 mb-1">
            {[...Array(review.rate)].map((_, i) => (
              <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.783.57-1.838-.197-1.538-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          {review.variant_full_name && (
            <div className="text-gray-500 text-xs mb-2">{review.variant_full_name}</div>
          )}
          <p className="text-gray-700 leading-relaxed text-sm">{review.message}</p>

          {review.admin_reply && (
            <div className="bg-gray-50 p-3 mt-3 rounded-md border border-gray-200">
              <div className="flex items-center mb-1">
                <div className="w-7 h-7 mr-2 flex items-center justify-center bg-blue-100 text-blue-800 font-medium rounded-full">
                  A
                </div>
                <span className="font-semibold text-blue-700 mr-2">Admin</span>
                <Badge variant="secondary" className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs">
                  Quản trị viên
                </Badge>
              </div>
              <p className="text-gray-800 text-sm leading-relaxed">{review.admin_reply}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewCard;
