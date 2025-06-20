"use client";
import React, { useEffect, useState } from "react";
import CrudGeneric, { ActionConfig, CrudItem } from "@/components/ui/CrudGrn";
import {
  fetchGrns,
  deleteGrn,
  cancelGrn,
  confirmGrn,
  Grn,
  fetchGrnById,
} from "@/features/grns/api/grnApi";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { formatCurrency , formatDate} from "@/lib/utils"; 

// Flattened type for CrudGeneric
interface GrnFlat extends CrudItem {
  purchaseOrderRef: number;
  total_amount: number;
  status: Grn["status"];
  created_at: string;
  __raw: Grn;
}

export default function GrnManagementPage() {
  const [data, setData] = useState<GrnFlat[]>([]);
  const [selected, setSelected] = useState<Grn | null>(null);

  const loadGrns = async () => {
    try {
      const grns = await fetchGrns();
      const flat = grns.map((g) => ({
        id: g.id,
        purchaseOrderRef: g.purchase_order.id,
        total_amount: g.total_amount,
        status: g.status,
        created_at: g.created_at,
        __raw: g,
      } as GrnFlat));
      setData(flat);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadGrns(); }, []);

  const handleDelete = async (item: GrnFlat) => { await deleteGrn(item.id); loadGrns(); };
  const handleCancel = async (item: GrnFlat) => { await cancelGrn(item.id); loadGrns(); };
 const handleConfirm = async (item: GrnFlat) => {
    try {
      const fullGrnDetails = await fetchGrnById(item.id);

      // Quan trọng: Thay đổi lại tên thuộc tính thành 'quantity' để khớp với Backend Laravel Validate
      const payload = {
        items: fullGrnDetails.items.map(it => ({
          id: it.id,
          quantity: it.quantity // <-- Đã đổi lại thành 'quantity'
        }))
      };

      await confirmGrn(item.id, payload);
      loadGrns();

    } catch (error) {
      console.error("Lỗi khi xác nhận GRN:", error);
      // Xử lý lỗi
    }
  };

  const actions = (item: GrnFlat): ActionConfig<GrnFlat>[] => {
    const viewDetail = async () => {
      try {
        const detail = await fetchGrnById(item.id);
        setSelected(detail);
      } catch (err) {
        console.error('Error loading detail:', err);
      }
    };
    const ops: ActionConfig<GrnFlat>[] = [
      { label: "Xem", onClick: () => viewDetail(), className: "text-blue-600" },
      { label: "Xóa", onClick: () => handleDelete(item), className: "text-red-600" },
    ];
    if (item.status === "pending") {
      ops.unshift(
        { label: "Confirm", onClick: () => handleConfirm(item), className: "text-green-600" },
        { label: "Cancel", onClick: () => handleCancel(item), className: "text-yellow-600" }
      );
    }
    return ops;
  };


  // HÀM RENDER ROW TÙY CHỈNH
  const renderGrnRow = (item: GrnFlat, col: keyof GrnFlat) => {
    if (col === "status") {
      return (
        <Badge
          variant={
            item.status === "confirmed"
              ? "default"
              : item.status === "pending"
              ? "secondary"
              : "destructive"
          }
        >
          {item.status}
        </Badge>
      );
    }
    // Xử lý các cột khác nếu cần format đặc biệt
     if (col === "total_amount") {
      // Sử dụng hàm formatCurrency
      return formatCurrency(item.total_amount); 
    }
    if (col === "created_at") {
        // Sử dụng hàm formatDate
        return formatDate(item.created_at);
    }
    // Mặc định hiển thị giá trị như chuỗi
    return String(item[col]);
  };

  return (
    <>
      <CrudGeneric<GrnFlat>
        title="Quản lý GRNs"
        initialData={data}
        columns={["id", "purchaseOrderRef", "total_amount", "status", "created_at"]}
        headerLabels={{ id: "ID", purchaseOrderRef: "Đơn hàng", total_amount: "Tổng tiền", status: "Trạng thái", created_at: "Ngày tạo" }}
        fields={[]}
        renderActions={item => actions(item)}
        renderRow={renderGrnRow}
      />

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-lg">
            <div className="flex justify-between items-center border-b px-6 py-4">
              <h2 className="text-xl font-semibold">Chi tiết GRN #{selected.id}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="font-medium">Loại:</span> {selected.type}</div>
                <div><span className="font-medium">PO:</span> PO-{selected.purchase_order.id}</div>
                <div><span className="font-medium">Người tạo:</span> {selected.user.name}</div>
                <div><span className="font-medium">Ghi chú:</span> {selected.notes || '-'}</div>
                <div><span className="font-medium">Tổng tiền:</span> {selected.total_amount.toLocaleString()} đ</div>
                <div><span className="font-medium">Ngày tạo:</span> {new Date(selected.created_at).toLocaleString()}</div>
                <div className="col-span-2">
                  <span className="font-medium">Trạng thái:</span>
                  <Badge variant={selected.status === 'confirmed' ? 'default' : selected.status === 'pending' ? 'secondary' : 'destructive'}>
                    {selected.status}
                  </Badge>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Mặt hàng trong đơn:</h3>
                {selected.items?.length ? (
                  <table className="w-full table-auto border-collapse border border-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border px-2 py-1">ID</th>
                        <th className="border px-2 py-1">Sản phẩm</th>
                        <th className="border px-2 py-1">Số lượng</th>
                        <th className="border px-2 py-1">Đơn giá</th>
                        <th className="border px-2 py-1">Subtotal</th>
                        <th className="border px-2 py-1">Ảnh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.items.map(it => (
                        <tr key={it.id} className="hover:bg-gray-50">
                          <td className="border px-2 py-1">{it.id}</td>
                          <td className="border px-2 py-1">{it.purchase_order_item.variant.full_name}</td>
                          <td className="border px-2 py-1">{it.quantity}</td>
                          <td className="border px-2 py-1">{it.unit_cost?.toLocaleString() || 0} đ</td>
                          <td className="border px-2 py-1">{it.subtotal?.toLocaleString() || 0} đ</td>
                          <td className="border px-2 py-1 text-center">
                            {it.purchase_order_item.variant.image_url ? (
                              <img src={it.purchase_order_item.variant.image_url} alt="" className="h-12 mx-auto" />
                            ) : (
                              <span className="text-gray-500">No image</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center text-gray-500 py-4">Không có mặt hàng</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
