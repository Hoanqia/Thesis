import React from 'react';
import { Order } from '@/features/orders/api/orderApi';

interface OrderCardProps {
  order: Order;
  onCancel: (orderId: number) => void;
  onRateOrder: (order: Order) => void; // callback để mở form đánh giá chung
}

const cancellableStatuses: Order['status'][] = ['pending', 'shipping', 'confirmed'];

export const OrderCard: React.FC<OrderCardProps> = ({ order, onCancel, onRateOrder }) => {
  const canCancel = cancellableStatuses.includes(order.status);
  const canRate = order.status === 'completed';

  return (
    <div className="border rounded-lg p-4 mb-6 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="font-semibold">Đơn #{order.id}</div>
        <div className="text-sm capitalize px-2 py-1 rounded bg-gray-100 text-gray-700">
          {order.status}
        </div>
      </div>

      {/* Danh sách sản phẩm (chỉ hiển thị, không có nút riêng) */}
      <div className="space-y-4">
        {order.order_items.map(item => (
          <div key={item.id} className="flex items-center justify-between">
            <div className="flex items-center">
              <img
                src={(item as any).img || '/placeholder.png'}
                alt={item.variant_name}
                className="w-16 h-16 object-cover rounded-md mr-4"
              />
              <div>
                <div className="font-medium">{item.variant_name}</div>
                <div className="text-sm text-gray-500">Số lượng: {item.quantity}</div>
              </div>
            </div>
            <div className="font-semibold">
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
                minimumFractionDigits: 0,
              }).format(item.price)}
            </div>
          </div>
        ))}
      </div>

      {/* Footer: Tổng tiền + nút Hủy + nút Đánh giá (chỉ khi status = "completed") */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-lg">
          Thành tiền:{' '}
          <span className="text-red-600">
            {new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
              minimumFractionDigits: 0,
            }).format(order.total_price)}
          </span>
        </div>
        <div className="space-x-2">
          {canCancel && (
            <button
              onClick={() => onCancel(order.id)}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Hủy đơn
            </button>
          )}
          {canRate && (
          <button
              onClick={() => onRateOrder(order)}
              disabled={order.hasReviewed}
              className={`px-4 py-2 rounded text-white ${
                order.hasReviewed
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-yellow-500 hover:bg-yellow-600'
              }`}
            >
              {order.hasReviewed ? 'Đã đánh giá' : 'Đánh giá'}
            </button>

          )}
        </div>
      </div>
    </div>
  );
};
