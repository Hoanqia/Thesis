"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import CrudGeneric, { ActionConfig } from "@/components/ui/CrudGrn";
import {
  fetchGrns,
  deleteGrn,
  confirmGrn, // API confirmGrn sẽ cần được điều chỉnh ở backend
  cancelGrn,
  Grn,
  fetchGrnById, // Import fetchGrnById
  GrnItem, 
  GrnConfirmPayload// Import GrnItem
} from "@/features/grns/api/grnApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input"; // Import Input component
import { Badge } from "@/components/ui/badge"; // Import Badge component
import { toast, Toaster } from 'react-hot-toast'; // Import toast and Toaster

export default function GrnManagementPage() {
  const router = useRouter();
  const [data, setData] = useState<Grn[]>([]);
  const [supplierFilter, setSupplierFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState<boolean>(true); // Thêm state loading

  // State để lưu GRN đang được xem chi tiết trong modal View Details
  const [detailGrn, setDetailGrn] = useState<Grn | null>(null);

  // State để lưu GRN và items của nó cho modal Confirm
  const [confirmingGrn, setConfirmingGrn] = useState<Grn | null>(null);
  // State để lưu trữ received_quantity của từng item trong modal Confirm
  const [receivedQuantities, setReceivedQuantities] = useState<Record<number, number>>({});
  const [confirmModalError, setConfirmModalError] = useState<string>('');


  const loadGrns = useCallback(async () => {
    // toast.loading('Đang tải danh sách phiếu nhập...', { id: 'fetch-grns' });
    try {
      const grns = await fetchGrns();
      setData(grns);
      // toast.success('Lấy danh sách phiếu nhập thành công', { id: 'fetch-grns' });
    } catch (error) {
      console.error("Failed to fetch GRNs:", error);
      toast.error('Lỗi tải danh sách phiếu nhập', { id: 'fetch-grns' });
    } finally {
      setLoading(false); // Đặt loading về false sau khi fetch xong
    }
  }, []); // Dependency rỗng vì hàm này không phụ thuộc vào props hay state bên ngoài

  // 1. Fetch GRN list
  useEffect(() => {
    loadGrns();
  }, [loadGrns]);

  // 2. Filter
  const filtered = useMemo(() => {
    return data.filter((item) => {
      const bySupplier = supplierFilter
        ? item.supplier.name
            .toLowerCase()
            .includes(supplierFilter.toLowerCase())
        : true;
      const byDateFrom = dateFrom
        ? item.expected_delivery_date >= dateFrom
        : true;
      const byDateTo = dateTo
        ? item.expected_delivery_date <= dateTo
        : true;
      return bySupplier && byDateFrom && byDateTo;
    });
  }, [data, supplierFilter, dateFrom, dateTo]);

  // 3. CRUD callbacks: Now call loadGrns after successful operations
  const handleDelete = (id: number) => {
    deleteGrn(id)
      .then(() => {
        toast.success('Xóa phiếu nhập thành công');
        loadGrns();
      })
      .catch((error) => {
        console.error("Failed to delete GRN:", error);
        alert("Xóa phiếu nhập thất bại."); // User-friendly error
      });
  };

  // Thay đổi: handleConfirm giờ sẽ mở modal
  const handleConfirm = useCallback(async (grn: Grn) => {
    const toastId = toast.loading('Đang lấy chi tiết phiếu nhập để xác nhận...');
    try {
      // Lấy chi tiết GRN để đảm bảo có đủ thông tin items
      const grnDetails = await fetchGrnById(grn.id);
      setConfirmingGrn(grnDetails); // Đặt GRN vào state để hiển thị trong modal
      
      // Khởi tạo receivedQuantities với ordered_quantity hoặc received_quantity hiện có
      const initialQuantities: Record<number, number> = {};
      grnDetails.items.forEach(item => {
        // Nếu đã có received_quantity thì dùng, không thì dùng ordered_quantity
        initialQuantities[item.id] = item.received_quantity ?? item.ordered_quantity;
      });
      setReceivedQuantities(initialQuantities);
      setConfirmModalError(''); // Reset lỗi
      toast.success('Đã tải chi tiết phiếu nhập để xác nhận', { id: toastId });
    } catch (error) {
      console.error("Lỗi khi tải chi tiết phiếu nhập để xác nhận:", error);
      toast.error('Lỗi khi tải chi tiết phiếu nhập để xác nhận', { id: toastId });
      setConfirmingGrn(null); // Đóng modal nếu có lỗi
    }
  }, []);

  const handleCancelGrnAction = (grn: Grn) => { // Đổi tên hàm để tránh nhầm lẫn với action của modal
    cancelGrn(grn.id)
      .then(() => {
        toast.success('Hủy phiếu nhập thành công');
        loadGrns();
      })
      .catch((error) => {
        console.error("Failed to cancel GRN:", error);
        alert("Hủy phiếu nhập thất bại.");
      });
  };

  const handleViewDetails = useCallback(async (id: number) => {
    const toastId = toast.loading('Đang lấy chi tiết phiếu nhập...');
    try {
      const grnDetails = await fetchGrnById(id); // Sử dụng hàm fetchGrnById đã import
      setDetailGrn(grnDetails);
      toast.success('Lấy chi tiết phiếu nhập thành công', { id: toastId });
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết phiếu nhập:", error);
      toast.error('Lấy chi tiết phiếu nhập thất bại', { id: toastId });
    }
  }, []);

  const closeDetailModal = () => {
    setDetailGrn(null);
  };

  // Hàm xử lý khi người dùng nhập số lượng thực tế trong modal xác nhận
  const handleReceivedQuantityChange = (itemId: number, value: string) => {
    const numValue = parseInt(value, 10);
    setReceivedQuantities(prev => ({
      ...prev,
      [itemId]: isNaN(numValue) ? 0 : numValue, // Đảm bảo là số, nếu không thì 0
    }));
  };

  // Hàm cuối cùng để gửi xác nhận GRN với số lượng thực tế
const handleFinalConfirmGrn = async () => {
  if (!confirmingGrn) return;

  // Chuẩn bị payload cho API confirmGrn
  const itemsToConfirm = confirmingGrn.items.map(item => {
    const receivedQty = receivedQuantities[item.id];
    if (receivedQty < 0 || isNaN(receivedQty)) {
      setConfirmModalError(`Số lượng nhận thực tế cho SKU "${item.variant?.full_name || item.variant?.sku}" phải là số không âm.`);
      return null; // Dừng xử lý nếu có lỗi
    }
    // Bạn có thể thêm validation: receivedQty > item.ordered_quantity
    // if (receivedQty > item.ordered_quantity) {
    //   setConfirmModalError(`Số lượng nhận thực tế cho SKU "${item.variant?.full_name || item.variant?.sku}" không thể lớn hơn số lượng đặt (${item.ordered_quantity}).`);
    //   return null;
    // }
    return {
      id: item.id, // ID của grn_item
      received_quantity: receivedQty, // Gửi received_quantity mới
    };
  });

  // Lọc bỏ các mục lỗi (nếu có validation trả về null)
  const validItemsToConfirm = itemsToConfirm.filter(item => item !== null);

  if (validItemsToConfirm.length !== itemsToConfirm.length) {
    return; // Dừng nếu có lỗi validation
  }

  const toastId = toast.loading('Đang hoàn tất xác nhận phiếu nhập...');
  try {
    // SỬA LẠI CHỖ NÀY: Gói mảng validItemsToConfirm vào một đối tượng có thuộc tính 'items'
    const payloadForConfirmGrn: GrnConfirmPayload = {
      items: validItemsToConfirm as Array<{ id: number; received_quantity: number }> // Ép kiểu nếu cần thiết, nhưng cấu trúc đã đúng
    };

    await confirmGrn(confirmingGrn.id, payloadForConfirmGrn);
    toast.success('Xác nhận phiếu nhập thành công!', { id: toastId });
    setConfirmingGrn(null); // Đóng modal
    loadGrns(); // Tải lại danh sách GRN
  } catch (error: any) {
    console.error("Lỗi khi hoàn tất xác nhận phiếu nhập:", error);
    setConfirmModalError(error.message || 'Hoàn tất xác nhận phiếu nhập thất bại.');
    toast.error(error.message || 'Hoàn tất xác nhận phiếu nhập thất bại', { id: toastId });
  }
};


  // 4. Table config
  const columns: (keyof Grn)[] = [
    "id",
    "supplier",
    "total_amount",
    "expected_delivery_date",
    "status",
  ];

  const headerLabels: Partial<Record<keyof Grn, string>> = {
    id: "Mã phiếu",
    supplier: "Nhà cung cấp",
    total_amount: "Tổng giá nhập",
    expected_delivery_date: "Ngày nhập dự kiến",
    status: "Trạng thái",
  };

  const renderRow = (item: Grn, column: keyof Grn) => {
    if (column === "supplier") return item.supplier.name;
    if (column === "status") {
      let variant: "default" | "secondary" | "destructive" | "outline" = "default";
      if (item.status === "pending") variant = "destructive";
      else if (item.status === "confirmed") variant = "default";
      else if (item.status === "cancelled") variant = "outline";

      const statusStr = String(item.status);
      return (
        <Badge variant={variant}>
          {statusStr.charAt(0).toUpperCase() + statusStr.slice(1)}
        </Badge>
      );
    }
    if (column === "total_amount") {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(item.total_amount as unknown as number);
    }
    return String(item[column]);
  };

  const renderActions = (item: Grn): ActionConfig<Grn>[] =>
    [
      {
        label: "Xem chi tiết",
        onClick: () => handleViewDetails(item.id),
        className: "text-blue-600",
      },
      item.status === "pending" && {
        label: "Xác nhận",
        onClick: () => handleConfirm(item), // Gọi hàm handleConfirm mới để mở modal
        className: "text-green-600",
      },
      item.status === "pending" && {
        label: "Hủy",
        onClick: () => handleCancelGrnAction(item), // Dùng handleCancelGrnAction
        className: "text-orange-600",
      },
      {
        label: "Xóa",
        onClick: () => handleDelete(item.id),
        className: "text-red-600",
      },
    ].filter(Boolean) as ActionConfig<Grn>[];

  if (loading) {
    return <div className="p-6">Đang tải dữ liệu...</div>;
  }

  return (
    <>
      <Toaster /> {/* Thêm Toaster để hiển thị thông báo */}
      <div className="p-6">
        {/* Header & Create button */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Phiếu nhập hàng</h1>
        
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div>
            <label className="block text-sm mb-1">Ngày bắt đầu</label>
            <input
              type="date"
              className="border px-2 py-1 rounded"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Ngày kết thúc</label>
            <input
              type="date"
              className="border px-2 py-1 rounded"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm mb-1">Nhà cung cấp</label>
            <input
              type="text"
              placeholder="Nhập tên nhà cung cấp"
              className="w-full border px-2 py-1 rounded"
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Data Table */}
        <CrudGeneric<Grn>
          title=""
          initialData={filtered}
          columns={columns}
          headerLabels={headerLabels}
          renderRow={renderRow}
          renderActions={renderActions}
          onCreate={() => router.push("/admin/grns_create")}
          onDelete={handleDelete}
          onToggleStatus={undefined} // GRN không có toggle status như Order
          fields={[]} // GRN không có form edit tại đây
        />
      </div>

      {/* Modal hiển thị chi tiết phiếu nhập hàng (View Details) */}
      {detailGrn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-3/4 max-h-[80vh] overflow-auto p-6 relative">
            <button
              onClick={closeDetailModal}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4">Chi tiết Phiếu nhập hàng #{detailGrn.id}</h2>
            <div className="space-y-2 mb-4 text-sm">
              <p>
                <strong>Mã phiếu:</strong> {detailGrn.code || 'N/A'}
              </p>
              <p>
                <strong>Nhà cung cấp:</strong> {detailGrn.supplier?.name || 'N/A'}
              </p>
              <p>
                <strong>Ngày nhập dự kiến:</strong> {detailGrn.expected_delivery_date}
              </p>
              <p>
                <strong>Tổng giá nhập:</strong>{" "}
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(Number(detailGrn.total_amount))}
              </p>
              <p>
                <strong>Trạng thái:</strong>{" "}
                <Badge
                  variant={
                    detailGrn.status === "pending"
                      ? "destructive"
                      : detailGrn.status === "confirmed"
                      ? "default"
                      : "outline"
                  }
                >
                  {detailGrn.status.charAt(0).toUpperCase() + detailGrn.status.slice(1)}
                </Badge>
              </p>
              <p>
                <strong>Ghi chú:</strong> {detailGrn.notes || "Không có"}
              </p>
              <p>
                <strong>Người tạo:</strong> {detailGrn.user?.name || 'N/A'}
              </p>
              <p>
                <strong>Ngày tạo:</strong>{" "}
                {new Date(detailGrn.created_at).toLocaleString("vi-VN")}
              </p>
            </div>

            <h3 className="text-lg font-semibold mb-2">Mặt hàng trong phiếu nhập:</h3>
            <table className="w-full border-collapse border border-gray-300 mb-4">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-3 py-1">ID</th>
                  <th className="border border-gray-300 px-3 py-1">Tên Variant</th>
                  <th className="border border-gray-300 px-3 py-1">Số lượng đặt</th>
                  <th className="border border-gray-300 px-3 py-1">Số lượng nhận</th>
                  <th className="border border-gray-300 px-3 py-1">Giá đơn vị</th>
                  <th className="border border-gray-300 px-3 py-1">Tổng phụ</th>
                  <th className="border border-gray-300 px-3 py-1">Ảnh</th>
                </tr>
              </thead>
              <tbody>
                {detailGrn.items && detailGrn.items.length > 0 ? (
                  detailGrn.items.map((item) => (
                    <tr key={item.id}>
                      <td className="border border-gray-300 px-3 py-1 text-center">{item.id}</td>
                      <td className="border border-gray-300 px-3 py-1">{item.variant?.full_name || item.variant?.sku || 'N/A'}</td>
                      <td className="border border-gray-300 px-3 py-1 text-center">{item.ordered_quantity}</td>
                      <td className="border border-gray-300 px-3 py-1 text-center">{item.received_quantity ?? 'N/A'}</td>
                      <td className="border border-gray-300 px-3 py-1 text-right">
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(Number(item.unit_cost))}
                      </td>
                      <td className="border border-gray-300 px-3 py-1 text-right">
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(Number(item.subtotal))}
                      </td>
                      <td className="border border-gray-300 px-3 py-1">
                        {item.variant?.image_url && (
                          <img src={item.variant.image_url} alt={item.variant?.full_name || 'Variant Image'} className="h-12 w-12 object-cover mx-auto rounded" />
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="border border-gray-300 px-3 py-1 text-center text-gray-500">
                      Không có mặt hàng nào trong phiếu nhập này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal xác nhận phiếu nhập hàng (Confirm GRN) */}
      {confirmingGrn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-3/4 max-h-[80vh] overflow-auto p-6 relative">
            <button
              onClick={() => setConfirmingGrn(null)} // Close modal
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4">Xác nhận Phiếu nhập hàng #{confirmingGrn.id}</h2>
            
            <p className="mb-4 text-sm text-gray-700">
              Vui lòng nhập số lượng thực tế nhận được cho mỗi mặt hàng.
            </p>

            <h3 className="text-lg font-semibold mb-2">Mặt hàng trong phiếu nhập:</h3>
            <table className="w-full border-collapse border border-gray-300 mb-4">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-3 py-1">Tên Variant</th>
                  <th className="border border-gray-300 px-3 py-1">Số lượng đặt</th>
                  <th className="border border-gray-300 px-3 py-1">Số lượng nhận thực tế</th>
                  <th className="border border-gray-300 px-3 py-1">Giá đơn vị</th>
                  <th className="border border-gray-300 px-3 py-1">Ảnh</th>
                </tr>
              </thead>
              <tbody>
                {confirmingGrn.items && confirmingGrn.items.length > 0 ? (
                  confirmingGrn.items.map((item) => (
                    <tr key={item.id}>
                      <td className="border border-gray-300 px-3 py-1">
                        {item.variant?.full_name || item.variant?.sku || 'N/A'}
                      </td>
                      <td className="border border-gray-300 px-3 py-1 text-center">
                        {item.ordered_quantity}
                      </td>
                      <td className="border border-gray-300 px-3 py-1 text-center">
                        <Input
                          type="number"
                          min={0}
                          value={receivedQuantities[item.id] ?? ''} // Show empty if 0 for better UX, or the actual value
                          onChange={(e) => handleReceivedQuantityChange(item.id, e.target.value)}
                          className="w-24 text-center"
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-1 text-right">
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(Number(item.unit_cost))}
                      </td>
                      <td className="border border-gray-300 px-3 py-1">
                        {item.variant?.image_url && (
                          <img src={item.variant.image_url} alt={item.variant?.full_name || 'Variant Image'} className="h-12 w-12 object-cover mx-auto rounded" />
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="border border-gray-300 px-3 py-1 text-center text-gray-500">
                      Không có mặt hàng nào trong phiếu nhập này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {confirmModalError && (
              <p className="text-red-600 text-sm mb-4">{confirmModalError}</p>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setConfirmingGrn(null)}>
                Hủy
              </Button>
              <Button onClick={handleFinalConfirmGrn}>
                Hoàn tất xác nhận
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// "use client";

// import React, { useState, useEffect, useMemo, useCallback } from "react";
// import { useRouter } from "next/navigation";
// import CrudGeneric, { ActionConfig } from "@/components/ui/CrudGrn";
// import {
//   fetchGrns,
//   deleteGrn,
//   confirmGrn,
//   cancelGrn,
//   Grn,
//   fetchGrnById, // Import fetchGrnById
// } from "@/features/grns/api/grnApi";
// import { Button } from "@/components/ui/Button";
// import { Input } from "@/components/ui/Input"; // Import Input component

// import { Badge } from "@/components/ui/badge"; // Import Badge component
// import { toast, Toaster } from 'react-hot-toast'; // Import toast and Toaster

// export default function GrnManagementPage() {
//   const router = useRouter();
//   const [data, setData] = useState<Grn[]>([]);
//   const [supplierFilter, setSupplierFilter] = useState("");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [loading, setLoading] = useState<boolean>(true); // Thêm state loading

//   // State để lưu GRN đang được xem chi tiết trong modal
//   const [detailGrn, setDetailGrn] = useState<Grn | null>(null);
 

//   const loadGrns = useCallback(async () => {
//     // toast.loading('Đang tải danh sách phiếu nhập...', { id: 'fetch-grns' });
//     try {
//       const grns = await fetchGrns();
//       setData(grns);
//       // toast.success('Lấy danh sách phiếu nhập thành công', { id: 'fetch-grns' });
//     } catch (error) {
//       console.error("Failed to fetch GRNs:", error);
//       toast.error('Lỗi tải danh sách phiếu nhập', { id: 'fetch-grns' });
//     } finally {
//       setLoading(false); // Đặt loading về false sau khi fetch xong
//     }
//   }, []); // Dependency rỗng vì hàm này không phụ thuộc vào props hay state bên ngoài

//   // 1. Fetch GRN list
//   useEffect(() => {
//     loadGrns();
//   }, [loadGrns]);

//   // 2. Filter
//   const filtered = useMemo(() => {
//     return data.filter((item) => {
//       const bySupplier = supplierFilter
//         ? item.supplier.name
//             .toLowerCase()
//             .includes(supplierFilter.toLowerCase())
//         : true;
//       const byDateFrom = dateFrom
//         ? item.expected_delivery_date >= dateFrom
//         : true;
//       const byDateTo = dateTo
//         ? item.expected_delivery_date <= dateTo
//         : true;
//       return bySupplier && byDateFrom && byDateTo;
//     });
//   }, [data, supplierFilter, dateFrom, dateTo]);

//   // 3. CRUD callbacks: Now call loadGrns after successful operations
//   const handleDelete = (id: number) => {
//     deleteGrn(id)
//       .then(() => {
//         toast.success('Xóa phiếu nhập thành công');
//         loadGrns();
//       })
//       .catch((error) => {
//         console.error("Failed to delete GRN:", error);
//         alert("Xóa phiếu nhập thất bại."); // User-friendly error
//       });
//   };

//   const handleConfirm = (grn: Grn) => {
//     confirmGrn(grn.id)
//       .then(() => {
//         toast.success('Xác nhận phiếu nhập thành công');
//         loadGrns();
//       })
//       .catch((error) => {
//         console.error("Failed to confirm GRN:", error);
//         alert("Xác nhận phiếu nhập thất bại."); // User-friendly error
//       });
//   };

//   const handleCancel = (grn: Grn) => {
//     cancelGrn(grn.id)
//       .then(() => {
//         toast.success('Hủy phiếu nhập thành công');
//         loadGrns();
//       })
//       .catch((error) => {
//         console.error("Failed to cancel GRN:", error);
//         alert("Hủy phiếu nhập thất bại."); // User-friendly error
//       });
//   };

//   // Hàm để xem chi tiết GRN
//   const handleViewDetails = useCallback(async (id: number) => {
//     const toastId = toast.loading('Đang lấy chi tiết phiếu nhập...');
//     try {
//       const grnDetails = await fetchGrnById(id); // Sử dụng hàm fetchGrnById đã import
//       setDetailGrn(grnDetails);
//       toast.success('Lấy chi tiết phiếu nhập thành công', { id: toastId });
//     } catch (error) {
//       console.error("Lỗi khi lấy chi tiết phiếu nhập:", error);
//       toast.error('Lấy chi tiết phiếu nhập thất bại', { id: toastId });
//     }
//   }, []); // Sử dụng useCallback cho hàm này

//   const closeDetailModal = () => {
//     setDetailGrn(null);
//   };

//   // 4. Table config
//   const columns: (keyof Grn)[] = [
//     "id",
//     "supplier",
//     "total_amount",
//     "expected_delivery_date",
//     "status",
//   ];

//   const headerLabels: Partial<Record<keyof Grn, string>> = {
//     id: "Mã phiếu",
//     supplier: "Nhà cung cấp",
//     total_amount: "Tổng giá nhập",
//     expected_delivery_date: "Ngày nhập dự kiến",
//     status: "Trạng thái",
//   };

//   const renderRow = (item: Grn, column: keyof Grn) => {
//     if (column === "supplier") return item.supplier.name;
//     if (column === "status") {
//       let variant: "default" | "secondary" | "destructive" | "outline" = "default";
//       if (item.status === "pending") variant = "destructive";
//       else if (item.status === "confirmed") variant = "default";
//       else if (item.status === "cancelled") variant = "outline"; // Thêm trạng thái cancelled

//       const statusStr = String(item.status);
//       return (
//         <Badge variant={variant}>
//           {statusStr.charAt(0).toUpperCase() + statusStr.slice(1)}
//         </Badge>
//       );
//     }
//     if (column === "total_amount") {
//         return new Intl.NumberFormat("vi-VN", {
//             style: "currency",
//             currency: "VND",
//         }).format(item.total_amount as unknown as number);
//     }
//     return String(item[column]);
//   };

//   const renderActions = (item: Grn): ActionConfig<Grn>[] =>
//     [
//       {
//         label: "Xem chi tiết",
//         onClick: () => handleViewDetails(item.id), // Gọi hàm handleViewDetails
//         className: "text-blue-600",
//       },
//       item.status === "pending" && {
//         label: "Xác nhận",
//         onClick: () => handleConfirm(item),
//         className: "text-green-600",
//       },
//       item.status === "pending" && {
//         label: "Hủy",
//         onClick: () => handleCancel(item),
//         className: "text-orange-600",
//       },
//       {
//         label: "Xóa",
//         onClick: () => handleDelete(item.id),
//         className: "text-red-600",
//       },
//     ].filter(Boolean) as ActionConfig<Grn>[];

//   if (loading) {
//     return <div className="p-6">Đang tải dữ liệu...</div>;
//   }

//   return (
//     <>
//       <div className="p-6">
//         {/* Header & Create button */}
//         <div className="flex justify-between items-center mb-4">
//           <h1 className="text-2xl font-bold">Phiếu nhập hàng</h1>
          
//         </div>

//         {/* Filters */}
//         <div className="flex gap-4 mb-6">
//           <div>
//             <label className="block text-sm mb-1">Ngày bắt đầu</label>
//             <input
//               type="date"
//               className="border px-2 py-1 rounded"
//               value={dateFrom}
//               onChange={(e) => setDateFrom(e.target.value)}
//             />
//           </div>
//           <div>
//             <label className="block text-sm mb-1">Ngày kết thúc</label>
//             <input
//               type="date"
//               className="border px-2 py-1 rounded"
//               value={dateTo}
//               onChange={(e) => setDateTo(e.target.value)}
//             />
//           </div>
//           <div className="flex-1">
//             <label className="block text-sm mb-1">Nhà cung cấp</label>
//             <input
//               type="text"
//               placeholder="Nhập tên nhà cung cấp"
//               className="w-full border px-2 py-1 rounded"
//               value={supplierFilter}
//               onChange={(e) => setSupplierFilter(e.target.value)}
//             />
//           </div>
//         </div>

//         {/* Data Table */}
//         <CrudGeneric<Grn>
//           title=""
//           initialData={filtered}
//           columns={columns}
//           headerLabels={headerLabels}
//           renderRow={renderRow}
//           renderActions={renderActions}
//           onCreate={() => router.push("/admin/grns_create")}
//           onDelete={handleDelete}
//           onToggleStatus={undefined} // GRN không có toggle status như Order
//           fields={[]} // GRN không có form edit tại đây
//         />
//       </div>

//       {/* Modal hiển thị chi tiết phiếu nhập hàng */}
//       {detailGrn && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg w-3/4 max-h-[80vh] overflow-auto p-6 relative">
//             <button
//               onClick={closeDetailModal}
//               className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
//             >
//               ✕
//             </button>
//             <h2 className="text-xl font-bold mb-4">Chi tiết Phiếu nhập hàng #{detailGrn.id}</h2>
//             <div className="space-y-2 mb-4 text-sm">
//               <p>
//                 <strong>Mã phiếu:</strong> {detailGrn.id|| 'N/A'}
//               </p>
//               <p>
//                 <strong>Nhà cung cấp:</strong> {detailGrn.supplier?.name || 'N/A'}
//               </p>
//               <p>
//                 <strong>Ngày nhập dự kiến:</strong> {detailGrn.expected_delivery_date}
//               </p>
//               <p>
//                 <strong>Tổng giá nhập:</strong>{" "}
//                 {new Intl.NumberFormat("vi-VN", {
//                   style: "currency",
//                   currency: "VND",
//                 }).format(Number(detailGrn.total_amount))}
//               </p>
//               <p>
//                 <strong>Trạng thái:</strong>{" "}
//                 <Badge
//                   variant={
//                     detailGrn.status === "pending"
//                       ? "destructive"
//                       : detailGrn.status === "confirmed"
//                       ? "default"
//                       : "outline" // default for cancelled, since it's not destructive
//                   }
//                 >
//                   {detailGrn.status.charAt(0).toUpperCase() + detailGrn.status.slice(1)}
//                 </Badge>
//               </p>
//               <p>
//                 <strong>Ghi chú:</strong> {detailGrn.notes || "Không có"}
//               </p>
//               <p>
//                 <strong>Người tạo:</strong> {detailGrn.user?.name || 'N/A'}
//               </p>
//               <p>
//                 <strong>Ngày tạo:</strong>{" "}
//                 {new Date(detailGrn.created_at).toLocaleString("vi-VN")}
//               </p>
//             </div>

//             <h3 className="text-lg font-semibold mb-2">Mặt hàng trong phiếu nhập:</h3>
//             <table className="w-full border-collapse border border-gray-300 mb-4">
//               <thead>
//                 <tr>
//                   <th className="border border-gray-300 px-3 py-1">ID</th>
//                   <th className="border border-gray-300 px-3 py-1">Tên Variant</th>
//                   <th className="border border-gray-300 px-3 py-1">Số lượng đặt</th>
//                   <th className="border border-gray-300 px-3 py-1">Số lượng nhận</th>
//                   <th className="border border-gray-300 px-3 py-1">Giá đơn vị</th>
//                   <th className="border border-gray-300 px-3 py-1">Tổng phụ</th>
//                   <th className="border border-gray-300 px-3 py-1">Ảnh</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {detailGrn.items && detailGrn.items.length > 0 ? (
//                   detailGrn.items.map((item) => (
//                     <tr key={item.id}>
//                       <td className="border border-gray-300 px-3 py-1 text-center">{item.id}</td>
//                       <td className="border border-gray-300 px-3 py-1">{item.variant?.full_name || item.variant?.sku || 'N/A'}</td> {/* Access variant name or SKU */}
//                       <td className="border border-gray-300 px-3 py-1 text-center">{item.ordered_quantity}</td>
//                       <td className="border border-gray-300 px-3 py-1 text-center">{item.received_quantity ?? 'N/A'}</td>
//                       <td className="border border-gray-300 px-3 py-1 text-right">
//                         {new Intl.NumberFormat("vi-VN", {
//                           style: "currency",
//                           currency: "VND",
//                         }).format(Number(item.unit_cost))}
//                       </td>
//                       <td className="border border-gray-300 px-3 py-1 text-right">
//                         {new Intl.NumberFormat("vi-VN", {
//                           style: "currency",
//                           currency: "VND",
//                         }).format(Number(item.subtotal))}
//                       </td>
//                       <td className="border border-gray-300 px-3 py-1">
//                         {/* Use item.variant?.image_url if that's what your API sends, or item.variant?.img if processed on backend */}
//                         {item.variant?.image_url && (
//                           <img src={item.variant.image_url} alt={item.variant?.full_name || 'Variant Image'} className="h-12 w-12 object-cover mx-auto rounded" />
//                         )}
//                       </td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr>
//                     <td colSpan={7} className="border border-gray-300 px-3 py-1 text-center text-gray-500">
//                       Không có mặt hàng nào trong phiếu nhập này.
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }
