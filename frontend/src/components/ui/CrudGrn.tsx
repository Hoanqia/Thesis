// frontend\src\components\ui\CrudGeneric.tsx
"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import React, { useState, useMemo, useEffect } from "react";
import { CrudModal } from "@/components/ui/CrudModal";


export interface FieldConfig {
  label?: string;
  type?: "text" | "number" | "checkbox" | "select" | "file" | "tags";
  options?: { label: string; value: any }[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;  // thêm cái này
  onChange?: (value: any) => void;  // ✅ thêm dòng này nếu bạn cần
  renderField?: (props: {
    value: any;
    onChange: (value: any) => void;
  }) => React.ReactNode;
    accept?: string;  // thêm dòng này
    
}


export interface CrudItem {
  id: number;
  [key: string]: any;
}

export interface ActionConfig<T> {
  label: string;
  onClick: (item: T) => void;
  className?: string;
}

interface CrudGenericProps<T extends CrudItem> {
  title: string;
  initialData: T[];
  columns: (keyof T)[];
  headerLabels?: Partial<Record<keyof T, string>>;
  renderRow?: (item: T, column: keyof T) => React.ReactNode;
  onCreate?: () => void; // ✅ không có tham số
  onUpdate?: (id: number, item: Omit<T, "id">) => void;
  onDelete?: (id: number) => void;
  onToggleStatus?: (id: number) => void;
  renderActions?: (item: T) => ActionConfig<T>[];
  fields: (keyof T)[];
  fieldsConfig?: Partial<Record<keyof T, FieldConfig>>;  // <--- thêm prop này
  onChange?: (data: T[]) => void;
  extraForm?: React.ReactNode;
  
}

export default function CrudGeneric<T extends CrudItem>({
  title,
  initialData,
  columns,
  headerLabels,
  renderRow,
  onCreate,
  onUpdate,
  onDelete,
  onToggleStatus,
  renderActions,
  fields,
  fieldsConfig,  // <-- thêm đây
  onChange,
  extraForm,
 
}: CrudGenericProps<T>) {
  const [data, setData] = useState<T[]>(initialData ?? []);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
  setData(initialData ?? []);
}, [initialData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const lower = search.toLowerCase();
    return data.filter((item) =>
      columns.some((col) =>
        String(item[col]).toLowerCase().includes(lower)
      )
    );
  }, [data, search, columns]);

  // Reset currentPage khi filter thay đổi
 useEffect(() => {
  setCurrentPage(1);
}, [search, filtered?.length ?? 0]);

const totalPages = Math.ceil((filtered?.length ?? 0) / itemsPerPage);

const paginatedData = useMemo(() => {
  if (!filtered) return [];
  const start = (currentPage - 1) * itemsPerPage;
  return filtered.slice(start, start + itemsPerPage);
}, [filtered, currentPage]);


 const handleCreate = () => {
  if (onCreate) {
    onCreate(); // Gọi hàm tạo từ bên ngoài nếu có (ví dụ để chuyển trang)
  } else {
    setEditingItem(null);
    setIsModalOpen(true); // Mặc định mở modal nếu không có onCreate truyền vào
  }
};

  const handleSubmit = (item: Omit<T, "id">) => {
        if (editingItem) {
      const updated = { ...editingItem, ...item } as T;
      const updatedData = data.map((d) =>
        d.id === editingItem.id ? updated : d
      );
      setData(updatedData);
      onUpdate?.(editingItem.id, item);
      onChange?.(updatedData); // ✅
    } else {
      const newItem = { id: Date.now(), ...item } as T;
      const newData = [...data, newItem];
      setData(newData);
      // onCreate?.(item);
      onChange?.(newData); // ✅
    }

  };

  const handleDelete = (id: number) => {
      const newData = data.filter((d) => d.id !== id);
      setData(newData);
      onDelete?.(id);
      onChange?.(newData); 
  };

  const handleEdit = (item: T) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleToggleStatus = (id: number) => {
        const newData = data.map((d) =>
      d.id === id ? { ...d, status: d.status === 1 ? 0 : 1 } : d
    );
    setData(newData);
    onToggleStatus?.(id);
    onChange?.(newData); // ✅
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <button
          className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded"
          onClick={handleCreate}
        >
          Tạo mới
        </button>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={`Tìm kiếm ${title.toLowerCase()}`}
      />

      <table className="w-full table-fixed border-collapse border border-gray-300 mb-6">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col)}
                className="border border-gray-300 px-4 py-2 bg-gray-100 break-words whitespace-normal"
              >
              {headerLabels && headerLabels[col]
                  ? headerLabels[col]
                  : String(col).toUpperCase()}
              </th>
            ))}
            <th className="border border-gray-300 px-2 py-2 bg-gray-100 text-center w-[80px]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
            {columns.map((col) => (
                <td key={String(col)} className="border border-gray-300 px-4 py-2">
                  {renderRow ? (
                    renderRow(item, col)
                  ) : col === "status" ? (
                    <Badge variant={item[col] ? "default" : "destructive"}>
                      {item[col] ? "Active" : "Inactive"}
                    </Badge>
                  ) : (
                    String(item[col])
                  )}
                </td>
              ))}
              <td className="border border-gray-300 px-2 py-2 text-center w-[80px]">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded hover:bg-gray-100">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {/* <DropdownMenuItem onSelect={() => handleEdit(item)}>
                      Chỉnh sửa
                    </DropdownMenuItem> */}
                    {/* <DropdownMenuItem
                      onSelect={() => handleDelete(item.id)}
                      className="text-red-600"
                    >
                      Xoá
                    </DropdownMenuItem> */}
                    {/* {"status" in item && (
                      <DropdownMenuItem
                        onSelect={() => handleToggleStatus(item.id)}
                        className="text-green-600"
                      >
                        Chuyển trạng thái
                      </DropdownMenuItem>
                    )} */}
                {renderActions &&
                        renderActions(item).map((action, idx) => (
                        <DropdownMenuItem
                            key={idx}
                            onSelect={() => action.onClick(item)}
                            className={action.className}
                        >
                            {action.label}
                        </DropdownMenuItem>
                        ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
          {(!filtered || filtered.length === 0) && (
  <tr>
    <td colSpan={columns.length + 1} className="text-center py-4 text-gray-500">
      Không có dữ liệu
    </td>
  </tr>
)}

        </tbody>
      </table>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
          >
            Trước
          </button>
          <span className="text-sm text-gray-700">
            Trang {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      )}

      <CrudModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        fields={fields}
        defaultValues={editingItem || undefined}
        title={editingItem ? "Chỉnh sửa" : "Tạo mới"}
        fieldsConfig={fieldsConfig}  // <-- thêm prop này
        extraForm={extraForm}
      />
    </div>
  );
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}
function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  return (
    <div className="mb-4">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Tìm kiếm..."}
        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
      />
    </div>
  );
}