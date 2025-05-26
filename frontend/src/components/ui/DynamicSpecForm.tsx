"use client";

import React, { useEffect, useState } from "react";
import { fetchSpecificationsByCategoryId , fetchSpecificationsByProductId} from "@/features/specifications/api/specificationApi";
import type { Specification } from "@/features/specifications/api/specificationApi";

type SpecOption = {
  id: number;
  value: string;
};

type SpecValue = {
  value_text?: string | null;
  value_int?: number | null;
  value_decimal?: number | null;
  option_id?: number | null;
};

type Props = {
  productId: number; // <-- thêm dòng này
  categoryId: number;
  onSubmit: (values: { [specId: number]: SpecValue }) => void;
  onChange?: (values: { [specId: number]: SpecValue }) => void; // thêm onChange
  defaultValues?: { [specId: number]: SpecValue };
};

export default function DynamicSpecForm({
  productId,
  categoryId,
  onSubmit,
  onChange,
  defaultValues,
}: Props) {
  const [specs, setSpecs] = useState<Specification[]>([]);
  const [values, setValues] = useState<{ [key: number]: SpecValue }>(defaultValues || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSpecs() {
      setLoading(true);
      setError(null);
      try {
        const rawSpecs = await fetchSpecificationsByProductId(productId);

        const typedSpecs = rawSpecs.filter(
          (spec): spec is Specification =>
            ["int", "decimal", "text", "option"].includes(spec.data_type)
        );

        setSpecs(typedSpecs);

        // Nếu không có defaultValues, khởi tạo giá trị rỗng cho từng spec
        if (!defaultValues) {
          const initValues: { [key: number]: SpecValue } = {};
          typedSpecs.forEach((spec) => {
            initValues[spec.id] = {};
          });
          setValues(initValues);
          if (onChange) onChange(initValues); // gọi onChange với giá trị khởi tạo
        } else {
          setValues(defaultValues);
        }
      } catch (err: any) {
        setError(err.message || "Không tải được thông số kỹ thuật");
      } finally {
        setLoading(false);
      }
    }

    fetchSpecs();
  }, [productId, defaultValues, onChange]);

  const handleChange = (
    specId: number,
    field: keyof SpecValue,
    val: string | number | null
  ) => {
    setValues((prev) => {
      const newValues = {
        ...prev,
        [specId]: {
          ...prev[specId],
          [field]: val,
        },
      };
      if (onChange) onChange(newValues); // gọi onChange khi có thay đổi
      return newValues;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  if (loading) return <div>Đang tải thông số kỹ thuật...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (specs.length === 0)
    return <div>Không có thông số kỹ thuật cho danh mục này</div>;

  return (
   <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {specs.map((spec) => {
            const val = values[spec.id] || {};
            return (
              <div key={spec.id} className="flex flex-col">
                <label className="font-semibold mb-1">
                  {spec.name} {spec.unit ? `(${spec.unit})` : ""}
                </label>

                {spec.data_type === "text" && (
                  <input
                    type="text"
                    value={val.value_text ?? ""}
                    onChange={(e) =>
                      handleChange(spec.id, "value_text", e.target.value)
                    }
                    className="border rounded px-2 py-1"
                  />
                )}

                {(spec.data_type === "int" || spec.data_type === "decimal") && (
                  <input
                    type="number"
                    step={spec.data_type === "decimal" ? "0.01" : "1"}
                    value={
                      spec.data_type === "decimal"
                        ? val.value_decimal ?? ""
                        : val.value_int ?? ""
                    }
                    onChange={(e) =>
                      handleChange(
                        spec.id,
                        spec.data_type === "decimal"
                          ? "value_decimal"
                          : "value_int",
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    className="border rounded px-2 py-1"
                  />
                )}

                {spec.data_type === "option" && (
                  <select
                    value={val.option_id ?? ""}
                    onChange={(e) =>
                      handleChange(
                        spec.id,
                        "option_id",
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    className="border rounded px-2 py-1"
                  >
                    <option value="">--Chọn {spec.name}--</option>
                    {spec.spec_options?.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.value}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}

          <button
            type="submit"
            className="col-span-2 mx-auto bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Lưu thông số
          </button>
        </div>
      </form>

        );
}


// "use client";

// import React, { useEffect, useState } from "react";
// import { fetchSpecificationsByCategoryId , fetchSpecificationsByProductId} from "@/features/specifications/api/specificationApi";
// import type { Specification } from "@/features/specifications/api/specificationApi";

// type SpecOption = {
//   id: number;
//   value: string;
// };

// type SpecValue = {
//   value_text?: string | null;
//   value_int?: number | null;
//   value_decimal?: number | null;
//   option_id?: number | null;
// };

// type Props = {
//   productId: number; // <-- thêm dòng này
//   categoryId: number;
//   onSubmit: (values: { [specId: number]: SpecValue }) => void;
//   onChange?: (values: { [specId: number]: SpecValue }) => void; // thêm onChange
//   defaultValues?: { [specId: number]: SpecValue };
// };

// export default function DynamicSpecForm({
//   productId,
//   categoryId,
//   onSubmit,
//   onChange,
//   defaultValues,
// }: Props) {
//   const [specs, setSpecs] = useState<Specification[]>([]);
//   const [values, setValues] = useState<{ [key: number]: SpecValue }>(defaultValues || {});
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     async function fetchSpecs() {
//       setLoading(true);
//       setError(null);
//       try {
//         const rawSpecs = await fetchSpecificationsByProductId(productId);

//         const typedSpecs = rawSpecs.filter(
//           (spec): spec is Specification =>
//             ["int", "decimal", "text", "option"].includes(spec.data_type)
//         );

//         setSpecs(typedSpecs);

//         // Nếu không có defaultValues, khởi tạo giá trị rỗng cho từng spec
//         if (!defaultValues) {
//           const initValues: { [key: number]: SpecValue } = {};
//           typedSpecs.forEach((spec) => {
//             initValues[spec.id] = {};
//           });
//           setValues(initValues);
//           if (onChange) onChange(initValues); // gọi onChange với giá trị khởi tạo
//         } else {
//           setValues(defaultValues);
//         }
//       } catch (err: any) {
//         setError(err.message || "Không tải được thông số kỹ thuật");
//       } finally {
//         setLoading(false);
//       }
//     }

//     fetchSpecs();
//   }, [productId, defaultValues, onChange]);

//   const handleChange = (
//     specId: number,
//     field: keyof SpecValue,
//     val: string | number | null
//   ) => {
//     setValues((prev) => {
//       const newValues = {
//         ...prev,
//         [specId]: {
//           ...prev[specId],
//           [field]: val,
//         },
//       };
//       if (onChange) onChange(newValues); // gọi onChange khi có thay đổi
//       return newValues;
//     });
//   };

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     onSubmit(values);
//   };

//   if (loading) return <div>Đang tải thông số kỹ thuật...</div>;
//   if (error) return <div className="text-red-600">{error}</div>;
//   if (specs.length === 0)
//     return <div>Không có thông số kỹ thuật cho danh mục này</div>;

//   return (
//     <form onSubmit={handleSubmit} className="space-y-4">
//       {specs.map((spec) => {
//         const val = values[spec.id] || {};
//         return (
//           <div key={spec.id} className="flex flex-col">
//             <label className="font-semibold">
//               {spec.name} {spec.unit ? `(${spec.unit})` : ""}
//             </label>

//             {spec.data_type === "text" && (
//               <input
//                 type="text"
//                 value={val.value_text ?? ""}
//                 onChange={(e) =>
//                   handleChange(spec.id, "value_text", e.target.value)
//                 }
//                 className="border rounded px-2 py-1"
//               />
//             )}

//             {(spec.data_type === "int" || spec.data_type === "decimal") && (
//               <input
//                 type="number"
//                 step={spec.data_type === "decimal" ? "0.01" : "1"}
//                 value={
//                   spec.data_type === "decimal"
//                     ? val.value_decimal ?? ""
//                     : val.value_int ?? ""
//                 }
//                 onChange={(e) =>
//                   handleChange(
//                     spec.id,
//                     spec.data_type === "decimal"
//                       ? "value_decimal"
//                       : "value_int",
//                     e.target.value === "" ? null : Number(e.target.value)
//                   )
//                 }
//                 className="border rounded px-2 py-1"
//               />
//             )}

//             {spec.data_type === "option" && (
//               <select
//                 value={val.option_id ?? ""}
//                 onChange={(e) =>
//                   handleChange(
//                     spec.id,
//                     "option_id",
//                     e.target.value === "" ? null : Number(e.target.value)
//                   )
//                 }
//                 className="border rounded px-2 py-1"
//               >
//                 <option value="">--Chọn {spec.name}--</option>
//                 {spec.spec_options?.map((opt) => (
//                   <option key={opt.id} value={opt.id}>
//                     {opt.value}
//                   </option>
//                 ))}
//               </select>
//             )}
//           </div>
//         );
//       })}

//       <button
//         type="submit"
//         className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
//       >
//         Lưu thông số
//       </button>
//     </form>
//   );
// }
