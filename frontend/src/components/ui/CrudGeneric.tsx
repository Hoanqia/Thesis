// components/ui/CrudGeneric.tsx
"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

import React, { useState, useMemo } from "react";
import { CrudModal } from "@/components/ui/CrudModal";

export interface CrudItem {
  id: number;
  [key: string]: any;
}

interface CrudGenericProps<T extends CrudItem> {
  title: string;
  initialData: T[];
  columns: (keyof T)[];
  renderRow?: (item: T, column: keyof T) => React.ReactNode;
  onCreate?: (item: Omit<T, "id">) => void;
  onUpdate?: (id: number, item: Omit<T, "id">) => void;
  onDelete?: (id: number) => void;
  onToggleStatus?: (id: number) => void;
  renderActions?: (item: T) => React.ReactNode;
  fields: (keyof T)[];
}

export default function CrudGeneric<T extends CrudItem>({
  title,
  initialData,
  columns,
  renderRow,
  onCreate,
  onUpdate,
  onDelete,
  onToggleStatus,
  renderActions,
  fields,
}: CrudGenericProps<T>) {
  const [data, setData] = useState<T[]>(initialData);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const lower = search.toLowerCase();
    return data.filter((item) =>
      columns.some((col) =>
        String(item[col]).toLowerCase().includes(lower)
      )
    );
  }, [data, search, columns]);

  const handleCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (item: Omit<T, "id">) => {
    if (editingItem) {
      const updated = { ...editingItem, ...item } as T;
      setData((prev) => prev.map((d) => (d.id === editingItem.id ? updated : d)));
      onUpdate?.(editingItem.id, item);
    } else {
      const newItem = { id: Date.now(), ...item } as T;
      setData((prev) => [...prev, newItem]);
      onCreate?.(item);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    setData((prev) => prev.filter((d) => d.id !== id));
    onDelete?.(id);
  };

  const handleEdit = (item: T) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleToggleStatus = (id: number) => {
    setData((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: !d.status } : d
      )
    );
    onToggleStatus?.(id);
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

      <table className="w-full border-collapse border border-gray-300 mb-6">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col)}
                className="border border-gray-300 px-4 py-2 bg-gray-100"
              >
                {String(col).toUpperCase()}
              </th>
            ))}
            <th className="border border-gray-300 px-2 py-2 bg-gray-100 text-center w-[80px]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              {columns.map((col) => (
                <td key={String(col)} className="border border-gray-300 px-4 py-2">
                  {renderRow ? renderRow(item, col) : String(item[col])}
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
                    <DropdownMenuItem onSelect={() => handleEdit(item)}>
                      Chỉnh sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleDelete(item.id)}
                      className="text-red-600"
                    >
                      Xoá
                    </DropdownMenuItem>
                    {"status" in item && (
                      <DropdownMenuItem
                        onSelect={() => handleToggleStatus(item.id)}
                        className="text-green-600"
                      >
                        Chuyển trạng thái
                      </DropdownMenuItem>
                    )}
                    {renderActions && (
                      <DropdownMenuItem>{renderActions(item)}</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>

            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="text-center py-4 text-gray-500"
              >
                Không có dữ liệu
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <CrudModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        fields={fields}
        defaultValues={editingItem || undefined}
        title={editingItem ? "Chỉnh sửa" : "Tạo mới"}
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



// // components/ui/CrudGeneric.tsx
// "use client";

// import React, { useEffect, useState, useMemo } from "react";
// import {CrudModal} from "@/components/ui/CrudModal";

// export interface CrudItem {
//   id: number;
//   [key: string]: any;
// }

// interface CrudGenericProps<T extends CrudItem> {
//   title: string;
//   initialData: T[];
//   columns: (keyof T)[];
//   renderRow?: (item: T, column: keyof T) => React.ReactNode;
//   onCreate?: (item: Omit<T, "id">) => void;
//   onUpdate?: (id: number, item: Omit<T, "id">) => void;
//   onDelete?: (id: number) => void;
//   onToggleStatus?: (id: number) => void;
//   fields: (keyof T)[];
// }

// export default function CrudGeneric<T extends CrudItem>({
//   title,
//   initialData,
//   columns,
//   renderRow,
//   onCreate,
//   onUpdate,
//   onDelete,
//   onToggleStatus,
//   fields,
// }: CrudGenericProps<T>) {
//   const [data, setData] = useState<T[]>(initialData);
//   const [search, setSearch] = useState("");
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [editingItem, setEditingItem] = useState<T | null>(null);

//   const filtered = useMemo(() => {
//     if (!search.trim()) return data;
//     const lower = search.toLowerCase();
//     return data.filter((item) =>
//       columns.some((col) =>
//         String(item[col]).toLowerCase().includes(lower)
//       )
//     );
//   }, [data, search, columns]);

//   const handleCreate = () => {
//     setEditingItem(null);
//     setIsModalOpen(true);
//   };

//   const handleSubmit = (item: Omit<T, "id">) => {
//     if (editingItem) {
//       const updated = { ...editingItem, ...item } as T;
//       setData((prev) =>
//         prev.map((d) => (d.id === editingItem.id ? updated : d))
//       );
//       if (onUpdate) onUpdate(editingItem.id, item);
//     } else {
//       const newItem = { id: Date.now(), ...item } as T;
//       setData((prev) => [...prev, newItem]);
//       if (onCreate) onCreate(item);
//     }
//     setIsModalOpen(false);
//   };

//   const handleDelete = (id: number) => {
//     setData((prev) => prev.filter((d) => d.id !== id));
//     if (onDelete) onDelete(id);
//   };

//   const handleEdit = (item: T) => {
//     setEditingItem(item);
//     setIsModalOpen(true);
//   };

//   const handleToggleStatus = (id: number) => {
//     setData((prev) =>
//       prev.map((d) =>
//         d.id === id ? { ...d, status: !d.status } : d
//       )
//     );
//     if (onToggleStatus) onToggleStatus(id);
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

//       <table className="w-full border-collapse border border-gray-300 mb-6">
//         <thead>
//           <tr>
//             {columns.map((col) => (
//               <th
//                 key={String(col)}
//                 className="border border-gray-300 px-4 py-2 bg-gray-100"
//               >
//                 {String(col).toUpperCase()}
//               </th>
//             ))}
//             <th className="border border-gray-300 px-4 py-2 bg-gray-100">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {filtered.map((item) => (
//             <tr key={item.id} className="hover:bg-gray-50">
//               {columns.map((col) => (
//                 <td key={String(col)} className="border border-gray-300 px-4 py-2">
//                   {renderRow ? renderRow(item, col) : String(item[col])}
//                 </td>
//               ))}
//               <td className="border border-gray-300 px-4 py-2 space-x-2">
//                 <button
//                   className="text-blue-600 hover:underline"
//                   onClick={() => handleEdit(item)}
//                 >
//                   Edit
//                 </button>
//                 <button
//                   className="text-red-600 hover:underline"
//                   onClick={() => handleDelete(item.id)}
//                 >
//                   Delete
//                 </button>
//                 {"status" in item && (
//                   <button
//                     className="text-green-600 hover:underline"
//                     onClick={() => handleToggleStatus(item.id)}
//                   >
//                     Toggle Status
//                   </button>
//                 )}
//               </td>
//             </tr>
//           ))}
//           {filtered.length === 0 && (
//             <tr>
//               <td
//                 colSpan={columns.length + 1}
//                 className="text-center py-4 text-gray-500"
//               >
//                 Không có dữ liệu
//               </td>
//             </tr>
//           )}
//         </tbody>
//       </table>

//       {/* Modal */}
//       <CrudModal
//         isOpen={isModalOpen}
//         onClose={() => setIsModalOpen(false)}
//         onSubmit={handleSubmit}
//         fields={fields}
//         defaultValues={editingItem || undefined}
//         title={editingItem ? "Chỉnh sửa" : "Tạo mới"}
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
