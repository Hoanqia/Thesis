// components/RateOrderModal.tsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Order } from '@/features/orders/api/orderApi';
import { reviewApi, CreateReviewPayload } from '@/features/reviews/api/reviewApi';
import { variantApi } from '@/features/variants/api/variantApi';
import { Spin } from 'antd';
import toast, { Toaster } from 'react-hot-toast';
import { Star } from 'lucide-react';

interface RateOrderModalProps {
  order: Order;
  onClose: () => void;
  onSubmit: (reviews: { variantId: number; rating: number; comment: string }[]) => void;
}

export const RateOrderModal: React.FC<RateOrderModalProps> = ({ order, onClose, onSubmit }) => {
  const [reviews, setReviews] = useState(
    order.order_items.map(item => ({ variantId: item.variant_id, rating: 5, comment: '' }))
  );
  const [loading, setLoading] = useState(false);

  const handleReviewChange = (
    index: number,
    field: 'rating' | 'comment',
    value: number | string
  ) => {
    setReviews(prev => {
      const updated = [...prev];
      if (field === 'rating') updated[index].rating = value as number;
      else updated[index].comment = value as string;
      return updated;
    });
  };

  const handleOk = async () => {
    setLoading(true);
    try {
      const payloads: CreateReviewPayload[] = await Promise.all(
        reviews.map(async r => {
          const variant = await variantApi.fetchById(r.variantId);
          return { product_id: variant.product_id, variant_id: r.variantId, rate: r.rating, message: r.comment || undefined };
        })
      );
      await Promise.all(payloads.map(p => reviewApi.createReview(p)));
      toast.success('Gửi đánh giá thành công!');
      onSubmit(reviews);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <>
      <Toaster position="top-center" />
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white rounded-lg p-6 w-[90%] max-w-[500px] max-h-[90vh] overflow-y-auto relative">
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center">
              <Spin />
            </div>
          )}
          <h2 className="text-xl font-semibold mb-4">Đánh giá đơn #{order.id}</h2>

          {order.order_items.map((item, idx) => (
            <div key={item.id} className="border-b pb-4 mb-4">
              <div className="flex items-center mb-2">
                <img
                  src={(item as any).img || '/placeholder.png'}
                  alt={item.variant_name}
                  className="w-16 h-16 object-cover rounded-md mr-4"
                />
                <div className="flex-1">
                  <div className="font-medium mb-1">{item.variant_name}</div>
                  <div className="text-sm text-gray-500 mb-2">Số lượng: {item.quantity}</div>
                  {/* Star rating */}
                  <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map(n => {
                            const filled = reviews[idx].rating >= n;
                            return (
                              <Star
                                key={n}
                                size={24}
                                className={`cursor-pointer ${
                                  filled
                                    ? 'fill-current stroke-current text-yellow-500'
                                    : 'fill-none stroke-current text-gray-300'
                                }`}
                                onClick={() => handleReviewChange(idx, 'rating', n)}
                              />
                            )
                          })}
                  </div>
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium">Nhận xét:</label>
                <textarea
                  value={reviews[idx].comment}
                  onChange={e => handleReviewChange(idx, 'comment', e.target.value)}
                  className="border rounded px-2 py-1 w-full h-20"
                  placeholder="Viết nhận xét..."
                  disabled={loading}
                />
              </div>
            </div>
          ))}

          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              disabled={loading}
            >
              Hủy
            </button>
            <button
              onClick={handleOk}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={loading}
            >
              Gửi đánh giá
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
