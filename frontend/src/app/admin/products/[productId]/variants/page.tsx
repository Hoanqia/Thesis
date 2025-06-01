  // frontend/src/app/admin/products/[productId]/variants/page.tsx
  "use client";

  import CrudGeneric from "@/components/ui/VariantGeneric";
  import { useEffect, useState } from "react";
  import { variantApi, Variant } from "@/features/variants/api/variantApi";
  import { fetchProducts, Product } from '@/features/products/api/productApi';
  import { useParams } from "next/navigation";
  import { FileInputWithPreview } from "@/components/ui/FileInputWithPreview";
  import DynamicSpecForm from "@/components/ui/DynamicSpecForm";
  import toast, { Toaster } from "react-hot-toast";

  export default function VariantPage() {
    const [products, setProducts] = useState<{ label: string; value: number; categoryId: number }[]>([]);
    const [specValues, setSpecValues] = useState<Record<number, any>>({});

    const [variants, setVariants] = useState<Variant[]>([]);
    const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
    const [editingSpecValues, setEditingSpecValues] = useState<Record<number, any>>({});
    const [editingVariantId, setEditingVariantId] = useState<number | undefined>(undefined);

    const params = useParams();
    const productId = Number(params.productId);
    
    useEffect(() => {
      fetchAll();
    }, []);

      const handleEdit = (variant: Variant) => {
          console.log("VariantPage handleEdit, id =", variant.id);
          setEditingVariantId(variant.id);
          // DynamicSpecForm sẽ tự fetch spec values khi nhận variantId
        };


    const fetchAll = async () => {
      try {
        const [variantData, productResponse] = await Promise.all([
          variantApi.fetchByProduct(productId),
          fetchProducts(),
        ]);
        setVariants(variantData);
        setProducts(
          productResponse.map((p: Product) => ({
            label: p.name,
            value: p.id,
            categoryId: p.cat_id,
          }))
        );
      } catch (error: any) {
        toast.error(error.message || "Lỗi khi tải dữ liệu");
      }
    };

      const [parentVariantId, setParentVariantId] = useState<number | undefined>(undefined);

    const handleCreate = async (form: FormData) => {
          setParentVariantId(undefined);
          setEditingSpecValues({});
          setSpecValues({});
          setEditingVariantId(undefined);

      try {

    console.log("specValues trước khi gửi:", editingSpecValues);  // ✅ đổi chỗ này
        form.append("product_id", String(productId));
        if (parentVariantId !== undefined) {
            form.append("parent_variant_id", String(parentVariantId));
        }
        Object.entries(editingSpecValues).forEach(([specId, val], idx) => {
          form.append(`spec_values[${idx}][spec_id]`, specId);
          if (val.value_text != null)
            form.append(`spec_values[${idx}][value_text]`, val.value_text);
          if (val.value_int != null)
            form.append(`spec_values[${idx}][value_int]`, String(val.value_int));
          if (val.value_decimal != null)
            form.append(`spec_values[${idx}][value_decimal]`, String(val.value_decimal));
          if (val.option_id != null)
            form.append(`spec_values[${idx}][option_id]`, String(val.option_id));
        });
        for (let pair of form.entries()) {
            console.log(pair[0]+ ': '+ pair[1]);
          }

        await variantApi.create(form);
        setEditingSpecValues({});
         fetchAll();
        toast.success("Tạo variant thành công");
      } catch (error: any) {
        toast.error(error.message || "Lỗi khi tạo variant");
      }
    };

   const handleUpdate = async (id: number, form: FormData) => {
  try {
    console.log("specValues trước khi gửi:", editingSpecValues);
    form.append("product_id", String(productId));
    if (parentVariantId !== undefined) {
      form.append("parent_variant_id", String(parentVariantId));
    }
    Object.entries(editingSpecValues).forEach(([specId, val], idx) => {
      form.append(`spec_values[${idx}][spec_id]`, specId);

      if (val.value_text !== undefined && val.value_text !== null && val.value_text !== "")
        form.append(`spec_values[${idx}][value_text]`, val.value_text);

      if (val.value_int !== undefined && val.value_int !== null && val.value_int !== "")
        form.append(`spec_values[${idx}][value_int]`, String(val.value_int));

      if (val.value_decimal !== undefined && val.value_decimal !== null && val.value_decimal !== "")
        form.append(`spec_values[${idx}][value_decimal]`, String(val.value_decimal));

      if (val.option_id !== undefined && val.option_id !== null && val.option_id !== "")
        form.append(`spec_values[${idx}][option_id]`, String(val.option_id));
    });

    form.append("_method", "PATCH");
    await variantApi.update(id, form);
    setEditingSpecValues({});
    fetchAll();
    toast.success("Cập nhật variant thành công");
     setEditingVariantId(undefined); 
      setEditingSpecValues({});  
  } catch (error: any) {
    toast.error(error.message || "Lỗi khi cập nhật variant");
  }
};




    const handleDelete = async (id: number) => {
      try {
        await variantApi.delete(id);
        fetchAll();
        toast.success("Xóa variant thành công");
      } catch (error: any) {
        toast.error(error.message || "Lỗi khi xóa variant");
      }
    };

    const handleToggleStatus = async (id: number) => {
      try {
        const variant = variants.find((v) => v.id === id);
        if (!variant) throw new Error("Variant không tồn tại");
        await variantApi.toggleStatus(variant);
        fetchAll();
        toast.success("Chuyển trạng thái thành công");
      } catch (error: any) {
        toast.error(error.message || "Lỗi khi đổi trạng thái");
      }
    };

    const currentProduct = products.find((p) => p.value === productId);
    const categoryId = currentProduct?.categoryId ?? 0;

    return (
      <>
        <Toaster />
        <CrudGeneric<Variant>
          title="Quản lý Variant"
          initialData={variants}
          columns={["id", "sku", "price", "discount", "stock", "status", "image"]}
          fields={["sku", "price", "discount", "stock", "status", "image"]}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
          fieldsConfig={{
            sku: { label: "SKU", type: "text", placeholder: "Nhập SKU", required: false },
            price: { label: "Giá", type: "number", required: true },
            discount: { label: "Giảm giá", type: "number" },
            stock: { label: "Tồn kho", type: "number", required: true },
            status: {
              label: "Trạng thái",
              type: "select",
              options: [
                { label: "Kích hoạt", value: 1 },
                { label: "Vô hiệu hóa", value: 0 },
              ],
            },
            image: {
              label: "Ảnh Variant",
              type: "file",
              renderField: ({ value, onChange }) => (
                <FileInputWithPreview value={value} onChange={onChange} accept="image/*" />
              ),
            },
          }}
          renderRow={(item, column) => {
              if (column === "status") return item.status === 1 ? "Active" : "Inactive";
              if (column === "image") {
                const imageUrl = `${process.env.NEXT_PUBLIC_API_URL}/storage/${item.image}`;
                return imageUrl ? (
                  <img
                    src={item.image}
                    alt="variant"
                    className="h-10 w-10 object-cover rounded"
                  />
                ) : (
                  "-"
                );
              }
              return String(item[column as keyof Variant]);
            }}
        onStartEdit={handleEdit}
        extraForm={
            <div className="p-4 border-t">
                          {/* Chọn parent variant */}
               <div>
              <label className="block mb-1 font-medium">Clone specs từ variant:</label>
              <select
                value={parentVariantId ?? ""}
                onChange={e =>
                  setParentVariantId(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="w-full border rounded p-2"
              >
                <option value="">-- Không clone --</option>
                {variants.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.sku} (ID: {v.id})
                  </option>
                ))}
              </select>
            </div>
                    {/* Form spec động */}
              <DynamicSpecForm
               key={editingVariantId ?? "new"} 
                productId={productId}
                variantId={editingVariantId}
                defaultValues={editingSpecValues}
                onSubmit={(values) => setEditingSpecValues(values)}
              />
            </div>
        }
       
        />
      </>
    );
  }



