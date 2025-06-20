'use client';
import React, { useEffect, useState } from 'react';
import CrudGeneric, { FieldConfig } from '@/components/ui/CrudOP';
import purchaseOrderApi, { PurchaseOrder } from '@/features/purchase_orders/api/purchaseOrderApi';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import supplierApi from '@/features/suppliers/api/supplierApi';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import  { GrnCreatePayload } from '@/features/grns/api/grnApi'; // Import tất cả từ grnApi và GrnCreatePayload
import * as grnApi from '@/features/grns/api/grnApi';
const PurchaseOrdersPage: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [detailOrder, setDetailOrder] = useState<PurchaseOrder | null>(null);
  const [supplierOptions, setSupplierOptions] = useState<{ label: string; value: number }[]>([]);
  const [isReceiving, setIsReceiving] = useState<boolean>(false);
  const [receivedQuantities, setReceivedQuantities] = useState<Record<number, number>>({});
  const router = useRouter();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await purchaseOrderApi.getAllPurchaseOrders();
      setPurchaseOrders(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    supplierApi.getAll().then(list =>
      setSupplierOptions(list.map(s => ({ label: s.name, value: s.id })))
    );
  }, []);

  const handleCreate = async (
    item: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at' | 'user' | 'supplier' | 'items'> & { items: any[] }
  ) => {
    await purchaseOrderApi.createPurchaseOrder(item);
    fetchAll();
  };

  const handleUpdate = async (
    id: number,
    item: Partial<Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at' | 'user' | 'supplier' | 'items'>>
  ) => {
    await purchaseOrderApi.updatePurchaseOrder(id, item);
    fetchAll();
  };

  const handleDelete = async (id: number) => {
    await purchaseOrderApi.deletePurchaseOrder(id);
    fetchAll();
  };

  const openDetail = async (order: PurchaseOrder) => {
    const res = await purchaseOrderApi.getPurchaseOrderById(order.id);
    setDetailOrder(res.data || null);
    if (res.data) {
      const initialQuantities: Record<number, number> = {};
      res.data.items.forEach(item => {
        initialQuantities[item.id] = 0;
      });
      setReceivedQuantities(initialQuantities);
    }
  };

  const closeDetail = () => {
    setDetailOrder(null);
    setIsReceiving(false);
    setReceivedQuantities({});
  };

  const columns: (keyof PurchaseOrder)[] = ['id', 'supplier_id', 'total_amount', 'status'];
  const fields: (keyof PurchaseOrder)[] = ['supplier_id', 'expected_delivery_date', 'actual_delivery_date', 'total_amount', 'status', 'notes'];

  const headerLabels: Partial<Record<keyof PurchaseOrder, string>> = {
    id: 'ID',
    supplier_id: 'Nhà cung cấp',
    total_amount: 'Tổng tiền',
    status: 'Trạng thái',
  };

  const statusOptions = [
    { label: 'Chờ xử lý', value: 'pending' },
    { label: 'Đã xác nhận', value: 'confirmed' },
    { label: 'Đã giao một phần', value: 'partially_received' },
    { label: 'Đã giao đủ', value: 'received' },
    { label: 'Đã hủy', value: 'cancelled' },
  ];

  const fieldsConfig: Partial<Record<keyof PurchaseOrder, FieldConfig>> = {
    supplier_id: { label: 'Nhà cung cấp', type: 'select', options: supplierOptions, required: true },
    expected_delivery_date: { label: 'Ngày dự kiến', type: 'text' },
    actual_delivery_date: { label: 'Ngày thực tế', type: 'text' },
    total_amount: { label: 'Tổng tiền', type: 'number', required: true },
    status: { label: 'Trạng thái', type: 'select', options: statusOptions, required: true },
    notes: { label: 'Ghi chú', type: 'text' },
  };

  const renderRow = (item: PurchaseOrder, col: keyof PurchaseOrder) => {
    if (col === 'total_amount') {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.total_amount);
    }
    if (col === 'supplier_id') {
      return item.supplier.name;
    }
    if (col === 'status') {
      const statusText = statusOptions.find(s => s.value === item.status)?.label || item.status;
      let badgeClass = '';
      switch (item.status) {
        case 'pending':
          badgeClass = 'bg-yellow-100 text-yellow-800';
          break;
        case 'confirmed':
          badgeClass = 'bg-blue-100 text-blue-800';
          break;
        case 'partially_received':
          badgeClass = 'bg-orange-100 text-orange-800';
          break;
        case 'received':
          badgeClass = 'bg-green-100 text-green-800';
          break;
        case 'cancelled':
          badgeClass = 'bg-red-100 text-red-800';
          break;
        default:
          badgeClass = 'bg-gray-100 text-gray-800';
          break;
      }
      return <Badge className={`px-2 py-1 rounded-full ${badgeClass}`}>{statusText}</Badge>;
    }
    return String(item[col]);
  };

  const handleReceivedQuantityChange = (itemId: number, value: string) => {
    const quantity = parseInt(value, 10);
    if (!isNaN(quantity) && detailOrder) {
      const item = detailOrder.items.find(i => i.id === itemId);
      if (item && quantity >= 0 && quantity <= item.ordered_quantity) {
        setReceivedQuantities(prev => ({ ...prev, [itemId]: quantity }));
      }
    }
  };

  const handleCreateGRN = async () => {
    if (!detailOrder) return;

    const grnItems = Object.keys(receivedQuantities)
      .map(itemId => {
        const id = parseInt(itemId, 10);
        const item = detailOrder.items.find(i => i.id === id);
        const received_quantity = receivedQuantities[id];
                console.log(`Processing item ID: ${id}, received_quantity in state: ${received_quantity}`);

        if (item && received_quantity > 0) {
          return {
            purchase_order_item_id: item.id,
            quantity: received_quantity, // Sử dụng 'quantity' như trong GrnCreatePayload
            unit_cost: item.unit_cost,
          };
        }
        return null;
      })
      .filter(Boolean);

    if (grnItems.length === 0) {
      alert('Vui lòng nhập số lượng nhận cho ít nhất một mặt hàng.');
      return;
    }

    try {
      // Chuẩn bị payload theo đúng định dạng GrnCreatePayload
      const grnCreatePayload: GrnCreatePayload = {
        purchase_order_id: detailOrder.id,
        items: grnItems as GrnCreatePayload['items'], // Ép kiểu để đảm bảo đúng loại
        notes: detailOrder.notes, // Có thể thêm notes nếu cần
      };

      // Gọi API tạo GRN mới
      await grnApi.createGrn(grnCreatePayload);

      // Cập nhật trạng thái Purchase Order và số lượng đã nhận
      let newStatus: PurchaseOrder['status'] = 'received';
      let totalOrdered = 0;
      let totalReceived = 0;

      detailOrder.items.forEach(item => {
        totalOrdered += item.ordered_quantity;
        const currentReceivedForThisItem = (item.received_quantity || 0) + (receivedQuantities[item.id] || 0);
        totalReceived += currentReceivedForThisItem;
      });

      if (totalReceived < totalOrdered) {
        newStatus = 'partially_received';
      }

      await purchaseOrderApi.updatePurchaseOrder(detailOrder.id, {
        status: newStatus,
        actual_delivery_date: new Date().toISOString().split('T')[0],
      });

      alert('Đã tạo phiếu nhập kho thành công!');
      closeDetail();
      fetchAll();
    } catch (error) {
      console.error('Lỗi khi tạo phiếu nhập kho:', error);
      alert('Đã xảy ra lỗi khi tạo phiếu nhập kho.');
    }
  };

  return (
    <div className="p-6">
      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <>
          <CrudGeneric<PurchaseOrder>
            title="Purchase Orders"
            initialData={purchaseOrders}
            columns={columns}
            headerLabels={headerLabels}
            fields={fields}
            fieldsConfig={fieldsConfig}
            renderRow={renderRow}
            onCreate={() => router.push('/admin/purchase_orders/create')}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            renderActions={item => [
              { label: 'Xem chi tiết', onClick: () => openDetail(item), className: 'text-blue-600' },
              {
                label: 'Nhập kho',
                onClick: () => {
                  openDetail(item);
                  setIsReceiving(true);
                },
                className: 'text-green-600',
                disabled: item.status === 'received' || item.status === 'cancelled',
              },
            ]}
          />

          {detailOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b pb-4 mb-4">
                  <h2 className="text-2xl font-bold">Chi tiết Đơn hàng #{detailOrder.id}</h2>
                  <button
                    onClick={closeDetail}
                    className="text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4 my-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                    <p>
                      <strong>Nhà cung cấp:</strong> {detailOrder.supplier.name}
                    </p>
                    <p>
                      <strong>Ngày dự kiến:</strong> {detailOrder.expected_delivery_date ?? 'N/A'}
                    </p>
                    <p>
                      <strong>Ngày thực tế:</strong> {detailOrder.actual_delivery_date ?? 'N/A'}
                    </p>
                    <p>
                      <strong>Tổng tiền:</strong>{' '}
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                        detailOrder.total_amount
                      )}
                    </p>
                    <p className="md:col-span-2">
                      <strong>Trạng thái:</strong> <Badge className={`px-2 py-1 rounded-full ${statusOptions.find(s => s.value === detailOrder.status)?.value === 'pending' ? 'bg-yellow-100 text-yellow-800' : detailOrder.status === 'confirmed' ? 'bg-blue-100 text-blue-800' : detailOrder.status === 'partially_received' ? 'bg-orange-100 text-orange-800' : detailOrder.status === 'received' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{statusOptions.find(s => s.value === detailOrder.status)?.label || detailOrder.status}</Badge>
                    </p>
                    <p className="md:col-span-2">
                      <strong>Ghi chú:</strong> {detailOrder.notes || 'Không có'}
                    </p>
                    <p className="md:col-span-2">
                      <strong>Ngày tạo:</strong> {detailOrder.created_at}
                    </p>
                  </div>

                  <h3 className="text-xl font-bold mt-6 border-t pt-4">Mặt hàng trong đơn</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left">ID</th>
                          <th className="px-4 py-2 text-left">Tên sản phẩm</th>
                          <th className="px-4 py-2 text-right">Giá nhập</th>
                          <th className="px-4 py-2 text-center">SL đặt</th>
                          <th className="px-4 py-2 text-center">SL đã nhận</th>
                          <th className="px-4 py-2 text-center">Ảnh</th>
                          {isReceiving && <th className="px-4 py-2 text-center">SL nhận</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {detailOrder.items.map(item => (
                          <tr key={item.id} className="border-t border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-2">{item.id}</td>
                            <td className="px-4 py-2">{item.variant.full_name}</td>
                            <td className="px-4 py-2 text-right">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                item.unit_cost
                              )}
                            </td>
                            <td className="px-4 py-2 text-center">{item.ordered_quantity}</td>
                            <td className="px-4 py-2 text-center">{item.received_quantity ?? 0}</td>
                            <td className="px-4 py-2 text-center">
                              <img
                                src={item.variant.image_url}
                                alt={item.variant.full_name}
                                className="h-12 w-12 object-cover rounded mx-auto"
                              />
                            </td>
                            {isReceiving && (
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={item.ordered_quantity - (item.received_quantity || 0)}
                                  value={receivedQuantities[item.id] || 0}
                                  onChange={(e) => handleReceivedQuantityChange(item.id, e.target.value)}
                                  className="w-20 p-1 border border-gray-300 rounded text-center"
                                />
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t space-x-2">
                  {isReceiving ? (
                    <button
                      onClick={handleCreateGRN}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-opacity-50"
                    >
                      Xác nhận nhập kho
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsReceiving(true)}
                      className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-opacity-50"
                      disabled={detailOrder.status === 'received' || detailOrder.status === 'cancelled'}
                    >
                      Tạo phiếu nhập kho
                    </button>
                  )}
                  <button
                    onClick={closeDetail}
                    className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PurchaseOrdersPage;
// 'use client';
// import React, { useEffect, useState } from 'react';
// import CrudGeneric, { FieldConfig } from '@/components/ui/CrudOP';
// import purchaseOrderApi, { PurchaseOrder, PurchaseOrderItem } from '@/features/purchase_orders/api/purchaseOrderApi'; // Import PurchaseOrderItem
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
// import { Button } from '@/components/ui/Button';
// import supplierApi from '@/features/suppliers/api/supplierApi';
// import { useRouter } from 'next/navigation';
// import { Badge } from '@/components/ui/badge';
// // Import GRN API nếu bạn đã tạo
// // import grnApi from '@/features/grns/api/grnApi';

// const PurchaseOrdersPage: React.FC = () => {
//   const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [detailOrder, setDetailOrder] = useState<PurchaseOrder | null>(null);
//   const [supplierOptions, setSupplierOptions] = useState<{ label: string; value: number }[]>([]);
//   const [isReceiving, setIsReceiving] = useState<boolean>(false); // Trạng thái để mở/đóng form nhập kho
//   const [receivedQuantities, setReceivedQuantities] = useState<Record<number, number>>({}); // Lưu trữ số lượng nhận được cho từng item
//   const router = useRouter();

//   const fetchAll = async () => {
//     setLoading(true);
//     try {
//       const res = await purchaseOrderApi.getAllPurchaseOrders();
//       setPurchaseOrders(res.data || []);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchAll();
//     supplierApi.getAll().then(list =>
//       setSupplierOptions(list.map(s => ({ label: s.name, value: s.id })))
//     );
//   }, []);

//   const handleCreate = async (
//     item: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at' | 'user' | 'supplier' | 'items'> & { items: any[] }
//   ) => {
//     await purchaseOrderApi.createPurchaseOrder(item);
//     fetchAll();
//   };

//   const handleUpdate = async (
//     id: number,
//     item: Partial<Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at' | 'user' | 'supplier' | 'items'>>
//   ) => {
//     await purchaseOrderApi.updatePurchaseOrder(id, item);
//     fetchAll();
//   };

//   const handleDelete = async (id: number) => {
//     await purchaseOrderApi.deletePurchaseOrder(id);
//     fetchAll();
//   };

//   const openDetail = async (order: PurchaseOrder) => {
//     const res = await purchaseOrderApi.getPurchaseOrderById(order.id);
//     setDetailOrder(res.data || null);
//     // Khởi tạo receivedQuantities khi mở chi tiết đơn hàng
//     if (res.data) {
//       const initialQuantities: Record<number, number> = {};
//       res.data.items.forEach(item => {
//         // Mặc định số lượng nhận bằng số lượng đặt, hoặc số lượng đã nhận nếu có
//         initialQuantities[item.id] = item.received_quantity ?? item.ordered_quantity;
//       });
//       setReceivedQuantities(initialQuantities);
//     }
//   };

//   const closeDetail = () => {
//     setDetailOrder(null);
//     setIsReceiving(false); // Đóng form nhập kho khi đóng chi tiết
//     setReceivedQuantities({}); // Reset số lượng nhận
//   };

//   const columns: (keyof PurchaseOrder)[] = ['id', 'supplier_id', 'total_amount', 'status'];
//   const fields: (keyof PurchaseOrder)[] = ['supplier_id', 'expected_delivery_date', 'actual_delivery_date', 'total_amount', 'status', 'notes'];

//   const headerLabels: Partial<Record<keyof PurchaseOrder, string>> = {
//     id: 'ID',
//     supplier_id: 'Nhà cung cấp',
//     total_amount: 'Tổng tiền',
//     status: 'Trạng thái',
//   };

//   const statusOptions = [
//     { label: 'Chờ xử lý', value: 'pending' },
//     { label: 'Đã xác nhận', value: 'confirmed' },
//     { label: 'Đã giao một phần', value: 'partial_received' }, // Thêm trạng thái này
//     { label: 'Đã giao đủ', value: 'received' }, // Đổi từ "Đã giao" thành "Đã giao đủ"
//     { label: 'Đã hủy', value: 'cancelled' }, // Thêm trạng thái hủy
//   ];

//  const fieldsConfig: Partial<Record<keyof PurchaseOrder, FieldConfig>> = { 
//   supplier_id: { label: 'Nhà cung cấp', type: 'select', options: supplierOptions, required: true }
//    , expected_delivery_date: { label: 'Ngày dự kiến', type: 'text' }
//    , actual_delivery_date: { label: 'Ngày thực tế', type: 'text' }
//    , total_amount: { label: 'Tổng tiền', type: 'number', required: true }
//    , status: { label: 'Trạng thái', type: 'select', options: statusOptions, required: true }
//    , notes: { label: 'Ghi chú', type: 'text' },
//    };

//   const renderRow = (item: PurchaseOrder, col: keyof PurchaseOrder) => {
//     if (col === 'total_amount') {
//       return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.total_amount);
//     }
//     if (col === 'supplier_id') {
//       return item.supplier.name;
//     }
//     if (col === 'status') {
//       const statusText = statusOptions.find(s => s.value === item.status)?.label || item.status;
//       let badgeClass = '';
//       switch (item.status) {
//         case 'pending':
//           badgeClass = 'bg-yellow-100 text-yellow-800';
//           break;
//         case 'confirmed':
//           badgeClass = 'bg-blue-100 text-blue-800';
//           break;
//         case 'partial_received':
//           badgeClass = 'bg-orange-100 text-orange-800';
//           break;
//         case 'received':
//           badgeClass = 'bg-green-100 text-green-800';
//           break;
//         case 'cancelled':
//           badgeClass = 'bg-red-100 text-red-800';
//           break;
//         default:
//           badgeClass = 'bg-gray-100 text-gray-800';
//           break;
//       }
//       return <Badge className={`px-2 py-1 rounded-full ${badgeClass}`}>{statusText}</Badge>;
//     }
//     return String(item[col]);
//   };

//   // Hàm xử lý khi người dùng thay đổi số lượng nhận
//   const handleReceivedQuantityChange = (itemId: number, value: string) => {
//     const quantity = parseInt(value, 10);
//     if (!isNaN(quantity) && detailOrder) {
//       const item = detailOrder.items.find(i => i.id === itemId);
//       if (item && quantity >= 0 && quantity <= item.ordered_quantity) {
//         setReceivedQuantities(prev => ({ ...prev, [itemId]: quantity }));
//       }
//     }
//   };

//   // Hàm xử lý tạo GRN
//   const handleCreateGRN = async () => {
//     if (!detailOrder) return;

//     const grnItems = Object.keys(receivedQuantities)
//       .map(itemId => {
//         const id = parseInt(itemId, 10);
//         const item = detailOrder.items.find(i => i.id === id);
//         const received_quantity = receivedQuantities[id];

//         if (item && received_quantity > 0) { // Chỉ bao gồm các mặt hàng có số lượng nhận > 0
//           return {
//             purchase_order_item_id: item.id,
//             received_quantity: received_quantity,
//             unit_cost: item.unit_cost,
//             // Thêm các trường khác cần thiết cho GRN item
//           };
//         }
//         return null;
//       })
//       .filter(Boolean); // Lọc bỏ các giá trị null

//     if (grnItems.length === 0) {
//       alert('Vui lòng nhập số lượng nhận cho ít nhất một mặt hàng.');
//       return;
//     }

//     try {
//       // Gọi API để tạo GRN
//       // await grnApi.createGRN({
//       //   purchase_order_id: detailOrder.id,
//       //   received_date: new Date().toISOString().split('T')[0], // Lấy ngày hiện tại
//       //   items: grnItems as GRNItem[],
//       // });

//       // Simulate API call for GRN creation
//       console.log('Creating GRN for PO:', detailOrder.id, 'with items:', grnItems);
//       await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

//       // Cập nhật trạng thái Purchase Order và số lượng đã nhận
//       let newStatus: PurchaseOrder['status'] = 'received';
//       let totalOrdered = 0;
//       let totalReceived = 0;

//       detailOrder.items.forEach(item => {
//         totalOrdered += item.ordered_quantity;
//         const currentReceivedForThisItem = (item.received_quantity || 0) + (receivedQuantities[item.id] || 0);
//         totalReceived += currentReceivedForThisItem;
//       });

//       if (totalReceived < totalOrdered) {
//         newStatus = 'partial_received';
//       }

//       await purchaseOrderApi.updatePurchaseOrder(detailOrder.id, {
//         status: newStatus,
//         actual_delivery_date: new Date().toISOString().split('T')[0],
//       });

//       alert('Đã tạo phiếu nhập kho thành công!');
//       closeDetail(); // Đóng dialog chi tiết sau khi tạo GRN
//       fetchAll(); // Refresh danh sách đơn hàng
//     } catch (error) {
//       console.error('Lỗi khi tạo phiếu nhập kho:', error);
//       alert('Đã xảy ra lỗi khi tạo phiếu nhập kho.');
//     }
//   };

//   return (
//     <div className="p-6">
//       {loading ? (
//         <p>Đang tải...</p>
//       ) : (
//         <>
//           <CrudGeneric<PurchaseOrder>
//             title="Purchase Orders"
//             initialData={purchaseOrders}
//             columns={columns}
//             headerLabels={headerLabels}
//             fields={fields}
//             fieldsConfig={fieldsConfig}
//             renderRow={renderRow}
//             onCreate={() => router.push('/admin/purchase_orders/create')}
//             onUpdate={handleUpdate}
//             onDelete={handleDelete}
//             renderActions={item => [
//               { label: 'Xem chi tiết', onClick: () => openDetail(item), className: 'text-blue-600' },
//               {
//                 label: 'Nhập kho',
//                 onClick: () => {
//                   openDetail(item); // Mở chi tiết đơn hàng
//                   setIsReceiving(true); // Mở form nhập kho
//                 },
//                 className: 'text-green-600',
//                 // Chỉ hiển thị nút "Nhập kho" nếu đơn hàng chưa "received" hoặc "cancelled"
//                 disabled: item.status === 'received' || item.status === 'cancelled',
//               },
//             ]}
//           />

//           {detailOrder && (
//             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
//               <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
//                 <div className="flex justify-between items-center border-b pb-4 mb-4">
//                   <h2 className="text-2xl font-bold">Chi tiết Đơn hàng #{detailOrder.id}</h2>
//                   <button
//                     onClick={closeDetail}
//                     className="text-gray-500 hover:text-gray-700 focus:outline-none"
//                   >
//                     <svg
//                       xmlns="http://www.w3.org/2000/svg"
//                       className="h-6 w-6"
//                       fill="none"
//                       viewBox="0 0 24 24"
//                       stroke="currentColor"
//                     >
//                       <path
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                         strokeWidth={2}
//                         d="M6 18L18 6M6 6l12 12"
//                       />
//                     </svg>
//                   </button>
//                 </div>

//                 <div className="space-y-4 my-4">
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
//                     <p>
//                       <strong>Nhà cung cấp:</strong> {detailOrder.supplier.name}
//                     </p>
//                     <p>
//                       <strong>Ngày dự kiến:</strong> {detailOrder.expected_delivery_date ?? 'N/A'}
//                     </p>
//                     <p>
//                       <strong>Ngày thực tế:</strong> {detailOrder.actual_delivery_date ?? 'N/A'}
//                     </p>
//                     <p>
//                       <strong>Tổng tiền:</strong>{' '}
//                       {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
//                         detailOrder.total_amount
//                       )}
//                     </p>
//                     <p className="md:col-span-2">
//                       <strong>Trạng thái:</strong> <Badge className={`px-2 py-1 rounded-full ${statusOptions.find(s => s.value === detailOrder.status)?.value === 'pending' ? 'bg-yellow-100 text-yellow-800' : detailOrder.status === 'confirmed' ? 'bg-blue-100 text-blue-800' : detailOrder.status === 'partial_received' ? 'bg-orange-100 text-orange-800' : detailOrder.status === 'received' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{statusOptions.find(s => s.value === detailOrder.status)?.label || detailOrder.status}</Badge>
//                     </p>
//                     <p className="md:col-span-2">
//                       <strong>Ghi chú:</strong> {detailOrder.notes || 'Không có'}
//                     </p>
//                     <p className="md:col-span-2">
//                       <strong>Ngày tạo:</strong> {detailOrder.created_at}
//                     </p>
//                   </div>

//                   <h3 className="text-xl font-bold mt-6 border-t pt-4">Mặt hàng trong đơn</h3>
//                   <div className="overflow-x-auto">
//                     <table className="min-w-full border border-gray-300">
//                       <thead className="bg-gray-100">
//                         <tr>
//                           <th className="px-4 py-2 text-left">ID</th>
//                           <th className="px-4 py-2 text-left">Tên sản phẩm</th>
//                           <th className="px-4 py-2 text-right">Giá nhập</th>
//                           <th className="px-4 py-2 text-center">SL đặt</th>
//                           <th className="px-4 py-2 text-center">SL đã nhận</th> {/* Thêm cột này */}
//                           <th className="px-4 py-2 text-center">Ảnh</th>
//                           {isReceiving && <th className="px-4 py-2 text-center">SL nhận</th>} {/* Cột nhập số lượng nhận */}
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {detailOrder.items.map(item => (
//                           <tr key={item.id} className="border-t border-gray-200 hover:bg-gray-50">
//                             <td className="px-4 py-2">{item.id}</td>
//                             <td className="px-4 py-2">{item.variant.full_name}</td>
//                             <td className="px-4 py-2 text-right">
//                               {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
//                                 item.unit_cost
//                               )}
//                             </td>
//                             <td className="px-4 py-2 text-center">{item.ordered_quantity}</td>
//                             <td className="px-4 py-2 text-center">{item.received_quantity ?? 0}</td> {/* Hiển thị số lượng đã nhận */}
//                             <td className="px-4 py-2 text-center">
//                               <img
//                                 src={item.variant.image_url}
//                                 alt={item.variant.full_name}
//                                 className="h-12 w-12 object-cover rounded mx-auto"
//                               />
//                             </td>
//                             {isReceiving && (
//                               <td className="px-4 py-2 text-center">
//                                 <input
//                                   type="number"
//                                   min="0"
//                                   // Max là số lượng đặt trừ đi số lượng đã nhận trước đó
//                                   max={item.ordered_quantity - (item.received_quantity || 0)}
//                                   value={receivedQuantities[item.id] || 0}
//                                   onChange={(e) => handleReceivedQuantityChange(item.id, e.target.value)}
//                                   className="w-20 p-1 border border-gray-300 rounded text-center"
//                                 />
//                               </td>
//                             )}
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>

//                 <div className="flex justify-end pt-4 border-t space-x-2">
//                   {isReceiving ? (
//                     <button
//                       onClick={handleCreateGRN}
//                       className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-opacity-50"
//                     >
//                       Xác nhận nhập kho
//                     </button>
//                   ) : (
//                     <button
//                       onClick={() => setIsReceiving(true)}
//                       className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-opacity-50"
//                       disabled={detailOrder.status === 'received' || detailOrder.status === 'cancelled'}
//                     >
//                       Tạo phiếu nhập kho
//                     </button>
//                   )}
//                   <button
//                     onClick={closeDetail}
//                     className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
//                   >
//                     Đóng
//                   </button>
//                 </div>
//               </div>
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   );
// };

// export default PurchaseOrdersPage;
