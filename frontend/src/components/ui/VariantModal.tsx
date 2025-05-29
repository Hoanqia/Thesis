


// // components/ui/CrudModal.tsx
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { CrudItem, FieldConfig } from "@/components/ui/CrudGeneric";

type CrudModalProps<T extends CrudItem> = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData, id?: number) => void;  // sửa dòng này
  defaultValues?: T | null;
  fields: (keyof T)[];
  title?: string;
  fieldsConfig?: Partial<Record<keyof T, FieldConfig>>;
  extraForm?: React.ReactNode;
  
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

      const form = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value instanceof File) {
          form.append(key, value);
        } else if (typeof value === "boolean") {
          form.append(key, value ? "1" : "0");
        } else if (value !== undefined && value !== null) {
          form.append(key, String(value));
        }
      });

      onSubmit(form, defaultValues?.id);
      onClose();
    };


  function isFile(value: any): value is File {
    return value instanceof File;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-8 relative">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {title || (defaultValues ? "Update Item" : "Create Item")}
        </h2>

        <form  onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Main form fields */}
          <div className="space-y-5">
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

              if (type === "checkbox") {
                return (
                  <label
                    key={String(field)}
                    className="flex items-center space-x-2"
                  >
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
                    <span className="font-medium">{label}</span>
                  </label>
                );
              }

              if (type === "select") {
                return (
                  <div key={String(field)}>
                    <label className="block mb-1 font-medium">{label}</label>
                    <select
                      value={value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleChange(field, val);
                        config.onChange?.(val);
                      }}
                      required={required}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-300"
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
                      className="block w-full"
                    />
                    {value && typeof value !== "string" && isFile(value) && (
                      <img
                        src={URL.createObjectURL(value)}
                        alt="preview"
                        className="mt-2 max-h-32 rounded border shadow"
                      />
                    )}
                    {value && typeof value === "string" && (
                      <img
                        src={value}
                        alt="current"
                        className="mt-2 max-h-32 rounded border shadow"
                      />
                    )}
                  </div>
                );
              }

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
          </div>

          {/* Extra form on the right */}
          {extraForm && (
            <div className="space-y-5 border-l pl-6">
              <div className="grid grid-cols-1 gap-4">
                {React.Children.toArray(extraForm)}
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-3 mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {/* <Button type="submit" form="crud-form" className="bg-blue-600 hover:bg-blue-700 text-white"> */}
          +   <Button type="submit" className="bg-blue-600 …">
            Save
          </Button>
        </div>
        </form>

        
      </div>
    </div>
  );
};

// // // components/ui/CrudModal.tsx
// import React, { useEffect, useState } from "react";
// import { Input } from "@/components/ui/Input";
// import { Button } from "@/components/ui/Button";
// import type { CrudItem, FieldConfig } from "@/components/ui/CrudGeneric";

// type CrudModalProps<T extends CrudItem> = {
//   isOpen: boolean;
//   onClose: () => void;
//   onSubmit: (formData: FormData, id?: number) => void;  // sửa dòng này
//   defaultValues?: T | null;
//   fields: (keyof T)[];
//   title?: string;
//   fieldsConfig?: Partial<Record<keyof T, FieldConfig>>;
//   extraForm?: React.ReactNode;
  
// };

// export const CrudModal = <T extends CrudItem>({
//   isOpen,
//   onClose,
//   onSubmit,
//   defaultValues,
//   fields,
//   title,
//   fieldsConfig,
//   extraForm,
// }: CrudModalProps<T>) => {
//   const [formData, setFormData] = useState<Partial<Omit<T, "id">>>({});

//   useEffect(() => {
//     if (defaultValues) {
//       const { id, ...rest } = defaultValues;
//       setFormData(rest);
//     } else {
//       setFormData({});
//     }
//   }, [defaultValues]);

//   const handleChange = (field: keyof T, value: any) => {
//     setFormData((prev) => ({
//       ...prev,
//       [field]: value,
//     }));
//   };

//     const handleSubmit = (e: React.FormEvent) => {
//       e.preventDefault();

//       const form = new FormData();
//       Object.entries(formData).forEach(([key, value]) => {
//         if (value instanceof File) {
//           form.append(key, value);
//         } else if (typeof value === "boolean") {
//           form.append(key, value ? "1" : "0");
//         } else if (value !== undefined && value !== null) {
//           form.append(key, String(value));
//         }
//       });

//       onSubmit(form, defaultValues?.id);
//       onClose();
//     };


