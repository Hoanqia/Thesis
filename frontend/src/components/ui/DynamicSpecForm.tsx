import React, { useEffect, useState } from "react";
import { fetchSpecificationsByProductId } from "@/features/specifications/api/specificationApi";
import { variantApi } from "@/features/variants/api/variantApi";
import type { Specification } from "@/features/specifications/api/specificationApi";

type SpecValue = {
  value_text?: string | null;
  value_int?: number | null;
  value_decimal?: number | null;
  option_id?: number | null;
};

type Props = {
  productId: number;
  variantId?: number;
  onSubmit: (values: { [specId: number]: SpecValue }) => void;
  defaultValues?: { [specId: number]: SpecValue };
};

export default function DynamicSpecForm({
  productId,
  variantId,
  onSubmit,
  defaultValues,
}: Props) {
  const [specs, setSpecs] = useState<Specification[]>([]);
  const [values, setValues] = useState<{ [key: number]: SpecValue }>(
    defaultValues || {}
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initForm() {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch specs
        const rawSpecs = await fetchSpecificationsByProductId(productId);
        const typedSpecs = rawSpecs.filter(
          (spec): spec is Specification =>
            ["int", "decimal", "text", "option"].includes(spec.data_type)
        );
        setSpecs(typedSpecs);

        // 2. Init values from defaultValues or empty
        const initValues: { [key: number]: SpecValue } = {};
        typedSpecs.forEach((spec) => {
          initValues[spec.id] = defaultValues?.[spec.id] || {};
        });

        // 3. If edit mode, fetch saved values array and map by spec_id
        if (variantId) {
          const savedList = await variantApi.fetchSpecValuesOfVariant(variantId);
          savedList.forEach((item: any) => {
            const { spec_id, value_text, value_int, value_decimal, option_id } = item;
            initValues[spec_id] = {
              value_text: value_text ?? initValues[spec_id]?.value_text,
              value_int: value_int ?? initValues[spec_id]?.value_int,
              value_decimal: value_decimal ?? initValues[spec_id]?.value_decimal,
              option_id: option_id ?? initValues[spec_id]?.option_id,
            };
          });
        } 

        // Set merged values
        setValues(initValues);
      } catch (err: any) {
        setError(err.message || "Không tải được thông số kỹ thuật");
      } finally {
        setLoading(false);
      }
    }

    initForm();
  }, [productId, variantId, defaultValues]);

  const handleChange = (
    specId: number,
    field: keyof SpecValue,
    val: string | number | null
  ) => {
    setValues((prev) => ({
      ...prev,
      [specId]: {
        ...prev[specId],
        [field]: val,
      },
    }));
  };

  if (loading) return <div>Đang tải thông số kỹ thuật...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (specs.length === 0)
    return <div>Không có thông số kỹ thuật cho danh mục này</div>;

  return (
    <div className="space-y-4">
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
                      spec.data_type === "decimal" ? "value_decimal" : "value_int",
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
      </div>

      <div className="text-center">
        <button
          type="button"
            onClick={() => {
                console.log("Submit spec values:", values);
                onSubmit(values);
              }}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Lưu thông số
        </button>
      </div>
    </div>
  );
}


// import React, { useEffect, useState } from "react";
// import { fetchSpecificationsByProductId } from "@/features/specifications/api/specificationApi";
// import { variantApi } from "@/features/variants/api/variantApi";
// import type { Specification } from "@/features/specifications/api/specificationApi";

// type SpecValue = {
//   value_text?: string | null;
//   value_int?: number | null;
//   value_decimal?: number | null;
//   option_id?: number | null;
// };

// type Props = {
//   productId: number;
//   variantId?: number;  // <-- chỉ bắt buộc khi mode là edit
//   onSubmit: (values: { [specId: number]: SpecValue }) => void;
//   defaultValues?: { [specId: number]: SpecValue };
// };

