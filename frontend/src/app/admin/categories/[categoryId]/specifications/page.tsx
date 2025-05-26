"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";  // <-- Import toast

import CrudGeneric, { CrudItem } from "@/components/ui/CrudGeneric";

import {
  Specification,
  CreateSpecDto,
  UpdateSpecDto,
  fetchSpecificationsByCategoryId,
  createSpecification,
  updateSpecification,
  deleteSpecification,
} from "@/features/specifications/api/specificationApi";

export default function SpecificationsPage() {
  const { categoryId } = useParams();

  const [specifications, setSpecifications] = useState<Specification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSpecifications = () => {
    if (!categoryId) return;
    setLoading(true);
    fetchSpecificationsByCategoryId(Number(categoryId))
      .then(setSpecifications)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSpecifications();
  }, [categoryId]);

  const handleCreate = async (item: Omit<Specification, "id">) => {
    if (!categoryId) return;
    try {
      const newSpec = await createSpecification({
        ...item,
        category_id: Number(categoryId),
      } as CreateSpecDto);
      loadSpecifications();
      setSpecifications((prev) => [...prev, newSpec]);
      toast.success("Tạo thông số kỹ thuật thành công!");
    } catch (error) {
      console.error("Tạo specification lỗi:", error);
      toast.error("Tạo thông số kỹ thuật thất bại!");
    }
  };

  const handleUpdate = async (id: number, item: Omit<Specification, "id">) => {
    try {
      await updateSpecification(id, item as UpdateSpecDto);
      loadSpecifications();
      toast.success("Cập nhật thông số kỹ thuật thành công!");
    } catch (error) {
      console.error("Cập nhật specification lỗi:", error);
      toast.error("Cập nhật thông số kỹ thuật thất bại!");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSpecification(id);
      loadSpecifications();
      toast.success("Xoá thông số kỹ thuật thành công!");
    } catch (error) {
      console.error("Xoá specification lỗi:", error);
      toast.error("Xoá thông số kỹ thuật thất bại!");
    }
  };

  if (loading) {
    return <div>Đang tải dữ liệu...</div>;
  }

  return (
    <CrudGeneric<Specification>
      title={`Thông số kỹ thuật - Category ${categoryId}`}
      initialData={specifications}
      columns={["id", "name", "data_type", "unit", "description"]}
      fields={["name", "data_type", "unit", "description"]}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      fieldsConfig={{
        data_type: {
          type: "select",
          options: [
            { value: "int", label: "Int" },
            { value: "decimal", label: "Decimal" },
            { value: "text", label: "Text" },
            { value: "option", label: "Option" },
          ],
        },
      }}
      renderRow={(item, column) => {
        const val = item[column];
        return val ? String(val) : "-";
      }}
    />
  );
}
