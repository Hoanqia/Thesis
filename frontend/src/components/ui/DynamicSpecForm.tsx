import React, { useEffect, useState, useRef } from "react";
import { fetchSpecificationsByProductId, fetchSpecValueSuggestions } from "@/features/specifications/api/specificationApi";
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

  // Trạng thái cho gợi ý tự động: key là specId, value là mảng các gợi ý
  const [suggestions, setSuggestions] = useState<{
    [key: number]: string[];
  }>({});
  // Trạng thái để kiểm soát việc hiển thị gợi ý
  const [showSuggestions, setShowSuggestions] = useState<{
    [key: number]: boolean;
  }>({});

  const debounceTimers = useRef<{ [key: number]: NodeJS.Timeout }>({});

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

    if (field === "value_text" && typeof val === "string") {
      if (debounceTimers.current[specId]) {
        clearTimeout(debounceTimers.current[specId]);
      }

      const query = val.trim();
      if (query.length < 2) {
        setSuggestions((prev) => ({ ...prev, [specId]: [] }));
        setShowSuggestions((prev) => ({ ...prev, [specId]: false }));
        return;
      }

      debounceTimers.current[specId] = setTimeout(async () => {
        try {
          // Gọi API của bạn để lấy gợi ý
          const response = await fetchSpecValueSuggestions(specId, query);
          // Định dạng response của bạn là { data: string[] }
          if (response && Array.isArray(response)) { // Sửa ở đây: response trực tiếp là mảng string[]
            setSuggestions((prev) => ({ ...prev, [specId]: response }));
            setShowSuggestions((prev) => ({ ...prev, [specId]: true }));
          } else {
            console.warn("API did not return expected data format:", response);
            setSuggestions((prev) => ({ ...prev, [specId]: [] }));
            setShowSuggestions((prev) => ({ ...prev, [specId]: false }));
          }
        } catch (err) {
          console.error("Error fetching suggestions:", err);
          setSuggestions((prev) => ({ ...prev, [specId]: [] }));
          setShowSuggestions((prev) => ({ ...prev, [specId]: false }));
        }
      }, 300); // 300ms debounce
    } else {
      setShowSuggestions((prev) => ({ ...prev, [specId]: false }));
    }
  };

  const handleSelectSuggestion = (specId: number, suggestion: string) => {
    handleChange(specId, "value_text", suggestion); // Cập nhật input với giá trị được chọn
    setShowSuggestions((prev) => ({ ...prev, [specId]: false })); // Ẩn danh sách gợi ý
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      specs.forEach(spec => {
        if (spec.data_type === "text") {
          const inputElement = document.getElementById(`spec-input-${spec.id}`);
          const suggestionsElement = document.getElementById(`spec-suggestions-${spec.id}`);

          if (inputElement && suggestionsElement &&
              !inputElement.contains(event.target as Node) &&
              !suggestionsElement.contains(event.target as Node)
          ) {
            setShowSuggestions(prev => ({ ...prev, [spec.id]: false }));
          }
        }
      });
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [specs]);


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
            // Thêm class `relative` vào container của mỗi input để danh sách gợi ý position: absolute đúng
            <div key={spec.id} className="flex flex-col relative">
              <label className="font-semibold mb-1">
                {spec.name} {spec.unit ? `(${spec.unit})` : ""}
              </label>

              {spec.data_type === "text" && (
                <>
                  <input
                    type="text"
                    id={`spec-input-${spec.id}`}
                    value={val.value_text ?? ""}
                    onChange={(e) =>
                      handleChange(spec.id, "value_text", e.target.value)
                    }
                    onFocus={() => {
                        // Hiển thị lại gợi ý khi focus vào input nếu đã có query
                        if (val.value_text && val.value_text.trim().length >= 2 && (suggestions[spec.id]?.length || 0) > 0) {
                            setShowSuggestions(prev => ({ ...prev, [spec.id]: true }));
                        }
                    }}
                    className="border rounded px-2 py-1"
                  />
                  {/* Vấn đề 2: Di chuyển khối JSX này ra khỏi điều kiện của "int" và "decimal"
                      và đặt nó ngay dưới input của "text" */}
                  {showSuggestions[spec.id] &&
                    suggestions[spec.id] &&
                    suggestions[spec.id].length > 0 && (
                      <div
                        id={`spec-suggestions-${spec.id}`}
                        className="absolute bg-white border border-gray-300 rounded shadow-md mt-1 top-full left-0 right-0 z-10 max-h-40 overflow-y-auto"
                      >
                        {suggestions[spec.id].map((suggestion, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() =>
                              handleSelectSuggestion(spec.id, suggestion)
                            }
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                </>
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
// import React, { useEffect, useState , useRef} from "react";
// import { fetchSpecificationsByProductId, fetchSpecValueSuggestions } from "@/features/specifications/api/specificationApi";
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
//   variantId?: number;
//   onSubmit: (values: { [specId: number]: SpecValue }) => void;
//   defaultValues?: { [specId: number]: SpecValue };
// };

// const fetchSpecValuesSuggestions = async (
//   specId: number,
//   query: string
// ): Promise<string[]> => {
//   console.log(`Fetching suggestions for spec ${specId} with query: ${query}`);
//     const suggestions = await fetchSpecValueSuggestions(specId,query);

// }
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

//   // Trạng thái cho gợi ý tự động: key là specId, value là mảng các gợi ý
//   const [suggestions, setSuggestions] = useState<{
//     [key: number]: string[];
//   }>({});
//   // Trạng thái để kiểm soát việc hiển thị gợi ý
//   const [showSuggestions, setShowSuggestions] = useState<{
//     [key: number]: boolean;
//   }>({});

//   const debounceTimers = useRef<{ [key: number]: NodeJS.Timeout }>({});

//   useEffect(() => {
//     async function initForm() {
//       setLoading(true);
//       setError(null);
//       try {
//         // 1. Fetch specs
//         const rawSpecs = await fetchSpecificationsByProductId(productId);
//         const typedSpecs = rawSpecs.filter(
//           (spec): spec is Specification =>
//             ["int", "decimal", "text", "option"].includes(spec.data_type)
//         );
//         setSpecs(typedSpecs);

//         // 2. Init values from defaultValues or empty
//         const initValues: { [key: number]: SpecValue } = {};
//         typedSpecs.forEach((spec) => {
//           initValues[spec.id] = defaultValues?.[spec.id] || {};
//         });

//         // 3. If edit mode, fetch saved values array and map by spec_id
//         if (variantId) {
//           const savedList = await variantApi.fetchSpecValuesOfVariant(variantId);
//           savedList.forEach((item: any) => {
//             const { spec_id, value_text, value_int, value_decimal, option_id } = item;
//             initValues[spec_id] = {
//               value_text: value_text ?? initValues[spec_id]?.value_text,
//               value_int: value_int ?? initValues[spec_id]?.value_int,
//               value_decimal: value_decimal ?? initValues[spec_id]?.value_decimal,
//               option_id: option_id ?? initValues[spec_id]?.option_id,
//             };
//           });
//         } 

//         // Set merged values
//         setValues(initValues);
//       } catch (err: any) {
//         setError(err.message || "Không tải được thông số kỹ thuật");
//       } finally {
//         setLoading(false);
//       }
//     }

//     initForm();
//   }, [productId, variantId, defaultValues]);

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
//     if (field === "value_text" && typeof val === "string") {
//       // Clear timer cũ
//       if (debounceTimers.current[specId]) {
//         clearTimeout(debounceTimers.current[specId]);
//       }

//       const query = val.trim();
//       if (query.length < 2) { // Chỉ gửi yêu cầu nếu query có 2 ký tự trở lên
//         setSuggestions((prev) => ({ ...prev, [specId]: [] }));
//         setShowSuggestions((prev) => ({ ...prev, [specId]: false }));
//         return;
//       }

//       // Thiết lập timer mới
//       debounceTimers.current[specId] = setTimeout(async () => {
//         try {
//           // Gọi API của bạn để lấy gợi ý
//           const response = await fetchSpecValueSuggestions(specId, query);
//           if (response && response.status === "success" && Array.isArray(response.data)) {
//             setSuggestions((prev) => ({ ...prev, [specId]: response.data }));
//             setShowSuggestions((prev) => ({ ...prev, [specId]: true }));
//           } else {
//             console.warn("API did not return expected data format:", response);
//             setSuggestions((prev) => ({ ...prev, [specId]: [] }));
//             setShowSuggestions((prev) => ({ ...prev, [specId]: false }));
//           }
//         } catch (err) {
//           console.error("Error fetching suggestions:", err);
//           setSuggestions((prev) => ({ ...prev, [specId]: [] }));
//           setShowSuggestions((prev) => ({ ...prev, [specId]: false }));
//         }
//       }, 300); // 300ms debounce
//     } else {
//         // Nếu không phải text input, ẩn gợi ý (nếu có)
//         setShowSuggestions((prev) => ({ ...prev, [specId]: false }));
//     }

//   };
//    const handleSelectSuggestion = (specId: number, suggestion: string) => {
//     handleChange(specId, "value_text", suggestion); // Cập nhật input với giá trị được chọn
//     setShowSuggestions((prev) => ({ ...prev, [specId]: false })); // Ẩn danh sách gợi ý
//   };

//   // Ẩn gợi ý khi click ra ngoài (quan trọng để UX tốt)
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       specs.forEach(spec => {
//         if (spec.data_type === "text") {
//           const inputElement = document.getElementById(`spec-input-${spec.id}`);
//           const suggestionsElement = document.getElementById(`spec-suggestions-${spec.id}`);
          
//           if (inputElement && suggestionsElement &&
//               !inputElement.contains(event.target as Node) &&
//               !suggestionsElement.contains(event.target as Node)
//           ) {
//             setShowSuggestions(prev => ({ ...prev, [spec.id]: false }));
//           }
//         }
//       });
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, [specs]); 


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
//                   id={`spec-input-${spec.id}`} // Thêm ID để dễ dàng truy cập
//                   value={val.value_text ?? ""}
//                   onChange={(e) =>
//                     handleChange(spec.id, "value_text", e.target.value)
//                   }
//                    onFocus={() => { // Hiển thị lại gợi ý khi focus vào input nếu đã có query
//                         if (val.value_text && val.value_text.trim().length >= 2 && (suggestions[spec.id]?.length || 0) > 0) {
//                             setShowSuggestions(prev => ({ ...prev, [spec.id]: true }));
//                         }
//                     }}

//                   className="border rounded px-2 py-1"
//                 />
                
//               )}

//               {(spec.data_type === "int" || spec.data_type === "decimal") && (
//                 <input
//                   type="number"
//                   step={spec.data_type === "decimal" ? "0.01" : "1"}
//                   value={
//                     spec.data_type === "decimal"
//                       ? val.value_decimal ?? ""
//                       : val.value_int ?? ""
//                   }
//                   onChange={(e) =>
//                     handleChange(
//                       spec.id,
//                       spec.data_type === "decimal" ? "value_decimal" : "value_int",
//                       e.target.value === "" ? null : Number(e.target.value)
//                     )
//                   }
//                   className="border rounded px-2 py-1"
//                 />
//                  {/* Danh sách gợi ý */}
//                   {showSuggestions[spec.id] &&
//                     suggestions[spec.id] &&
//                     suggestions[spec.id].length > 0 && (
//                       <div
//                         id={`spec-suggestions-${spec.id}`} // Thêm ID
//                         className="absolute bg-white border border-gray-300 rounded shadow-md mt-1 top-full left-0 right-0 z-10 max-h-40 overflow-y-auto"
//                       >
//                         {suggestions[spec.id].map((suggestion, index) => (
//                           <div
//                             key={index}
//                             className="px-3 py-2 cursor-pointer hover:bg-gray-100"
//                             onMouseDown={(e) => e.preventDefault()} // Ngăn chặn blur input khi click suggestion
//                             onClick={() =>
//                               handleSelectSuggestion(spec.id, suggestion)
//                             }
//                           >
//                             {suggestion}
//                           </div>
//                         ))}
//                       </div>
//                     )}
//                 </>
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
//             onClick={() => {
//                 console.log("Submit spec values:", values);
//                 onSubmit(values);
//               }}
//           className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
//         >
//           Lưu thông số
//         </button>
//       </div>
//     </div>
//   );
// }

