"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { customerOrderApi, Order, OrderItem } from "@/features/orders/api/orderApi";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function OrderSuccessPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const rawId = params.get("orderId");
    if (!rawId) return;
    const id = Number(rawId);
    customerOrderApi
      .getOrderDetails(id)
      .then((o) => setOrder(o))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [params]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-gray-500">Đang tải đơn hàng …</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-red-600">Không tìm thấy đơn hàng</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
    >
      <Card className="border-none shadow-lg bg-green-50">
        <CardHeader className="flex items-center bg-green-100 rounded-t-lg">
          <CheckCircle2 className="w-8 h-8 text-green-600 mr-2" />
          <h1 className="text-2xl font-semibold text-green-800">Đặt hàng thành công!</h1>
        </CardHeader>
        <CardContent className="bg-white">
          <p className="text-gray-700 mb-6">
            Cảm ơn bạn đã mua sắm. Đây là chi tiết đơn hàng của bạn:
          </p>

          <div className="space-y-4">
            {order.order_items.map((item: OrderItem) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:shadow transition"
              >
                <div>
                  <p className="font-medium text-gray-800">{item.variant_name}</p>
                  <p className="text-sm text-gray-500">Số lượng: x{item.quantity}</p>
                </div>
                <p className="font-semibold text-gray-900">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-between items-center border-t pt-4">
            <span className="text-lg font-medium text-gray-700">Tổng thanh toán:</span>
            <span className="text-2xl font-bold text-red-600">
              {new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(order.total_price)}
            </span>
          </div>

          <div className="mt-8 text-center">
            <Button onClick={() => router.push("/")} className="px-8 py-2">
              Tiếp tục mua sắm
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
