// components/ui/CrudModal.tsx
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { CrudItem } from "@/components/ui/CrudGeneric";

type CrudModalProps<T extends CrudItem> = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: Omit<T, "id">, id?: number) => void;
  defaultValues?: T | null;
  fields: (keyof T)[];
  title?: string;
};

export const CrudModal = <T extends CrudItem>({
  isOpen,
  onClose,
  onSubmit,
  defaultValues,
  fields,
  title,
}: CrudModalProps<T>) => {
  const [formData, setFormData] = useState<Partial<Omit<T, "id">>>({});

  useEffect(() => {
    if (defaultValues) {
      // Bỏ id ra khỏi object
      const { id, ...rest } = defaultValues;
      setFormData(rest);
    } else {
      setFormData({});
    }
  }, [defaultValues]);

  const handleChange = (field: keyof T, value: string | boolean) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {title || (defaultValues ? "Update Item" : "Create Item")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => {
            // Cast field để truy cập formData
            const fieldKey = field as keyof typeof formData;
            const value = formData[fieldKey];

            if (typeof value === "boolean") {
              return (
                <label key={String(field)} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => handleChange(field, e.target.checked)}
                  />
                  <span>{String(field)}</span>
                </label>
              );
            }

            return (
              <Input
                key={String(field)}
                value={(value as string) || ""}
                onChange={(e) => handleChange(field, e.target.value)}
                placeholder={String(field)}
                required
              />
            );
          })}

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
