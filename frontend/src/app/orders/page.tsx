// app/orders/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { OrderCard } from '@/features/orders/components/OrderCard';
import { RateOrderModal } from '@/features/orders/components/RateOrderModal';
import { customerOrderApi, Order, OrderItem } from '@/features/orders/api/orderApi';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/pagination';

const STATUSES: Array<{ key: Order['status'] | 'all'; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'confirmed', label: 'Xác nhận' },
  { key: 'shipping', label: 'Đang giao' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'canceled', label: 'Đã hủy' },
];
const PAGE_SIZE = 10;

export interface OrderWithReview extends Order {
  hasReviewed: boolean;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithReview[]>([]);
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Mới: state để quản lý modal đánh giá chung
  const [showRateOrderModal, setShowRateOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithReview | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const data = (await customerOrderApi.getUserOrders()) as OrderWithReview[];
      setOrders(data);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách đơn hàng.');
    }
  }

  const handleCancel = async (orderId: number) => {
    try {
      await toast.promise(
        customerOrderApi.cancelOrder(orderId),
        {
          loading: 'Đang hủy đơn...',
          success: 'Hủy đơn thành công!',
          error: 'Hủy đơn thất bại.',
        }
      );
      // Sau khi hủy xong, fetch lại danh sách orders và reset page về 1
      await fetchOrders();
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
    }
  };

  // Mới: gọi khi bấm "Đánh giá cả đơn"
  // Truyền đúng type để khớp OrderCard onRateOrder signature
  const handleRateOrder = (order: Order) => {
    setSelectedOrder(order as OrderWithReview);
    setShowRateOrderModal(true);
  };

  // Mới: xử lý khi submit đánh giá cho tất cả item
  const handleSubmitOrderRatings = async (
    reviews: { variantId: number; rating: number; comment: string }[]
  ) => {
    if (!selectedOrder) return;
    try {
      setShowRateOrderModal(false);
      setSelectedOrder(null);
      await fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = orders
    .filter((o) => statusFilter === 'all' || o.status === statusFilter)
    .filter((o) =>
      o.id.toString().includes(searchTerm) ||
      o.order_items.some((item) =>
        item.variant_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <>
      <Toaster position="top-right" />

      <div className="space-y-6 p-6">
        {/* Tabs phân loại trạng thái */}
        <Tabs
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as Order['status'] | 'all');
            setCurrentPage(1);
          }}
        >
          <TabsList>
            {STATUSES.map((st) => (
              <TabsTrigger key={st.key} value={st.key} className="capitalize">
                {st.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Search */}
        <Input
          placeholder="Tìm kiếm theo ID hoặc tên sản phẩm..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="max-w-lg"
        />

        {/* Danh sách đơn */}
        <div className="grid gap-4">
          {paginated.length > 0 ? (
            paginated.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onCancel={handleCancel}
                onRateOrder={handleRateOrder}
              />
            ))
          ) : (
            <div className="text-center text-muted-foreground py-10">
              Không tìm thấy đơn hàng nào.
            </div>
          )}
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <Pagination className="flex justify-center items-center space-x-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              Trước
            </Button>

            {[...Array(totalPages)].map((_, i) => (
              <Button
                key={i + 1}
                size="sm"
                variant={currentPage === i + 1 ? 'default' : 'ghost'}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              Sau
            </Button>
          </Pagination>
        )}
      </div>

      {/* Mới: Modal đánh giá chung cho một order */}
      {showRateOrderModal && selectedOrder && (
        <RateOrderModal
          order={selectedOrder}
          onClose={() => {
            setShowRateOrderModal(false);
            setSelectedOrder(null);
          }}
          onSubmit={handleSubmitOrderRatings}
        />
      )}
    </>
  );
}
