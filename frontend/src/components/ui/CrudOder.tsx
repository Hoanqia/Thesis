// frontend/src/components/ui/CrudOrder.tsx
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
  disabled?: boolean;
  onChange?: (value: any) => void;
  renderField?: (props: {
    value: any;
    onChange: (value: any) => void;
  }) => React.ReactNode;
  accept?: string;
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
  initialData: T[]; // Dữ liệu đã được phân trang từ component cha
  columns: (keyof T)[];
  headerLabels?: Partial<Record<keyof T, string>>;
  renderRow?: (item: T, column: keyof T) => React.ReactNode;
  onCreate?: (item: Omit<T, "id">) => void;
  onUpdate?: (id: number, item: Omit<T, "id">) => void;
  onDelete?: (id: number) => void;
  onToggleStatus?: (id: number) => void;
  renderActions?: (item: T) => ActionConfig<T>[];
  fields: (keyof T)[];
  fieldsConfig?: Partial<Record<keyof T, FieldConfig>>;
  onChange?: (data: T[]) => void;
  extraForm?: React.ReactNode;
  // Props mới cho phân trang
  currentPage: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

export default function CrudGeneric<T extends CrudItem>({
  title,
  initialData, // Dữ liệu đã được phân trang
  columns,
  headerLabels,
  renderRow,
  onCreate,
  onUpdate,
  onDelete,
  onToggleStatus,
  renderActions,
  fields,
  fieldsConfig,
  onChange,
  extraForm,
  // Destructure props phân trang
  currentPage,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
}: CrudGenericProps<T>) {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);

  // Dữ liệu hiển thị trong bảng sẽ là initialData (đã được phân trang từ cha)
  // Logic lọc tìm kiếm vẫn giữ nguyên, nhưng sẽ áp dụng trên initialData
  const filteredData = useMemo(() => {
    if (!search.trim()) return initialData;
    const lower = search.toLowerCase();
    return initialData.filter((item) =>
      columns.some((col) => String(item[col]).toLowerCase().includes(lower))
    );
  }, [initialData, search, columns]);

  // Tính toán tổng số trang dựa trên totalItems và perPage từ props
  const totalPages = Math.ceil(totalItems / perPage);

  // Dữ liệu hiển thị trong bảng chính là filteredData, không cần slice nữa
  const displayData = filteredData;

  const handleCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (item: Omit<T, "id">) => {
    // Logic này vẫn giữ nguyên, nhưng onCreate/onUpdate sẽ kích hoạt fetch lại ở component cha
    if (editingItem) {
      onUpdate?.(editingItem.id, item);
    } else {
      onCreate?.(item);
    }
    setIsModalOpen(false); // Đóng modal sau khi submit
  };

  const handleDeleteClick = (id: number) => {
    onDelete?.(id);
  };

  const handleEdit = (item: T) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleToggleStatusClick = (id: number) => {
    onToggleStatus?.(id);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      {/* Header section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-extrabold text-gray-800">{title}</h1>
        <button
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 text-lg"
          onClick={handleCreate}
        >
          Tạo mới
        </button>
      </div>

      {/* Search Bar */}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={`Tìm kiếm ${title.toLowerCase()}...`}
      />

      {/* Table Section - Added overflow-x-auto */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
        <div className="overflow-x-auto">
          {" "}
          {/* This div handles horizontal scrolling */}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                {columns.map((col) => (
                  <th
                    key={String(col)}
                    className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider"
                  >
                    {headerLabels && headerLabels[col]
                      ? headerLabels[col]
                      : String(col).toUpperCase()}
                  </th>
                ))}
                <th className="px-6 py-4 text-center text-sm font-medium text-gray-700 uppercase tracking-wider w-28 min-w-[112px]">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayData.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  {columns.map((col) => (
                    <td
                      key={String(col)}
                      className="px-6 py-4 whitespace-nowrap text-base text-gray-800 max-w-xs overflow-hidden text-ellipsis"
                    >
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
                  <td className="px-6 py-4 whitespace-nowrap text-right text-base font-medium w-28 min-w-[112px]">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-150">
                          <MoreHorizontal className="w-6 h-6 text-gray-600" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 bg-white shadow-lg rounded-md py-1"
                      >
                        <DropdownMenuItem
                          onSelect={() => handleEdit(item)} // Changed to handleEdit for consistency
                          className="cursor-pointer px-4 py-2 text-base text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => handleDeleteClick(item.id)}
                          className="cursor-pointer px-4 py-2 text-base text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          Xoá
                        </DropdownMenuItem>
                        {"status" in item && (
                          <DropdownMenuItem
                            onSelect={() => handleToggleStatusClick(item.id)}
                            className="cursor-pointer px-4 py-2 text-base text-green-600 hover:bg-green-50 flex items-center gap-2"
                          >
                            Chuyển trạng thái
                          </DropdownMenuItem>
                        )}
                        {renderActions &&
                          renderActions(item).map((action, idx) => (
                            <DropdownMenuItem
                              key={idx}
                              onSelect={() => action.onClick(item)}
                              className={`cursor-pointer px-4 py-2 text-base text-gray-700 hover:bg-gray-100 flex items-center gap-2 ${action.className || ""}`}
                            >
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {(!displayData || displayData.length === 0) && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="text-center py-10 text-gray-500 text-xl"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>{" "}
        {/* End of overflow-x-auto div */}
      </div>

      {/* Pagination controls */}
      {totalItems > 0 && (
        <div className="flex justify-center items-center gap-6 mt-8">
          {" "}
          {/* Increased gap and mt */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-5 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-lg"
          >
            Trước
          </button>
          <span className="text-lg text-gray-700 font-medium">
            {" "}
            {/* Increased text size */}
            Trang {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-5 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-lg"
          >
            Sau
          </button>
          <select
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200 text-lg"
          >
            {" "}
            {/* Increased padding, rounded, focus styles, text size */}
            {[5, 10, 20, 50].map((option) => (
              <option key={option} value={option}>
                {option} / trang
              </option>
            ))}
          </select>
        </div>
      )}

      <CrudModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        fields={fields}
        defaultValues={editingItem || undefined}
        title={editingItem ? "Chỉnh sửa" : "Tạo mới"}
        fieldsConfig={fieldsConfig}
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
    <div className="mb-6">
      {" "}
      {/* Increased mb */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Tìm kiếm..."}
        className="w-full p-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 text-lg"
      />
    </div>
  );
}
// // frontend/src/components/ui/CrudOrder.tsx
// "use client";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { MoreHorizontal } from "lucide-react";
// import { Badge } from "@/components/ui/badge";

// import React, { useState, useMemo, useEffect } from "react";
// import { CrudModal } from "@/components/ui/CrudModal";


// export interface FieldConfig {
//   label?: string;
//   type?: "text" | "number" | "checkbox" | "select" | "file" | "tags";
//   options?: { label: string; value: any }[];
//   placeholder?: string;
//   required?: boolean;
//   disabled?: boolean;
//   onChange?: (value: any) => void;
//   renderField?: (props: {
//     value: any;
//     onChange: (value: any) => void;
//   }) => React.ReactNode;
//   accept?: string;
// }


// export interface CrudItem {
//   id: number;
//   [key: string]: any;
// }

// export interface ActionConfig<T> {
//   label: string;
//   onClick: (item: T) => void;
//   className?: string;
// }

// interface CrudGenericProps<T extends CrudItem> {
//   title: string;
//   initialData: T[]; // Dữ liệu đã được phân trang từ component cha
//   columns: (keyof T)[];
//   headerLabels?: Partial<Record<keyof T, string>>;
//   renderRow?: (item: T, column: keyof T) => React.ReactNode;
//   onCreate?: (item: Omit<T, "id">) => void;
//   onUpdate?: (id: number, item: Omit<T, "id">) => void;
//   onDelete?: (id: number) => void;
//   onToggleStatus?: (id: number) => void;
//   renderActions?: (item: T) => ActionConfig<T>[];
//   fields: (keyof T)[];
//   fieldsConfig?: Partial<Record<keyof T, FieldConfig>>;
//   onChange?: (data: T[]) => void;
//   extraForm?: React.ReactNode;
//   // Props mới cho phân trang
//   currentPage: number;
//   totalItems: number;
//   perPage: number;
//   onPageChange: (page: number) => void;
//   onPerPageChange: (perPage: number) => void;
// }

// export default function CrudGeneric<T extends CrudItem>({
//   title,
//   initialData, // Dữ liệu đã được phân trang
//   columns,
//   headerLabels,
//   renderRow,
//   onCreate,
//   onUpdate,
//   onDelete,
//   onToggleStatus,
//   renderActions,
//   fields,
//   fieldsConfig,
//   onChange,
//   extraForm,
//   // Destructure props phân trang
//   currentPage,
//   totalItems,
//   perPage,
//   onPageChange,
//   onPerPageChange,
// }: CrudGenericProps<T>) {
//   const [search, setSearch] = useState("");
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [editingItem, setEditingItem] = useState<T | null>(null);

//   // Dữ liệu hiển thị trong bảng sẽ là initialData (đã được phân trang từ cha)
//   // Logic lọc tìm kiếm vẫn giữ nguyên, nhưng sẽ áp dụng trên initialData
//   const filteredData = useMemo(() => {
//     if (!search.trim()) return initialData;
//     const lower = search.toLowerCase();
//     return initialData.filter((item) =>
//       columns.some((col) =>
//         String(item[col]).toLowerCase().includes(lower)
//       )
//     );
//   }, [initialData, search, columns]);

//   // Tính toán tổng số trang dựa trên totalItems và perPage từ props
//   const totalPages = Math.ceil(totalItems / perPage);

//   // Dữ liệu hiển thị trong bảng chính là filteredData, không cần slice nữa
//   const displayData = filteredData;


//   const handleCreate = () => {
//     setEditingItem(null);
//     setIsModalOpen(true);
//   };

//   const handleSubmit = (item: Omit<T, "id">) => {
//     // Logic này vẫn giữ nguyên, nhưng onCreate/onUpdate sẽ kích hoạt fetch lại ở component cha
//     if (editingItem) {
//       onUpdate?.(editingItem.id, item);
//     } else {
//       onCreate?.(item);
//     }
//     setIsModalOpen(false); // Đóng modal sau khi submit
//   };

//   const handleDeleteClick = (id: number) => {
//     onDelete?.(id);
//   };

//   const handleEdit = (item: T) => {
//     setEditingItem(item);
//     setIsModalOpen(true);
//   };

//   const handleToggleStatusClick = (id: number) => {
//     onToggleStatus?.(id);
//   };

//   return (
//     <div className="p-6">
//       <div className="flex justify-between items-center mb-4">
//         <h1 className="text-2xl font-bold">{title}</h1>
//         <button
//           className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded"
//           onClick={handleCreate}
//         >
//           Tạo mới
//         </button>
//       </div>

//       <SearchBar
//         value={search}
//         onChange={setSearch}
//         placeholder={`Tìm kiếm ${title.toLowerCase()}`}
//       />

//       <table className="w-full table-fixed border-collapse border border-gray-300 mb-6">
//         <thead>
//           <tr>
//             {columns.map((col) => (
//               <th
//                 key={String(col)}
//                 className="border border-gray-300 px-4 py-2 bg-gray-100 break-words whitespace-normal"
//               >
//                 {headerLabels && headerLabels[col]
//                   ? headerLabels[col]
//                   : String(col).toUpperCase()}
//               </th>
//             ))}
//             <th className="border border-gray-300 px-2 py-2 bg-gray-100 text-center w-[80px]">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {displayData.map((item) => (
//             <tr key={item.id} className="hover:bg-gray-50">
//               {columns.map((col) => (
//                 <td key={String(col)} className="border border-gray-300 px-4 py-2">
//                   {renderRow ? (
//                     renderRow(item, col)
//                   ) : col === "status" ? (
//                     <Badge variant={item[col] ? "default" : "destructive"}>
//                       {item[col] ? "Active" : "Inactive"}
//                     </Badge>
//                   ) : (
//                     String(item[col])
//                   )}
//                 </td>
//               ))}
//               <td className="border border-gray-300 px-2 py-2 text-center w-[80px]">
//                 <DropdownMenu>
//                   <DropdownMenuTrigger asChild>
//                     <button className="p-1 rounded hover:bg-gray-100">
//                       <MoreHorizontal className="w-5 h-5" />
//                     </button>
//                   </DropdownMenuTrigger>
//                   <DropdownMenuContent align="end" className="w-40">
//                     <DropdownMenuItem
//                       onSelect={() => handleDeleteClick(item.id)}
//                       className="text-red-600"
//                     >
//                       Xoá
//                     </DropdownMenuItem>
//                     {"status" in item && (
//                       <DropdownMenuItem
//                         onSelect={() => handleToggleStatusClick(item.id)}
//                         className="text-green-600"
//                       >
//                         Chuyển trạng thái
//                       </DropdownMenuItem>
//                     )}
//                     {renderActions &&
//                       renderActions(item).map((action, idx) => (
//                         <DropdownMenuItem
//                           key={idx}
//                           onSelect={() => action.onClick(item)}
//                           className={action.className}
//                         >
//                           {action.label}
//                         </DropdownMenuItem>
//                       ))}
//                   </DropdownMenuContent>
//                 </DropdownMenu>
//               </td>
//             </tr>
//           ))}
//           {(!displayData || displayData.length === 0) && (
//             <tr>
//               <td colSpan={columns.length + 1} className="text-center py-4 text-gray-500">
//                 Không có dữ liệu
//               </td>
//             </tr>
//           )}
//         </tbody>
//       </table>

//       {/* Pagination controls */}
//       {totalItems > 0 && (
//         <div className="flex justify-center items-center gap-4 mt-2">
//           <button
//             onClick={() => onPageChange(currentPage - 1)}
//             disabled={currentPage === 1}
//             className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
//           >
//             Trước
//           </button>
//           <span className="text-sm text-gray-700">
//             Trang {currentPage} / {totalPages}
//           </span>
//           <button
//             onClick={() => onPageChange(currentPage + 1)}
//             disabled={currentPage === totalPages}
//             className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
//           >
//             Sau
//           </button>
//           <select
//             value={perPage}
//             onChange={(e) => onPerPageChange(Number(e.target.value))}
//             className="p-1 border border-gray-300 rounded"
//           >
//             {[5, 10, 20, 50].map(option => (
//               <option key={option} value={option}>
//                 {option} / trang
//               </option>
//             ))}
//           </select>
//         </div>
//       )}

//       <CrudModal
//         isOpen={isModalOpen}
//         onClose={() => setIsModalOpen(false)}
//         onSubmit={handleSubmit}
//         fields={fields}
//         defaultValues={editingItem || undefined}
//         title={editingItem ? "Chỉnh sửa" : "Tạo mới"}
//         fieldsConfig={fieldsConfig}
//         extraForm={extraForm}
//       />
//     </div>
//   );
// }

// interface SearchBarProps {
//   value: string;
//   onChange: (value: string) => void;
//   placeholder?: string;
// }
// function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
//   return (
//     <div className="mb-4">
//       <input
//         type="text"
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         placeholder={placeholder || "Tìm kiếm..."}
//         className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
//       />
//     </div>
//   );
// }