// "use client";

// import CrudGeneric from "@/components/ui/VariantGeneric";
// import { useEffect, useState } from "react";
// import { variantApi, Variant } from "@/features/variants/api/variantApi";
// import { fetchProducts, Product } from '@/features/products/api/productApi';
// import { useParams } from "next/navigation";
// import { FileInputWithPreview } from "@/components/ui/FileInputWithPreview";
// import DynamicSpecForm from "@/components/ui/DynamicSpecForm";

// export default function VariantPage() {
//   const [variants, setVariants] = useState<Variant[]>([]);
//   // Thêm categoryId vào products
//   const [products, setProducts] = useState<{ label: string; value: number; categoryId: number }[]>([]);
//   const [specValues, setSpecValues] = useState<any>(null); // lưu spec_values

//   const params = useParams();
//   const productId = Number(params.productId);

//   useEffect(() => {
//     fetchAll();
//   }, []);

//   const fetchAll = async () => {
//     try {
//       const [variantData, productResponse] = await Promise.all([
//         variantApi.fetchByProduct(productId),
//         fetchProducts(),
//       ]);

//       setVariants(variantData);

//       // map thêm categoryId (giả sử product có trường cat_id)
//       setProducts(
//         productResponse.map((p: Product) => ({
//           label: p.name,
//           value: p.id,
//           categoryId: p.cat_id,  // sửa ở đây
//         }))
//       );
//     } catch (error: any) {
//       alert(error.message || "Lỗi khi tải dữ liệu");
//     }
//   };

