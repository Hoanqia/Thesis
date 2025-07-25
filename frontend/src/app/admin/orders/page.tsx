// frontend/src/app/admin/orders/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import CrudGeneric, {
  FieldConfig,
} from "@/components/ui/CrudOder"; // Đổi tên file thành CrudOrder.tsx nếu cần
import { Badge } from "@/components/ui/badge";
import { adminOrderApi, Order, PaginationParams } from "@/features/orders/api/orderApi";
import { toast, Toaster } from 'react-hot-toast';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(10); // Số lượng mục trên mỗi trang
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Modal để hiển thị chi tiết đơn hàng
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  // Sử dụng useCallback để tránh tạo lại hàm fetchOrders mỗi lần render
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminOrderApi.getAllOrders({ page: currentPage, per_page: perPage });
      setOrders(response.data);
      if (response.pagination) {
        setTotalItems(response.pagination.total);
        setTotalPages(response.pagination.last_page);
        setCurrentPage(response.pagination.current_page); // Đảm bảo currentPage được đồng bộ với API
        setPerPage(response.pagination.per_page); // Đảm bảo perPage được đồng bộ với API
      }
      toast.success('Lấy danh sách đơn hàng thành công', { id: 'fetch-orders' });
    } catch (error) {
      console.error("Lỗi khi lấy danh sách đơn hàng:", error);
      toast.error('Lỗi tải đơn hàng', { id: 'fetch-orders' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage]); // Dependency array: fetchOrders sẽ chạy lại khi currentPage hoặc perPage thay đổi

  // Fetch tất cả đơn hàng khi mount hoặc khi currentPage/perPage thay đổi
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]); // Dependency on fetchOrders (which itself depends on currentPage, perPage)

  // Callback khi xóa
  const handleDelete = async (id: number) => {
    try {
      await adminOrderApi.deleteOrder(id);
      toast.success('Xóa đơn hàng thành công');
      // Sau khi xóa, fetch lại dữ liệu để cập nhật danh sách
      // Nếu trang hiện tại không còn item nào, quay lại trang trước
      if (orders.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else {
        fetchOrders();
      }
    } catch (error) {
      console.error("Lỗi khi xóa đơn hàng:", error);
      toast.error('Xóa đơn hàng thất bại');
      fetchOrders(); // Fetch lại để đảm bảo trạng thái đúng
    }
  };

  const STATUS_FLOW: Order["status"][] = [
    "pending",
    "confirmed",
    "shipping",
    "completed",
    "canceled",
  ];

  const handleToggleStatus = async (id: number) => {
    try {
      const order = orders.find(o => o.id === id);
      if (!order) throw new Error('Order not found');
      const currentIdx = STATUS_FLOW.indexOf(order.status);
      const nextStatus = STATUS_FLOW[(currentIdx + 1) % STATUS_FLOW.length];

      await adminOrderApi.updateOrderStatus(id, nextStatus);
      toast.success('Cập nhật trạng thái thành công');
      fetchOrders(); // Fetch lại để cập nhật trạng thái mới nhất
    } catch (error) {
      console.error("Lỗi khi chuyển trạng thái đơn hàng:", error);
      toast.error('Cập nhật trạng thái thất bại');
      fetchOrders(); // Fetch lại để đảm bảo trạng thái đúng
    }
  };

  const markAsPaid = async (id: number) => {
    try {
      await adminOrderApi.markAsPaid(id);
      toast.success('Đánh dấu đã thanh toán thành công');
      fetchOrders(); // Fetch lại để cập nhật trạng thái mới nhất
    } catch (error) {
      console.error("Lỗi khi đánh dấu đã thanh toán:", error);
      toast.error('Đánh dấu thanh toán thất bại');
      fetchOrders(); // Fetch lại để đảm bảo trạng thái đúng
    }
  };

  const confirm_order = async (id: number): Promise<void> => {
    const toastId = toast.loading('Đang xác nhận đơn hàng...');
    try {
      await adminOrderApi.confirmOrder(id);
      await fetchOrders(); // Fetch lại để cập nhật UI
      toast.success('Xác nhận đơn hàng thành công', { id: toastId });
    } catch (error: any) {
      console.error("Lỗi khi xác nhận đơn hàng:", error);
      toast.error(error?.message || 'Xác nhận đơn hàng thất bại', { id: toastId });
    }
  };

  // Callback khi tạo mới (Admin không tạo được đơn hàng)
  const handleCreate = async (_item: Omit<Order, "id">) => {
    toast('Admin không thể tạo mới đơn hàng từ giao diện này.', { icon: 'ℹ️' });
  };

  // Callback khi xem chi tiết
  const handleViewDetails = async (id: number) => {
    try {
      const data = await adminOrderApi.getOrderById(id);
      setDetailOrder(data); // Lấy data từ response
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết đơn hàng:", error);
      toast.error('Lấy chi tiết đơn hàng thất bại');
    }
  };

  const closeDetailModal = () => {
    setDetailOrder(null);
  };

  const fields: (keyof Order)[] = ["status", "is_paid"];
  const fieldsConfig: Partial<Record<keyof Order, FieldConfig>> = {
    status: {
      label: "Trạng thái",
      type: "select",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Confirmed", value: "confirmed" },
        { label: "Shipping", value: "shipping" },
        { label: "Completed", value: "completed" },
        { label: "Canceled", value: "canceled" },
      ],
      required: true,
    },
    is_paid: {
      label: "Đã thanh toán",
      type: "checkbox",
    },
  };

  const columns: (keyof Order)[] = [
    "id",
    "user_id",
    "status",
    "is_paid",
    "total_price",
    "created_at",
  ];
  const headerLabels: Partial<Record<keyof Order, string>> = {
    id: "ID",
    user_id: "User ID",
    status: "Status",
    is_paid: "Paid",
    total_price: "Total Price",
    created_at: "Created At",
  };

  const renderRow = (item: Order, column: keyof Order) => {
    switch (column) {
      case "status": {
        let variant: "default" | "secondary" | "destructive" | "outline" = "default";
        if (item.status === "pending") variant = "destructive";
        else if (item.status === "confirmed") variant = "default";
        else if (item.status === "shipping") variant = "secondary";
        else if (item.status === "completed") variant = "secondary";
        else if (item.status === "canceled") variant = "outline";

        const statusStr = String(item.status);
        return (
          <Badge variant={variant}>
            {statusStr.charAt(0).toUpperCase() + statusStr.slice(1)}
          </Badge>
        );
      }
      case "is_paid":
        return item.is_paid ? (
          <Badge variant="default">Yes</Badge>
        ) : (
          <Badge variant="destructive">No</Badge>
        );
      case "total_price":
        return new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(item.total_price as unknown as number);
      default:
        return String(item[column]);
    }
  };

  if (loading) {
    return <div className="p-6">Đang tải dữ liệu...</div>;
  }

  return (
    <>
      <div className="p-6">
        <CrudGeneric<Order>
          title="Quản lý Đơn hàng"
          initialData={orders} // Truyền dữ liệu đã được phân trang từ API
          columns={columns}
          headerLabels={headerLabels}
          renderRow={renderRow}
          onCreate={handleCreate}
          onUpdate={undefined}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
          renderActions={(item) => [
            {
              label: "Xem chi tiết",
              onClick: () => handleViewDetails(item.id),
              className: "text-blue-600",
            },
            {
              label: item.status === "pending" ? "Xác nhận đơn hàng" : "Đã xác nhận",
              onClick: item.status === "pending" ? () => confirm_order(item.id) : () => {},
              className: item.status === "pending"
                ? "text-green-600"
                : "text-gray-400 cursor-not-allowed",
            },
            {
              label: item.is_paid ? "Đã thanh toán" : "Xác nhận thanh toán",
              onClick: () => markAsPaid(item.id),
              className: item.is_paid ? "text-gray-400 cursor-not-allowed" : "text-green-600",
            },
          ]}
          fields={fields}
          fieldsConfig={fieldsConfig}
          // Props mới cho phân trang
          currentPage={currentPage}
          totalItems={totalItems}
          perPage={perPage}
          onPageChange={setCurrentPage}
          onPerPageChange={setPerPage}
        />
      </div>

      {detailOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-3/4 max-h-[80vh] overflow-auto p-6 relative">
            <button
              onClick={closeDetailModal}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4">Chi tiết Đơn hàng #{detailOrder.id}</h2>
            <div className="space-y-2 mb-4">
              <p>
                <strong>Người nhận:</strong> {detailOrder.recipient_name}
              </p>
              <p>
                <strong>Điện thoại:</strong> {detailOrder.recipient_phone}
              </p>
              <p>
                <strong>Địa chỉ:</strong> {detailOrder.recipient_address}, {detailOrder.ward}, {detailOrder.district}, {detailOrder.province}
              </p>
              <p>
                <strong>Phí vận chuyển:</strong>{" "}
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(Number(detailOrder.shipping_fee))}
              </p>
              <p>
                <strong>Giảm giá trên sản phẩm:</strong>{" "}
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(Number(detailOrder.discount_on_products))}
              </p>
              <p>
                <strong>Giảm giá vận chuyển:</strong>{" "}
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(Number(detailOrder.discount_on_shipping))}
              </p>
              <p>
                <strong>Tổng tiền:</strong>{" "}
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(Number(detailOrder.total_price))}
              </p>
              <p>
                <strong>Trạng thái:</strong>{" "}
                <Badge
                  variant={
                    detailOrder.status === "pending"
                      ? "destructive"
                      : detailOrder.status === "confirmed"
                      ? "default"
                      : detailOrder.status === "shipping"
                      ? "secondary"
                      : detailOrder.status === "completed"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {detailOrder.status.charAt(0).toUpperCase() + detailOrder.status.slice(1)}
                </Badge>
              </p>
              <p>
                <strong>Thanh toán:</strong>{" "}
                {detailOrder.is_paid ? (
                  <Badge variant="default">Yes</Badge>
                ) : (
                  <Badge variant="destructive">No</Badge>
                )}
              </p>
              <p>
                <strong>Tạo lúc:</strong>{" "}
                {new Date(detailOrder.created_at).toLocaleString("vi-VN")}
              </p>
            </div>

            <h3 className="text-lg font-semibold mb-2">Mặt hàng trong đơn:</h3>
            <table className="w-full border-collapse border border-gray-300 mb-4">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-3 py-1">ID</th>
                  <th className="border border-gray-300 px-3 py-1">Tên sản phẩm</th>
                  <th className="border border-gray-300 px-3 py-1">Giá</th>
                  <th className="border border-gray-300 px-3 py-1">Số lượng</th>
                  <th className="border border-gray-300 px-3 py-1">Ảnh</th>
                </tr>
              </thead>
              <tbody>
                {detailOrder.order_items.map((item) => (
                  <tr key={item.id}>
                    <td className="border border-gray-300 px-3 py-1 text-center">{item.id}</td>
                    <td className="border border-gray-300 px-3 py-1">{item.variant_name}</td>
                    <td className="border border-gray-300 px-3 py-1 text-right">
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(Number(item.price))}
                    </td>
                    <td className="border border-gray-300 px-3 py-1 text-center">
                      {item.quantity}
                    </td>
                    <td className="border border-gray-300 px-3 py-1">
                      {item.img && (
                        <img src={item.img} alt={item.variant_name} className="h-12 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
    </>
  );
}

// // frontend/src/app/admin/orders/page.tsx
// "use client";

// import React, { useState, useEffect } from "react";
// import CrudGeneric, {
//   FieldConfig,
// } from "@/components/ui/CrudOder";
// import { Badge } from "@/components/ui/badge";
// import { adminOrderApi, Order } from "@/features/orders/api/orderApi";
// import { toast, Toaster } from 'react-hot-toast';

// export default function AdminOrdersPage() {
//   const [orders, setOrders] = useState<Order[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);

//   // Modal để hiển thị chi tiết đơn hàng
//   const [detailOrder, setDetailOrder] = useState<Order | null>(null);

//    async function fetchOrders() {
//       // toast.loading('Đang tải danh sách đơn hàng...', { id: 'fetch' });
//       try {
//         const data = await adminOrderApi.getAllOrders();
//         setOrders(data);
//         // toast.success('Lấy danh sách đơn hàng thành công', { id: 'fetch' });
//       } catch (error) {
//         console.error("Lỗi khi lấy danh sách đơn hàng:", error);
//         toast.error('Lỗi tải đơn hàng', { id: 'fetch' });
//       } finally {
//         setLoading(false);
//       }
//     }

//   // Fetch tất cả đơn hàng khi mount
//   useEffect(() => {
   
//     fetchOrders();
//   }, []);

//   // Callback khi xóa
//   const handleDelete = async (id: number) => {
//     try {
//       await adminOrderApi.deleteOrder(id);
//       setOrders((prev) => prev.filter((o) => o.id !== id));
//       toast.success('Xóa đơn hàng thành công');
//          fetchOrders();

//     } catch (error) {
//       console.error("Lỗi khi xóa đơn hàng:", error);
//       toast.error('Xóa đơn hàng thất bại');
//             fetchOrders();

//     }
//   };

//   const STATUS_FLOW: Order["status"][] = [
//     "pending",
//     "confirmed",
//     "shipping",
//     "completed",
//     "canceled",
//   ];

//   const handleToggleStatus = async (id: number) => {
//     try {
//       const order = orders.find(o => o.id === id);
//       if (!order) throw new Error('Order not found');
//       const currentIdx = STATUS_FLOW.indexOf(order.status);
//       const nextStatus = STATUS_FLOW[(currentIdx + 1) % STATUS_FLOW.length];

//       await adminOrderApi.updateOrderStatus(id, nextStatus);
//       setOrders(prev =>
//         prev.map(o =>
//           o.id === id ? { ...o, status: nextStatus } : o
//         )
//       );
//       toast.success('Cập nhật trạng thái thành công');
//         fetchOrders();

//     } catch (error) {
//       console.error("Lỗi khi chuyển trạng thái đơn hàng:", error);
//       toast.error('Cập nhật trạng thái thất bại');
//            fetchOrders();

//     }
//   };

//   const markAsPaid = async (id: number) => {
//     try {
//       await adminOrderApi.markAsPaid(id);
//       setOrders((prev) =>
//         prev.map((o) =>
//           o.id === id
//             ? { ...o, is_paid: true }
//             : o
//         )
//       );
//       toast.success('Đánh dấu đã thanh toán thành công' );
//        fetchOrders();

//     } catch (error) {
//       console.error("Lỗi khi đánh dấu đã thanh toán:", error);
//       toast.error('Đánh dấu thanh toán thất bại');
//        fetchOrders();

//     }
//   };

// const confirm_order = async (id: number): Promise<void> => {
//   // Tạo loading toast, giữ lại id
//   const toastId = toast.loading('Đang xác nhận đơn hàng...');
//   try {
//     await adminOrderApi.confirmOrder(id);
//     // Cập nhật UI
//     await fetchOrders();
//     // Đổi sang success
//     toast.success('Xác nhận đơn hàng thành công', { id: toastId });
//   } catch (error: any) {
//     console.error("Lỗi khi xác nhận đơn hàng:", error);
//     // Đổi sang error
//     toast.error(error?.message || 'Xác nhận đơn hàng thất bại', { id: toastId });
//   }
// };


//   // Callback khi tạo mới (Admin không tạo được đơn hàng)
//   const handleCreate = async (_item: Omit<Order, "id">) => {
//     toast('Admin không thể tạo mới đơn hàng từ giao diện này.', { icon: 'ℹ️' });
//   };

//   // Callback khi xem chi tiết
//   const handleViewDetails = async (id: number) => {
//     // const toastId = toast.loading('Đang lấy chi tiết đơn hàng...');
//     try {
//       const data = await adminOrderApi.getOrderById(id);
//       setDetailOrder(data);
//       // toast.success('Lấy chi tiết đơn hàng thành công', { id: toastId });
//     } catch (error) {
//       console.error("Lỗi khi lấy chi tiết đơn hàng:", error);
//       // toast.error('Lấy chi tiết đơn hàng thất bại', { id: toastId });
//     }
//   };

//   const closeDetailModal = () => {
//     setDetailOrder(null);
//   };

//   const fields: (keyof Order)[] = ["status", "is_paid"];
//   const fieldsConfig: Partial<Record<keyof Order, FieldConfig>> = {
//     status: {
//       label: "Trạng thái",
//       type: "select",
//       options: [
//         { label: "Pending", value: "pending" },
//         { label: "Confirmed", value: "confirmed" },
//         { label: "Shipping", value: "shipping" },
//         { label: "Completed", value: "completed" },
//         { label: "Canceled", value: "canceled" },
//       ],
//       required: true,
//     },
//     is_paid: {
//       label: "Đã thanh toán",
//       type: "checkbox",
//     },
//   };

//   const columns: (keyof Order)[] = [
//     "id",
//     "user_id",
//     "status",
//     "is_paid",
//     "total_price",
//     "created_at",
//   ];
//   const headerLabels: Partial<Record<keyof Order, string>> = {
//     id: "ID",
//     user_id: "User ID",
//     status: "Status",
//     is_paid: "Paid",
//     total_price: "Total Price",
//     created_at: "Created At",
//   };

//   const renderRow = (item: Order, column: keyof Order) => {
//     switch (column) {
//       case "status": {
//         let variant: "default" | "secondary" | "destructive" | "outline" = "default";
//         if (item.status === "pending") variant = "destructive";
//         else if (item.status === "confirmed") variant = "default";
//         else if (item.status === "shipping") variant = "secondary";
//         else if (item.status === "completed") variant = "secondary";
//         else if (item.status === "canceled") variant = "outline";

//         const statusStr = String(item.status);
//         return (
//           <Badge variant={variant}>
//             {statusStr.charAt(0).toUpperCase() + statusStr.slice(1)}
//           </Badge>
//         );
//       }
//       case "is_paid":
//         return item.is_paid ? (
//           <Badge variant="default">Yes</Badge>
//         ) : (
//           <Badge variant="destructive">No</Badge>
//         );
//       case "total_price":
//         return new Intl.NumberFormat("vi-VN", {
//           style: "currency",
//           currency: "VND",
//         }).format(item.total_price as unknown as number);
//       default:
//         return String(item[column]);
//     }
//   };

//   if (loading) {
//     return <div className="p-6">Đang tải dữ liệu...</div>;
//   }

//   return (
//     <>
//       <div className="p-6">
//         <CrudGeneric<Order>
//           title="Quản lý Đơn hàng"
//           initialData={orders}
//           columns={columns}
//           headerLabels={headerLabels}
//           renderRow={renderRow}
//           onCreate={handleCreate}
//           onUpdate={undefined}
//           onDelete={handleDelete}
//           onToggleStatus={handleToggleStatus}
//           renderActions={(item) => [
//             {
//               label: "Xem chi tiết",
//               onClick: () => handleViewDetails(item.id),
//               className: "text-blue-600",
//             },
//              {
//               label: item.status === "pending" ? "Xác nhận đơn hàng" : "Đã xác nhận",
//               onClick: item.status === "pending" ? () => confirm_order(item.id) : () => {},
//               className: item.status === "pending"
//                 ? "text-green-600"
//                 : "text-gray-400 cursor-not-allowed",
//             },
//             {
//               label: item.is_paid ? "Đã thanh toán" : "Xác nhận thanh toán",
//               onClick: () => markAsPaid(item.id),
//               className: item.is_paid ? "text-gray-400 cursor-not-allowed" : "text-green-600",
//             },

            
//           ]}
          
//           fields={fields}
//           fieldsConfig={fieldsConfig}
//         />
//       </div>

//       {detailOrder && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg w-3/4 max-h-[80vh] overflow-auto p-6 relative">
//             <button
//               onClick={closeDetailModal}
//               className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
//             >
//               ✕
//             </button>
//             <h2 className="text-xl font-bold mb-4">Chi tiết Đơn hàng #{detailOrder.id}</h2>
//               {/* Modal hiển thị chi tiết đơn hàng */}
//               {detailOrder && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg w-3/4 max-h-[80vh] overflow-auto p-6 relative">
//             <button
//               onClick={closeDetailModal}
//               className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
//             >
//               ✕
//             </button>
//             <h2 className="text-xl font-bold mb-4">Chi tiết Đơn hàng #{detailOrder.id}</h2>
//             <div className="space-y-2 mb-4">
//               <p>
//                 <strong>Người nhận:</strong> {detailOrder.recipient_name}
//               </p>
//               <p>
//                 <strong>Điện thoại:</strong> {detailOrder.recipient_phone}
//               </p>
//               <p>
//                 <strong>Địa chỉ:</strong> {detailOrder.recipient_address}, {detailOrder.ward}, {detailOrder.district}, {detailOrder.province}
//               </p>
//               <p>
//                 <strong>Phí vận chuyển:</strong>{" "}
//                 {new Intl.NumberFormat("vi-VN", {
//                   style: "currency",
//                   currency: "VND",
//                 }).format(Number(detailOrder.shipping_fee))}
//               </p>
//               <p>
//                 <strong>Giảm giá trên sản phẩm:</strong>{" "}
//                 {new Intl.NumberFormat("vi-VN", {
//                   style: "currency",
//                   currency: "VND",
//                 }).format(Number(detailOrder.discount_on_products))}
//               </p>
//               <p>
//                 <strong>Giảm giá vận chuyển:</strong>{" "}
//                 {new Intl.NumberFormat("vi-VN", {
//                   style: "currency",
//                   currency: "VND",
//                 }).format(Number(detailOrder.discount_on_shipping))}
//               </p>
//               <p>
//                 <strong>Tổng tiền:</strong>{" "}
//                 {new Intl.NumberFormat("vi-VN", {
//                   style: "currency",
//                   currency: "VND",
//                 }).format(Number(detailOrder.total_price))}
//               </p>
//               <p>
//                 <strong>Trạng thái:</strong>{" "}
//                 <Badge
//                   variant={
//                     detailOrder.status === "pending"
//                       ? "destructive"
//                       : detailOrder.status === "confirmed"
//                       ? "default"
//                       : detailOrder.status === "shipping"
//                       ? "secondary"
//                       : detailOrder.status === "completed"
//                       ? "secondary"
//                       : "outline"
//                   }
//                 >
//                   {detailOrder.status.charAt(0).toUpperCase() + detailOrder.status.slice(1)}
//                 </Badge>
//               </p>
//               <p>
//                 <strong>Thanh toán:</strong>{" "}
//                 {detailOrder.is_paid ? (
//                   <Badge variant="default">Yes</Badge>
//                 ) : (
//                   <Badge variant="destructive">No</Badge>
//                 )}
//               </p>
//               <p>
//                 <strong>Tạo lúc:</strong>{" "}
//                 {new Date(detailOrder.created_at).toLocaleString("vi-VN")}
//               </p>
//             </div>

//             <h3 className="text-lg font-semibold mb-2">Mặt hàng trong đơn:</h3>
//             <table className="w-full border-collapse border border-gray-300 mb-4">
//               <thead>
//                 <tr>
//                   <th className="border border-gray-300 px-3 py-1">ID</th>
//                   <th className="border border-gray-300 px-3 py-1">Tên sản phẩm</th>
//                   <th className="border border-gray-300 px-3 py-1">Giá</th>
//                   <th className="border border-gray-300 px-3 py-1">Số lượng</th>
//                   <th className="border border-gray-300 px-3 py-1">Ảnh</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {detailOrder.order_items.map((item) => (
//                   <tr key={item.id}>
//                     <td className="border border-gray-300 px-3 py-1 text-center">{item.id}</td>
//                     <td className="border border-gray-300 px-3 py-1">{item.variant_name}</td>
//                     <td className="border border-gray-300 px-3 py-1 text-right">
//                       {new Intl.NumberFormat("vi-VN", {
//                         style: "currency",
//                         currency: "VND",
//                       }).format(Number(item.price))}
//                     </td>
//                     <td className="border border-gray-300 px-3 py-1 text-center">
//                       {item.quantity}
//                     </td>
//                     <td className="border border-gray-300 px-3 py-1">
//                       {item.img && (
//                         <img src={item.img} alt={item.variant_name} className="h-12 mx-auto" />
//                       )}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}
//           </div>
//         </div>
//       )}
//     </>
//   );
// }

