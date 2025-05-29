"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";  // <-- Import toast
import { WithContext as ReactTagInput, Tag } from "react-tag-input";
import { Input } from "@/components/ui/Input";

import CrudGeneric, { CrudItem } from "@/components/ui/CrudGeneric";

import {
  Specification,
  CreateSpecDto,
  UpdateSpecDto,
  fetchSpecificationsByCategoryId,
  createSpecification,
  updateSpecification,
  deleteSpecification,
  SpecOption,
} from "@/features/specifications/api/specificationApi";

export default function SpecificationsPage() {
  const { categoryId } = useParams();

  const [specifications, setSpecifications] = useState<Specification[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentTags, setCurrentTags] = useState<Tag[]>([]);

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




  // const handleCreate = async (item: Omit<Specification, "id">) => {
  //   if (!categoryId) return;
  //   try {
  //     const newSpec = await createSpecification({
  //       ...item,
  //       category_id: Number(categoryId),
  //     } as CreateSpecDto);
  //     loadSpecifications();
  //     setSpecifications((prev) => [...prev, newSpec]);
  //     toast.success("Tạo thông số kỹ thuật thành công!");
  //   } catch (error) {
  //     console.error("Tạo specification lỗi:", error);
  //     toast.error("Tạo thông số kỹ thuật thất bại!");
  //   }
  // };
  //     const handleCreate = async (item: Omit<Specification, "id">) => {
  //         if (!categoryId) return;
  //         try {
  //           const dto: CreateSpecDto = {
  //             name: item.name,
  //             category_id: +categoryId,
  //             data_type: item.data_type,
  //             unit: item.unit,
  //             description: item.description,
  //           options: (item.spec_options || []).map((o) => o.value),
  //           };
  //           await createSpecification(dto);
  //           toast.success("Tạo thành công");
  //         loadSpecifications();    
  //         } catch {
  //           toast.error("Tạo thất bại");
  //         }
  // };
  const handleCreate = async (item: Omit<Specification, "id">) => {
  if (!categoryId) return;
  try {
    let optionsArray: string[] = [];

    if (item.spec_options && Array.isArray(item.spec_options)) {
      optionsArray = item.spec_options
        .map((o) => o.value.trim())
        .filter(Boolean);
    }

    const dto: CreateSpecDto = {
      name: item.name,
      category_id: +categoryId,
      data_type: item.data_type,
      unit: item.unit,
      description: item.description,
      options: optionsArray,
    };

    console.log("🚀 Sending DTO:", dto);

    await createSpecification(dto);
    toast.success("Tạo thành công");
    loadSpecifications();
  } catch (error) {
    console.error("❌ Lỗi khi tạo:", error);
    toast.error("Tạo thất bại");
  }
};



    const handleUpdate = async (id: number, item: Omit<Specification, "id">) => {
    try {
      let optionsArray: string[] = [];

      if (item.spec_options && Array.isArray(item.spec_options)) {
        optionsArray = item.spec_options
          .map((o) => o.value.trim())
          .filter(Boolean);
      } 
     const params = new URLSearchParams(window.location.search);
      const categoryId = params.get("categoryId");
      const numericCategoryId = categoryId ? +categoryId : undefined;
      const dto: UpdateSpecDto = {
        name: item.name,
        category_id: numericCategoryId,
        data_type: item.data_type,
        unit: item.unit,
        description: item.description,
        options: optionsArray,
      };

      console.log("✏️ Updating DTO:", dto);

      await updateSpecification(id, dto);
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
      columns={["id", "name", "data_type", "unit", "description", "spec_options"]}
      fields={["name", "data_type", "unit", "description", "spec_options"]}
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
        // spec_options: {
        //   type: "tags",
        //   label: "Options",
        //   placeholder: "Thêm lựa chọn...",
        // },
        spec_options: {
            label: "Options",
            renderField: ({ value = [], onChange }) => {
              const text = (value as { id: string; value: string }[])
                .map(o => o.value)
                .join(", ");
              return (
                <Input
                  placeholder="Thêm lựa chọn, ngăn cách bằng dấu , hoặc để liền không dấu để tự tách"
                  value={text}
                  onChange={e => {
                    const parts = e.target.value
                      .split(/,|(?=\p{Lu})/u)
                      .map(s => s.trim())
                      .filter(Boolean);
                    const newTags = parts.map((v, i) => ({ id: String(i), value: v }));
                    onChange(newTags);
                  }}
                />
              );
            },
          },

      }}
      renderRow={(item, column) => {
        //  if (column === "spec_options") {
        //   return (item.spec_options || []).map((o) => o.value).join(", ") || "-";
        // }
        if (column === "spec_options") {
            return (item.spec_options || []).map((o: any) => o.value).join(", ") || "-";
          }
        const val = item[column];
        return val ? String(val) : "-";
      }}
    />
  );
  
}