// export default function DynamicSpecForm({
//   productId,
//   variantId,
//   onSubmit,
//   defaultValues,
// }: Props) {
//   const [specs, setSpecs] = useState<Specification[]>([]);
//   const [values, setValues] = useState<{ [key: number]: SpecValue }>(
//     defaultValues || {}
//   );
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//       console.log("DynamicSpecForm received variantId:", variantId);
//     async function initForm() {
//       setLoading(true);
//       setError(null);
//       try {
//         // 1. Lấy specs theo product
//         const rawSpecs = await fetchSpecificationsByProductId(productId);
//         const typedSpecs = rawSpecs.filter(
//           (spec): spec is Specification =>
//             ["int", "decimal", "text", "option"].includes(
//               spec.data_type
//             )
//         );
//         setSpecs(typedSpecs);

//         // 2. Khởi tạo giá trị rỗng hoặc defaultValues
//         let initValues: { [key: number]: SpecValue } = {};
//         typedSpecs.forEach((spec) => {
//           initValues[spec.id] = defaultValues?.[spec.id] || {};
//         });

//         // 3. Nếu có variantId, fetch giá trị đã lưu và merge
//         if (variantId) {
//           const savedValues = await variantApi.fetchSpecValuesOfVariant(variantId);
//           // savedValues: { [specId: number]: SpecValue }
//           initValues = {
//             ...initValues,
//             ...savedValues,
//           };
//         }

//         setValues(initValues);
//       } catch (err: any) {
//         setError(err.message || "Không tải được thông số kỹ thuật");
//       } finally {
//         setLoading(false);
//       }
//     }

//     initForm();
//   }, [productId, variantId]);

//   const handleChange = (
//     specId: number,
//     field: keyof SpecValue,
//     val: string | number | null
//   ) => {
//     setValues((prev) => ({
//       ...prev,
//       [specId]: {
//         ...prev[specId],
//         [field]: val,
//       },
//     }));
//   };

//   if (loading) return <div>Đang tải thông số kỹ thuật...</div>;
//   if (error) return <div className="text-red-600">{error}</div>;
//   if (specs.length === 0)
//     return <div>Không có thông số kỹ thuật cho danh mục này</div>;

//   return (
//     <div className="space-y-4">
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
//         {specs.map((spec) => {
//           const val = values[spec.id] || {};
//           return (
//             <div key={spec.id} className="flex flex-col">
//               <label className="font-semibold mb-1">
//                 {spec.name} {spec.unit ? `(${spec.unit})` : ""}
//               </label>

//               {spec.data_type === "text" && (
//                 <input
//                   type="text"
//                   value={val.value_text ?? ""}
//                   onChange={(e) =>
//                     handleChange(spec.id, "value_text", e.target.value)
//                   }
//                   className="border rounded px-2 py-1"
//                 />
//               )}

//               {(spec.data_type === "int" || spec.data_type === "decimal") && (
//                 <input
//                   type="number"
//                   step={
//                     spec.data_type === "decimal" ? "0.01" : "1"
//                   }
//                   value={
//                     spec.data_type === "decimal"
//                       ? val.value_decimal ?? ""
//                       : val.value_int ?? ""
//                   }
//                   onChange={(e) =>
//                     handleChange(
//                       spec.id,
//                       spec.data_type === "decimal"
//                         ? "value_decimal"
//                         : "value_int",
//                       e.target.value === "" ? null : Number(e.target.value)
//                     )
//                   }
//                   className="border rounded px-2 py-1"
//                 />
//               )}

//               {spec.data_type === "option" && (
//                 <select
//                   value={val.option_id ?? ""}
//                   onChange={(e) =>
//                     handleChange(
//                       spec.id,
//                       "option_id",
//                       e.target.value === "" ? null : Number(e.target.value)
//                     )
//                   }
//                   className="border rounded px-2 py-1"
//                 >
//                   <option value="">--Chọn {spec.name}--</option>
//                   {spec.spec_options?.map((opt) => (
//                     <option key={opt.id} value={opt.id}>
//                       {opt.value}
//                     </option>
//                   ))}
//                 </select>
//               )}
//             </div>
//           );
//         })}
//       </div>

//       <div className="text-center">
//         <button
//           type="button"
//           onClick={() => onSubmit(values)}
//           className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
//         >
//           Lưu thông số
//         </button>
//       </div>
//     </div>
//   );
// }


