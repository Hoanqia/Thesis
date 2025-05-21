

import React from "react";
import { Button } from "@/components/ui/Button";

export type CrudItem = {
  id: number;
  name: string;
  slug: string;
  status: boolean;
};

type CrudTableProps = {
  data: CrudItem[];
  onEdit: (item: CrudItem) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (id: number) => void;
};

export const CrudTable = ({ data, onEdit, onDelete, onToggleStatus }: CrudTableProps) => {
  return (
    <table className="w-full table-auto border border-gray-200">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-4 py-2">ID</th>
          <th className="px-4 py-2">Name</th>
          <th className="px-4 py-2">Slug</th>
          <th className="px-4 py-2">Status</th>
          <th className="px-4 py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={item.id} className="text-center border-t">
            <td className="px-4 py-2">{item.id}</td>
            <td className="px-4 py-2">{item.name}</td>
            <td className="px-4 py-2">{item.slug}</td>
            <td className="px-4 py-2">
              <span className={`px-2 py-1 rounded text-sm ${item.status ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {item.status ? "Active" : "Inactive"}
              </span>
            </td>
            <td className="px-4 py-2 space-x-2">
              <Button onClick={() => onEdit(item)}>Edit</Button>
              <Button variant="destructive" onClick={() => onDelete(item.id)}>
                Delete
              </Button>
              <Button variant="ghost" onClick={() => onToggleStatus(item.id)}>
                {item.status ? "Deactivate" : "Activate"}
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};