//   function isFile(value: any): value is File {
//     return value instanceof File;
//   }

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
//       <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-8 relative">
//         <h2 className="text-2xl font-bold mb-6 text-center">
//           {title || (defaultValues ? "Update Item" : "Create Item")}
//         </h2>

//         <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
//           {/* Main form fields */}
//           <div className="space-y-5">
//             {fields.map((field) => {
//               const fieldKey = field as keyof typeof formData;
//               const value = formData[fieldKey];
//               const config = fieldsConfig?.[field] || {};
//               const label = config.label ?? String(field);
//               const placeholder = config.placeholder ?? "";
//               const required = config.required ?? false;
//               const type = config.type ?? "text";

//               const onChangeWrapper = (val: any) => {
//                 handleChange(field, val);
//                 config.onChange?.(val);
//               };

//               if (config.renderField) {
//                 return (
//                   <div key={String(field)}>
//                     <label className="block mb-1 font-medium">{label}</label>
//                     {config.renderField({
//                       value,
//                       onChange: onChangeWrapper,
//                     })}
//                   </div>
//                 );
//               }

//               if (type === "checkbox") {
//                 return (
//                   <label
//                     key={String(field)}
//                     className="flex items-center space-x-2"
//                   >
//                     <input
//                       type="checkbox"
//                       checked={Boolean(value)}
//                       onChange={(e) => {
//                         const val = e.target.checked;
//                         handleChange(field, val);
//                         config.onChange?.(val);
//                       }}
//                       required={required}
//                     />
//                     <span className="font-medium">{label}</span>
//                   </label>
//                 );
//               }

//               if (type === "select") {
//                 return (
//                   <div key={String(field)}>
//                     <label className="block mb-1 font-medium">{label}</label>
//                     <select
//                       value={value ?? ""}
//                       onChange={(e) => {
//                         const val = e.target.value;
//                         handleChange(field, val);
//                         config.onChange?.(val);
//                       }}
//                       required={required}
//                       className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-300"
//                     >
//                       <option value="" disabled>
//                         {placeholder || "Chọn một giá trị"}
//                       </option>
//                       {config.options?.map((opt) => (
//                         <option key={String(opt.value)} value={opt.value}>
//                           {opt.label}
//                         </option>
//                       ))}
//                     </select>
//                   </div>
//                 );
//               }

//               if (type === "file") {
//                 return (
//                   <div key={String(field)}>
//                     <label className="block mb-1 font-medium">{label}</label>
//                     <input
//                       type="file"
//                       accept={config.accept || "image/*"}
//                       onChange={(e) => {
//                         const file = e.target.files?.[0] ?? null;
//                         handleChange(field, file);
//                         config.onChange?.(file);
//                       }}
//                       required={required}
//                       className="block w-full"
//                     />
//                     {value && typeof value !== "string" && isFile(value) && (
//                       <img
//                         src={URL.createObjectURL(value)}
//                         alt="preview"
//                         className="mt-2 max-h-32 rounded border shadow"
//                       />
//                     )}
//                     {value && typeof value === "string" && (
//                       <img
//                         src={value}
//                         alt="current"
//                         className="mt-2 max-h-32 rounded border shadow"
//                       />
//                     )}
//                   </div>
//                 );
//               }

//               return (
//                 <div key={String(field)}>
//                   <label className="block mb-1 font-medium">{label}</label>
//                   <Input
//                     type={type}
//                     value={value ?? ""}
//                     onChange={(e) => {
//                       let val: any = e.target.value;
//                       if (type === "number") {
//                         val = e.target.value === "" ? "" : Number(e.target.value);
//                       }
//                       handleChange(field, val);
//                       config.onChange?.(val);
//                     }}
//                     placeholder={placeholder}
//                     required={required}
//                   />
//                 </div>
//               );
//             })}
//           </div>

//           {/* Extra form on the right */}
//           {extraForm && (
//             <div className="space-y-5 border-l pl-6">
//               <div className="grid grid-cols-1 gap-4">
//                 {React.Children.toArray(extraForm)}
//               </div>
//             </div>
//           )}
//           <div className="flex justify-end space-x-3 mt-6">
//           <Button type="button" variant="ghost" onClick={onClose}>
//             Cancel
//           </Button>
//           {/* <Button type="submit" form="crud-form" className="bg-blue-600 hover:bg-blue-700 text-white"> */}
//           +   <Button type="submit" className="bg-blue-600 …">
//             Save
//           </Button>
//         </div>
//         </form>

        
//       </div>
//     </div>
//   );
// };
