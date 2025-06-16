"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { supplierApi } from "@/features/suppliers/api/supplierApi";
import { Variant, variantApi } from "@/features/variants/api/variantApi";
import { createGrn, GrnCreatePayload } from "@/features/grns/api/grnApi";

// Extend Variant to include display fields from API
export interface SelectableVariant extends Variant {
  image: string;
  image_url: string;
  full_name: string;
  _checked: boolean;
  ordered_quantity: number; // Đảm bảo là number
  unit_cost: number; // Đảm bảo là number
}

export default function GrnCreatePage() {
  const router = useRouter();

  // form states
  const [type, setType] = useState<"purchase" | "return">("purchase");
  const [expectedDate, setExpectedDate] = useState<string>("");
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [note, setNote] = useState<string>("");

  // data lists
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([]);
  const [variantList, setVariantList] = useState<SelectableVariant[]>([]);
  const [selected, setSelected] = useState<SelectableVariant[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);


  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [formError, setFormError] = useState<string>("");

  const pageSize = 7;

  // Khi chuyển trang, reset luôn formError
  const goPrev = () => {
    setCurrentPage((p) => Math.max(p - 1, 1));
    setFormError("");
  };
  const goNext = () => {
    setCurrentPage((p) => p + 1);
    setFormError("");
  };

  // Lọc + phân trang
  const filteredVariants = variantList
    .filter((v) =>
      v.full_name.toLowerCase().includes(searchTerm.trim().toLowerCase())
    );
  const totalPages = Math.ceil(filteredVariants.length / pageSize);
  const paginated = filteredVariants.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const onConfirm = () => {
    if (!variantList.some((v) => v._checked)) {
      setFormError("Vui lòng thêm ít nhất 1 SKU.");
      return;
    }
    // reset lỗi trước khi đóng modal
    setFormError("");
    onConfirmVariants();
  };


  // fetch suppliers và variants, map để khởi tạo UI-only fields
  useEffect(() => {
    supplierApi.getAll().then(setSuppliers).catch(console.error);
    variantApi.fetchAllVariants()
      .then((list: Variant[]) =>
        setVariantList(
          list.map((v: any) => ({
            ...v,
            image: v.image || "",
            image_url: v.image_url || "",
            full_name: v.full_name || v.sku || "",
            _checked: false,
            ordered_quantity: 1, // Khởi tạo là số
            unit_cost: 0, // Khởi tạo là số
          }))
        )
      )
      .catch(console.error);
  }, []);

  // handle submit với payload rõ ràng
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supplierId || !expectedDate || selected.length === 0) {
      alert("Vui lòng nhập đủ thông tin và thêm ít nhất 1 SKU.");
      return;
    }

    // Validate if ordered_quantity and unit_cost are valid numbers and positive
    const invalidItems = selected.filter(item =>
      item.ordered_quantity <= 0 || isNaN(item.ordered_quantity) || item.unit_cost < 0 || isNaN(item.unit_cost)
    );

    if (invalidItems.length > 0) {
      alert("Số lượng nhập dự kiến phải là số nguyên dương và Giá nhập phải là số không âm.");
      return;
    }

    const payload: GrnCreatePayload = {
      type,
      expected_delivery_date: expectedDate,
      supplier_id: supplierId,
      notes: note || null,
      items: selected.map(v => ({
        variant_id: v.id,
        ordered_quantity: v.ordered_quantity,
        unit_cost: v.unit_cost,
      })),
    };
    try {
      await createGrn(payload);
      router.push("/admin/grns");
    } catch (err) {
      console.error(err);
      alert("Tạo phiếu nhập thất bại");
    }
  };

  // thêm các variant đã chọn
  const onConfirmVariants = () => {
    setSelected(prev => [
      ...prev,
      ...variantList.filter(v => v._checked && !prev.some(x => x.id === v.id)),
    ]);
    setShowModal(false);
  };

  // tính tổng tiền
  const totalAmount = selected.reduce(
    (sum, it) => sum + (it.ordered_quantity || 0) * (it.unit_cost || 0),
    0
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6 p-6">
      {/* Section 1: Basic info */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Thông tin cơ bản</h2>
        {/* <div className="flex items-center gap-4">
          <Label>Hình thức</Label>
          <RadioGroup value={type} onValueChange={val => setType(val as any)}>
            <div className="flex gap-2">
              <div>
                <RadioGroupItem value="purchase" id="r1" />
                <Label htmlFor="r1">Mua hàng</Label>
              </div>
              <div>
                <RadioGroupItem value="return" id="r2" />
                <Label htmlFor="r2">Nhập lại vào kho</Label>
              </div>
            </div>
          </RadioGroup>
        </div> */}
        <div className="flex gap-4">
          <div>
            <Label>Ngày nhập dự kiến</Label>
            <Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
          </div>
          <div>
            <Label>Nhà cung cấp</Label>
            <Select onValueChange={val => setSupplierId(Number(val))}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn nhà cung cấp" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label>Chú thích</Label>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Nhập..." />
          </div>
        </div>
      </div>

      {/* Section 2: SKU list */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">SKU thực tế</h2>
        <div className="flex gap-2">
          <Button type="button" onClick={() => setShowModal(true)}>
            Chọn SKU để thêm
          </Button>
        </div>
        <table className="w-full text-sm table-auto border-separate border-spacing-y-2">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">Sản phẩm</th>
              <th className="px-4 py-2 text-left">Mã SKU</th>
              <th className="px-4 py-2 text-center">* Số lượng nhập dự kiến</th>
              <th className="px-4 py-2 text-center">* Giá nhập</th>
              <th className="px-4 py-2 text-right">Tổng cộng</th>
              <th className="px-4 py-2 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {selected.map(it => (
              <tr key={it.id} className="bg-white hover:bg-gray-50">
                <td className="px-4 py-2">{it.full_name}</td>
                <td className="px-4 py-2">{it.sku}</td>
                <td className="px-4 py-2 text-center">
                  <Input
                    type="number"
                    min={1}
                    value={it.ordered_quantity === 0 ? '' : it.ordered_quantity} // Hiển thị rỗng nếu là 0
                    className="w-20 text-center"
                    onChange={e => {
                      // Xóa số 0 ở đầu nếu có, sau đó chuyển thành số
                      const val = e.target.value;
                      const sanitizedVal = val.startsWith('0') && val.length > 1 ? val.substring(1) : val;
                      const v = Number(sanitizedVal);
                      setSelected(sel => sel.map(x => x.id === it.id ? { ...x, ordered_quantity: v } : x));
                    }}
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <Input
                    type="text" // Đổi thành text để có thể định dạng
                    value={it.unit_cost.toLocaleString('vi-VN')} // Định dạng tiền Việt Nam
                    className="w-24 text-center"
                    onChange={e => {
                      // Loại bỏ ký tự không phải số (trừ dấu phẩy/chấm nếu muốn hỗ trợ thập phân)
                      // Để đơn giản và đúng với tiền Việt, chúng ta chỉ lấy số và loại bỏ dấu chấm/phẩy ngăn cách hàng nghìn.
                      const numeric = Number(e.target.value.replace(/\D/g, ""));
                      setSelected(sel => sel.map(x => x.id === it.id ? { ...x, unit_cost: numeric } : x));
                    }}
                  />
                </td>
                <td className="px-4 py-2 text-right">{(it.ordered_quantity * it.unit_cost).toLocaleString('vi-VN')}</td>
                <td className="px-4 py-2 text-center">
                  <Button variant="link" onClick={() => setSelected(sel => sel.filter(x => x.id !== it.id))}>
                    Xóa
                  </Button>
                </td>
              </tr>
            ))}
            {selected.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Không có SKU được thêm
                </td>
              </tr>
            )}
            <tr className="bg-gray-50">
              <td colSpan={4} className="px-4 py-2 text-right font-semibold">
                Tổng giá nhập
              </td>
              <td colSpan={2} className="px-4 py-2 text-right font-semibold">
                {totalAmount.toLocaleString('vi-VN')}
              </td>
            </tr>
          </tbody>
        </table>

      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Thoát
        </Button>
        <Button type="submit">Xác nhận</Button>
      </div>

      {/* Variant selection modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowModal(false)}
          />

          {/* Modal box */}
          <div
            className="
            relative
            bg-white
            w-[90vw]
            h-[80vh]
            rounded-xl
            shadow-xl

            flex flex-col
            overflow-hidden
          "
          >
            {/* Header (không cuộn) */}
            <div className="flex-none flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium">Chọn SKU Sản Phẩm Thực Tế</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            {/* Body (cuộn trong đây) */}
            <div className="flex-1 p-4 flex gap-4 overflow-auto">
              {/* Left side: danh sách variant với search bar */}
              <div className="flex-1 flex flex-col">
                {/* Search bar */}
                <input
                  type="text"
                  placeholder="Tìm kiếm SKU..."
                  className="mb-2 px-3 py-2 border rounded focus:outline-none"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />

                {/* Danh sách đã phân trang */}
                <div className="overflow-y-auto flex-1">
                  {paginated.map(v => (
                    <label
                      key={v.id}
                      className="flex items-center p-2 border-b cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={v._checked}
                        onChange={e => {
                          // Tạo một bản sao mới để kích hoạt re-render
                          setVariantList(prevList =>
                            prevList.map(item =>
                              item.id === v.id ? { ...item, _checked: e.target.checked } : item
                            )
                          );
                        }}
                      />
                      <img
                        src={v.image}
                        alt={v.full_name}
                        className="w-12 h-12 object-cover rounded mr-2"
                      />
                      <span className="flex-1">{v.full_name}</span>
                    </label>
                  ))}
                </div>

                {/* Controls phân trang */}
                <div className="mt-2 flex-none flex justify-center items-center space-x-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    className="px-2 py-1 border rounded disabled:opacity-50"
                    onClick={goPrev}
                  >
                    Prev
                  </button>
                  <span className="text-sm">
                    {currentPage} / {totalPages || 1}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-2 py-1 border rounded disabled:opacity-50"
                    onClick={goNext}
                  >
                    Next
                  </button>
                </div>
              </div>

              {/* Right side: summary đã chọn */}
              <div className="w-1/3 border-l pl-4 flex flex-col">
                <h4 className="font-medium mb-2 flex-none">
                  {variantList.filter(v => v._checked).length} SKU đã chọn
                </h4>
                <div className="overflow-auto flex-1">
                  {variantList.filter(v => v._checked).map(v => (
                    <div key={v.id} className="flex items-center mb-2">
                      <img
                        src={v.image}
                        alt={v.full_name}
                        className="w-8 h-8 object-cover rounded mr-2"
                      />
                      <span className="flex-1">{v.full_name}</span>
                      <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => {
                          // Tạo một bản sao mới để kích hoạt re-render
                          setVariantList(prevList =>
                            prevList.map(item =>
                              item.id === v.id ? { ...item, _checked: false } : item
                            )
                          );
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer (không cuộn) */}
            <div className="flex-none flex flex-col gap-2 p-4 border-t">
              {formError && (
                <p className="text-red-600 text-sm">
                  {formError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                  onClick={() => {
                    setShowModal(false);
                    setFormError("");
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                  onClick={onConfirm}
                >
                  Thêm
                </button>
              </div>
            </div>
          </div>

        </div>
      )}
    </form>
  );
}