//       const handleCreate = async (item: Omit<Variant, "id">) => {
//       try {
//         if (!specValues || Object.keys(specValues).length === 0) {
//           alert("Vui lòng điền và bấm 'Lưu thông số' trước khi tạo variant.");
//           return;
//         }

//         const newItem = { ...item, product_id: productId, spec_values: specValues };
//         await variantApi.create(newItem);
//         setSpecValues(null);
//         fetchAll();
//       } catch (error: any) {
//         alert(error.message || "Lỗi tạo variant");
//       }
//     };

//   const handleUpdate = async (id: number, item: Omit<Variant, "id">) => {
//     try {
//       const updatedItem = { ...item, product_id: productId, spec_values: specValues }; // gộp spec_values
//       await variantApi.update(id, updatedItem);
//       setSpecValues(null); // reset sau cập nhật
//       fetchAll();
//     } catch (error: any) {
//       alert(error.message || "Lỗi cập nhật variant");
//     }
//   };

//   const handleDelete = async (id: number) => {
//     try {
//       await variantApi.delete(id);
//       fetchAll();
//     } catch (error: any) {
//       alert(error.message || "Lỗi xóa variant");
//     }
//   };

//   const handleToggleStatus = async (id: number) => {
//     try {
//       const variant = variants.find((v) => v.id === id);
//       if (!variant) throw new Error("Variant không tồn tại");

//       await variantApi.toggleStatus(variant);
//       fetchAll();
//     } catch (error: any) {
//       alert(error.message || "Lỗi thay đổi trạng thái");
//     }
//   };

//   // Lấy categoryId của sản phẩm hiện tại để truyền cho DynamicSpecForm
//   const currentProduct = products.find((p) => p.value === productId);
//   const categoryId = currentProduct ? currentProduct.categoryId : 0; // hoặc undefined/null tùy bạn xử lý

//   return (
//     <CrudGeneric<Variant>
//       title="Quản lý Variant"
//       initialData={variants}
//       columns={["id", "product_id", "sku", "price", "discount", "stock", "status", "image"]}
//       fields={["price", "discount", "stock", "status", "image"]}

//       onCreate={handleCreate}
//       onUpdate={handleUpdate}
//       onDelete={handleDelete}
//       onToggleStatus={handleToggleStatus}

//       fieldsConfig={{
//         product_id: {
//           label: "Sản phẩm",
//           type: "select",
//           options: products,
//           required: true,
//         },
//         price: {
//           label: "Giá",
//           type: "number",
//           required: true,
//         },
//         discount: {
//           label: "Giảm giá",
//           type: "number",
//         },
//         stock: {
//           label: "Số lượng tồn",
//           type: "number",
//           required: true,
//         },
//         status: {
//           label: "Trạng thái",
//           type: "select",
//           options: [
//             { label: "Kích hoạt", value: 1 },
//             { label: "Vô hiệu hóa", value: 0 },
//           ],
//         },
//         image: {
//           label: "Ảnh Variant",
//           type: "file",
//           renderField: ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
//             <FileInputWithPreview value={value} onChange={onChange} />
//           ),
//           required: false,
//         },
//       }}

//       renderRow={(item, column) => {
//         if (column === "status") {
//           return item.status === 1 ? "Active" : "Inactive";
//         }
//         if (column === "product_id") {
//           const product = products.find((p) => p.value === item.product_id);
//           return product ? product.label : item.product_id;
//         }
//         if (column === "image") {
//           return item.image ? (
//             <img
//               src={process.env.NEXT_PUBLIC_API_URL + "/storage/" + item.image}
//               alt="variant"
//               className="h-10 w-10 object-cover rounded"
//             />
//           ) : (
//             "-"
//           );
//         }
//         return item[column as keyof Variant];
//       }}

//       extraForm={
//         <DynamicSpecForm
//           productId={productId} // <-- truyền vào đây
//           categoryId={categoryId}       // Bắt buộc truyền categoryId
//           defaultValues={specValues}
//           onSubmit={(values) => setSpecValues(values)}  // Đổi onChange thành onSubmit
//         />
//       }

//     />
//   );
// }
