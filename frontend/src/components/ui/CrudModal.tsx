

// // components/ui/CrudModal.tsx
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { CrudItem, FieldConfig } from "@/components/ui/CrudGeneric";

type CrudModalProps<T extends CrudItem> = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: Omit<T, "id">, id?: number) => void;
  defaultValues?: T | null;
  fields: (keyof T)[];
  title?: string;
  fieldsConfig?: Partial<Record<keyof T, FieldConfig>>;
    extraForm?: React.ReactNode;  // <-- Thêm dòng này

};

export const CrudModal = <T extends CrudItem>({
  isOpen,
  onClose,
  onSubmit,
  defaultValues,
  fields,
  title,
  fieldsConfig,
   extraForm,
}: CrudModalProps<T>) => {
  const [formData, setFormData] = useState<Partial<Omit<T, "id">>>({});

  useEffect(() => {
    if (defaultValues) {
      const { id, ...rest } = defaultValues;
      setFormData(rest);
    } else {
      setFormData({});
    }
  }, [defaultValues]);

  const handleChange = (field: keyof T, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData as Omit<T, "id">, defaultValues?.id);
    onClose();
  };
  function isFile(value: any): value is File {
    return value instanceof File;
  }
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {title || (defaultValues ? "Update Item" : "Create Item")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => {
            const fieldKey = field as keyof typeof formData;
            const value = formData[fieldKey];

            const config = fieldsConfig?.[field] || {};

            const label = config.label ?? String(field);
            const placeholder = config.placeholder ?? "";
            const required = config.required ?? false;
            const type = config.type ?? "text";

            const onChangeWrapper = (val: any) => {
                handleChange(field, val);
                config.onChange?.(val);
              };

              // ✅ Ưu tiên dùng custom renderField nếu có
              if (config.renderField) {
                return (
                  <div key={String(field)}>
                    <label className="block mb-1 font-medium">{label}</label>
                    {config.renderField({
                      value,
                      onChange: onChangeWrapper,
                    })}
                  </div>
                );
              }
            // Checkbox
            if (type === "checkbox") {
              return (
                <label key={String(field)} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => {
                      const val = e.target.checked;
                      handleChange(field, val);
                      config.onChange?.(val);
                    }}
                    required={required}
                  />
                  <span>{label}</span>
                </label>
              );
            }

            // Select
            // if (type === "select") {
            //   return (
            //     <div key={String(field)}>
            //       <label className="block mb-1 font-medium">{label}</label>
            //       <select
            //         value={value ?? ""}
            //         onChange={(e) => {
            //           const val = e.target.value;
            //           handleChange(field, val);
            //           config.onChange?.(val);
            //         }}
            //         required={required}
            //         className="w-full p-2 border border-gray-300 rounded"
            //       >
            //         <option value="" disabled>
            //           {placeholder || "Chọn một giá trị"}
            //         </option>
            //         {config.options?.map((opt) => (
            //           <option key={String(opt.value)} value={opt.value}>
            //             {opt.label}
            //           </option>
            //         ))}
            //       </select>
            //     </div>
            //   );
            // }
            if (type === "select") {
    // detect nếu options là số
    const isNumberSelect = config.options?.some(opt => typeof opt.value === "number");
    const isBooleanSelect = config.options?.some(opt => typeof opt.value === "boolean");

    return (
      <div key={String(field)}>
        <label className="block mb-1 font-medium">{label}</label>
        <select
          value={value ?? ""}
          onChange={(e) => {
            // 1) ép kiểu đúng
            let v: any = e.target.value;
            if (isNumberSelect && v !== "") v = Number(v);
             if (isBooleanSelect) {v = v === "true";}
            // 2) cập nhật internal state
            handleChange(field, v);
            // 3) gọi callback để fetch child (nếu parent)
            config.onChange?.(v);

          }}
          
          required={required}
          className="w-full p-2 border border-gray-300 rounded"
        >
          <option value="" disabled>
            {placeholder || "Chọn một giá trị"}
          </option>
          {config.options?.map((opt) => (
            <option key={String(opt.value)} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
            if (type === "file") {
              return (
                <div key={String(field)}>
                  <label className="block mb-1 font-medium">{label}</label>
                  <input
                    type="file"
                    accept={config.accept || "image/*"}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      handleChange(field, file);
                      config.onChange?.(file);
                    }}
                    required={required}
                  />
                  {/* Nếu muốn show preview ảnh */}
                  {value && typeof value !== "string" && isFile(value) && (
                      <img
                        src={URL.createObjectURL(value)}
                        alt="preview"
                        className="mt-2 max-h-24"
                      />
                    )}
                  {/* Nếu update, value có thể là url string */}
                  {value && typeof value === "string" && (
                    <img src={value} alt="current" className="mt-2 max-h-24" />
                  )}
                </div>
              );
            }
            // Text / Number inputs
            return (
              <div key={String(field)}>
                <label className="block mb-1 font-medium">{label}</label>
                <Input
                  type={type}
                  value={value ?? ""}
                  onChange={(e) => {
                    let val: any = e.target.value;
                    if (type === "number") {
                      val = e.target.value === "" ? "" : Number(e.target.value);
                    }
                    handleChange(field, val);
                    config.onChange?.(val);
                  }}
                  placeholder={placeholder}
                  required={required}
                />
              </div>
            );
          })}
          {extraForm && (
             <div className="pt-4 border-t border-gray-200">{extraForm}</div>
          )}
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="submit">Save</Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

