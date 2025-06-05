"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { customerOrderApi, Order, OrderItem } from "@/features/orders/api/orderApi";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function OrderSuccessPage() {
  const params = useSearchParams();
  const router = useRouter();

  // Lấy orderId (hoặc vnp_TxnRef) và các tham số thanh toán
  const rawOrderId      = params.get("orderId") ?? params.get("vnp_TxnRef");
  const vnpResponseCode = params.get("vnp_ResponseCode");      // chỉ có khi thanh toán VNPAY
  const paymentMethod   = params.get("payment_method");        // e.g. "bank_transfer" hoặc "cod"

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rawOrderId) {
      setLoading(false);
      return;
    }
    const id = Number(rawOrderId);
    customerOrderApi
      .getOrderDetails(id)
      .then((o) => setOrder(o))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [rawOrderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-gray-500">Đang tải đơn hàng…</p>
      </div>
    );
  }

  if (!rawOrderId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-red-600">Không tìm thấy mã đơn hàng trong đường dẫn</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-red-600">Không tìm thấy đơn hàng #{rawOrderId}</p>
      </div>
    );
  }

  // Xác định trạng thái
  const isVnpay     = vnpResponseCode !== null;
  const isVnpayFail = isVnpay && vnpResponseCode !== "00";
  const isBankTran  = paymentMethod === "bank_transfer";
  const isCod       = !isVnpay && !isBankTran;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
    >
      <Card className="border-none shadow-lg bg-green-50">
        <CardHeader
          className={`flex items-center rounded-t-lg ${
            isVnpayFail ? "bg-red-100" : "bg-green-100"
          }`}
        >
          {isVnpayFail ? (
            <XCircle className="w-8 h-8 text-red-600 mr-2" />
          ) : (
            <CheckCircle2 className="w-8 h-8 text-green-600 mr-2" />
          )}
          <h1
            className={`text-2xl font-semibold ${
              isVnpayFail ? "text-red-800" : "text-green-800"
            }`}
          >
            {isVnpayFail
              ? "Thanh toán thất bại"
              : isBankTran
              ? "Chuyển khoản thành công!"
              : "Đặt hàng thành công!"}
          </h1>
        </CardHeader>

        <CardContent className="bg-white">
          {isVnpayFail ? (
            <>
              <p className="text-gray-700 mb-6">
                Rất tiếc, giao dịch VNPAY không thành công (mã: <strong>{vnpResponseCode}</strong>).
                Bạn vui lòng thử lại hoặc liên hệ bộ phận hỗ trợ.
              </p>
              <div className="mt-8 text-center">
                <Button onClick={() => router.push("/")} className="px-8 py-2">
                  Quay về trang chủ
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-700 mb-6">
                {isBankTran
                  ? "Chúng tôi đã nhận được thông tin chuyển khoản của bạn. Dưới đây là chi tiết đơn hàng:"
                  : "Cảm ơn bạn đã mua sắm. Đây là chi tiết đơn hàng của bạn:"}
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
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
