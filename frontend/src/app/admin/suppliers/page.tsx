// frontend/src/app/admin/suppliers/page.tsx
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import CrudGeneric, { CrudItem, FieldConfig } from '@/components/ui/CrudGeneric';
// Đảm bảo đường dẫn này đúng. Tôi sẽ sử dụng đường dẫn bạn cung cấp là '@/features/suppliers/api/supplierApi'
import { supplierApi, Supplier } from '@/features/suppliers/api/supplierApi';
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"; // Import DropdownMenuItem để thêm vào renderActions
import { useRouter } from "next/navigation";
import { Variant } from '@/features/variants/api/variantApi';
// Giao diện cho CrudGeneric, sử dụng camelCase cho các thuộc tính hiển thị/sử dụng trong UI
// và ánh xạ với snake_case từ API khi cần
interface SupplierCrudItem extends CrudItem {
  id: number;
  name: string;
  phone: string;
  address?: string;
  createdAt?: string; // Dùng để hiển thị trong UI (sẽ được format từ created_at)
  updatedAt?: string; // Dùng để hiển thị trong UI (sẽ được format từ updated_at)
}

export default function SupplierPage() {
    const router = useRouter();
  
  const [suppliers, setSuppliers] = useState<SupplierCrudItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State để điều khiển modal biến thể của nhà cung cấp
  const [isVariantsModalOpen, setIsVariantsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierCrudItem | null>(null);
  // State để lưu tất cả các biến thể sản phẩm có sẵn
  // QUAN TRỌNG: Bạn cần populate biến này từ database/API của mình.
  // Tôi không mock nó ở đây theo yêu cầu của bạn.
  const [allProductsVariants, setAllProductsVariants] = useState<Variant[]>([]);


  // Hàm để tải dữ liệu nhà cung cấp từ API (snake_case) và chuyển đổi sang dạng hiển thị (camelCase)
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: Supplier[] = await supplierApi.getAll(); // API trả về snake_case
      // Chuyển đổi từ snake_case sang camelCase và định dạng ngày tháng cho UI
      const formattedData: SupplierCrudItem[] = data.map(supplier => ({
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        address: supplier.address,
        createdAt: supplier.created_at ? new Date(supplier.created_at).toLocaleString() : '',
        updatedAt: supplier.updated_at ? new Date(supplier.updated_at).toLocaleString() : '',
      }));
      setSuppliers(formattedData);
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
      setError("Không thể tải danh sách nhà cung cấp.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ⭐ BẠN CẦN THÊM LOGIC ĐỂ TẢI allProductsVariants TỪ DATABASE/API THẬT CỦA BẠN.
  // Ví dụ:
  /*
  const fetchAllProductVariants = useCallback(async () => {
    try {
      // Giả định bạn có một productApi hoặc một endpoint để lấy tất cả variants
      // const variants = await productApi.getAllVariants();
      // setAllProductsVariants(variants);
      // Hoặc nếu bạn muốn tạm thời dùng mock data để test:
       const mockVariants: Variant[] = [
           { id: 1, product_id: 101, sku: 'PROD001-RED-S', price: 100000, stock: 50, profit_percent: 20, average_cost: 80000, full_name: 'Áo thun cơ bản - Đỏ S', image_url: 'https://via.placeholder.com/50/FF0000/FFFFFF?text=A-R' },
           { id: 2, product_id: 101, sku: 'PROD001-BLUE-M', price: 120000, stock: 30, profit_percent: 25, average_cost: 90000, full_name: 'Áo thun cơ bản - Xanh M', image_url: 'https://via.placeholder.com/50/0000FF/FFFFFF?text=A-B' },
           { id: 3, product_id: 102, sku: 'PROD002-GREEN', price: 200000, stock: 10, profit_percent: 30, average_cost: 140000, full_name: 'Quần Jeans Slim - Xanh lá', image_url: 'https://via.placeholder.com/50/00FF00/000000?text=B-G' },
           { id: 4, product_id: 103, sku: 'PROD003-BLACK', price: 50000, stock: 100, profit_percent: 15, average_cost: 40000, full_name: 'Tất cổ ngắn - Đen', image_url: 'https://via.placeholder.com/50/000000/FFFFFF?text=C-B' },
           { id: 5, product_id: 104, sku: 'PROD004-WHITE-L', price: 150000, stock: 25, profit_percent: 22, average_cost: 115000, full_name: 'Mũ lưỡi trai - Trắng L', image_url: 'https://via.placeholder.com/50/FFFFFF/000000?text=D-W' },
        ];
        setAllProductsVariants(mockVariants);
    } catch (err) {
      console.error("Failed to fetch all product variants:", err);
      toast.error("Không thể tải danh sách tất cả biến thể sản phẩm.");
    }
  }, []);
  */


  useEffect(() => {
    fetchSuppliers();
    // GỌI fetchAllProductVariants() TẠI ĐÂY NẾU BẠN CÓ HÀM ĐÓ.
    // fetchAllProductVariants();
  }, [fetchSuppliers /*, fetchAllProductVariants */]); // Uncomment fetchAllProductVariants nếu bạn thêm hàm đó

  // Xử lý tạo mới nhà cung cấp
  const handleCreate = async (item: Omit<SupplierCrudItem, "id">) => {
    try {
      // Chuyển đổi từ camelCase của form sang snake_case cho API payload
      const payload: Omit<Supplier, "id" | "created_at" | "updated_at"> = {
        name: item.name,
        phone: item.phone,
        address: item.address,
      };
      const newSupplier = await supplierApi.create(payload); // API gửi snake_case
      await fetchSuppliers(); // Tải lại toàn bộ dữ liệu để đảm bảo đồng bộ
    } catch (err: any) {
      console.error("Error creating supplier:", err);
    }
  };

  // Xử lý cập nhật nhà cung cấp
  const handleUpdate = async (id: number, item: Omit<SupplierCrudItem, "id">) => {
    try {
      // Chuyển đổi từ camelCase của form sang snake_case cho API payload
      const payload: Omit<Supplier, "id" | "created_at" | "updated_at"> = {
        name: item.name,
        phone: item.phone,
        address: item.address,
      };
      const updatedSupplier = await supplierApi.update(id, payload); // API gửi snake_case
      await fetchSuppliers(); // Tải lại toàn bộ dữ liệu
    } catch (err: any) {
      console.error("Error updating supplier:", err);
    }
  };

  // Xử lý xóa nhà cung cấp
  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa nhà cung cấp này không?")) {
      return;
    }
    try {
      await supplierApi.delete(id);
      await fetchSuppliers(); // Tải lại toàn bộ dữ liệu
    } catch (err: any) {
      console.error("Error deleting supplier:", err);
    }
  };

 const handleViewVariants = (supplier: SupplierCrudItem) => {
  router.push(`/admin/suppliers/${supplier.id}`);
};


  // Cấu hình các cột hiển thị trong bảng (sử dụng camelCase)
  const columns: (keyof SupplierCrudItem)[] = [
    "id",
    "name",
    "phone",
    "address",
    "createdAt", // hiển thị createdAt thay vì created_at
    "updatedAt", // hiển thị updatedAt thay vì updated_at
  ];

  // Nhãn hiển thị cho các cột
  const headerLabels: Partial<Record<keyof SupplierCrudItem, string>> = {
    id: "ID",
    name: "Tên Nhà Cung Cấp",
    phone: "Số Điện Thoại",
    address: "Địa Chỉ",
    createdAt: "Ngày Tạo",
    updatedAt: "Cập Nhật Cuối",
  };

  // Các trường sẽ xuất hiện trong form tạo/chỉnh sửa (sử dụng camelCase cho form)
  const fields: (keyof SupplierCrudItem)[] = ["name", "phone", "address"];

  // Cấu hình chi tiết cho từng trường trong form
  const fieldsConfig: Partial<Record<keyof SupplierCrudItem, FieldConfig>> = {
    name: { label: "Tên Nhà Cung Cấp", type: "text", required: true, placeholder: "Nhập tên nhà cung cấp" },
    phone: { label: "Số Điện Thoại", type: "text", required: true, placeholder: "Nhập số điện thoại" },
    address: { label: "Địa Chỉ", type: "text", placeholder: "Nhập địa chỉ (tùy chọn)" },
  };

  if (loading) {
    return <div className="p-6 text-center text-lg">Đang tải dữ liệu nhà cung cấp...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500 text-lg">{error}</div>;
  }

  return (
    <>
      <CrudGeneric<SupplierCrudItem>
        title="Quản lý Nhà Cung Cấp"
        initialData={suppliers}
        columns={columns}
        headerLabels={headerLabels}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        fields={fields}
        fieldsConfig={fieldsConfig}
        // Thêm nút "Xem Biến Thể Cung Cấp" vào renderActions của CrudGeneric
        renderActions={(item) => (
          <DropdownMenuItem onSelect={() => handleViewVariants(item)}>
            Xem Biến Thể Cung Cấp
          </DropdownMenuItem>
        )}
      />
    </>
  );
}
