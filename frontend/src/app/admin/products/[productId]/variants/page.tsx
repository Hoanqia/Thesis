"use client";

import CrudGeneric from "@/components/ui/CrudGeneric";
import { useEffect, useState } from "react";
import { variantApi, Variant } from "@/features/variants/api/variantApi";
import { fetchProducts, Product } from '@/features/products/api/productApi';
import { useParams } from "next/navigation";
import { FileInputWithPreview } from "@/components/ui/FileInputWithPreview";
import DynamicSpecForm from "@/components/ui/DynamicSpecForm";

export default function VariantPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  // Thêm categoryId vào products
  const [products, setProducts] = useState<{ label: string; value: number; categoryId: number }[]>([]);
  const [specValues, setSpecValues] = useState<any>(null); // lưu spec_values

  const params = useParams();
  const productId = Number(params.productId);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [variantData, productResponse] = await Promise.all([
        variantApi.fetchByProduct(productId),
        fetchProducts(),
      ]);

      setVariants(variantData);

      // map thêm categoryId (giả sử product có trường cat_id)
      setProducts(
        productResponse.map((p: Product) => ({
          label: p.name,
          value: p.id,
          categoryId: p.cat_id,  // sửa ở đây
        }))
      );
    } catch (error: any) {
      alert(error.message || "Lỗi khi tải dữ liệu");
    }
  };

  const handleCreate = async (item: Omit<Variant, "id">) => {
    try {
      const newItem = { ...item, product_id: productId, spec_values: specValues }; // gộp spec_values
      await variantApi.create(newItem);
      setSpecValues(null); // reset sau tạo
      fetchAll();
    } catch (error: any) {
      alert(error.message || "Lỗi tạo variant");
    }
  };

  const handleUpdate = async (id: number, item: Omit<Variant, "id">) => {
    try {
      const updatedItem = { ...item, product_id: productId, spec_values: specValues }; // gộp spec_values
      await variantApi.update(id, updatedItem);
      setSpecValues(null); // reset sau cập nhật
      fetchAll();
    } catch (error: any) {
      alert(error.message || "Lỗi cập nhật variant");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await variantApi.delete(id);
      fetchAll();
    } catch (error: any) {
      alert(error.message || "Lỗi xóa variant");
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      const variant = variants.find((v) => v.id === id);
      if (!variant) throw new Error("Variant không tồn tại");

      await variantApi.toggleStatus(variant);
      fetchAll();
    } catch (error: any) {
      alert(error.message || "Lỗi thay đổi trạng thái");
    }
  };

  // Lấy categoryId của sản phẩm hiện tại để truyền cho DynamicSpecForm
  const currentProduct = products.find((p) => p.value === productId);
  const categoryId = currentProduct ? currentProduct.categoryId : 0; // hoặc undefined/null tùy bạn xử lý

  return (
    <CrudGeneric<Variant>
      title="Quản lý Variant"
      initialData={variants}
      columns={["id", "product_id", "sku", "price", "discount", "stock", "status", "image"]}
      fields={["price", "discount", "stock", "status", "image"]}

      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onToggleStatus={handleToggleStatus}

      fieldsConfig={{
        product_id: {
          label: "Sản phẩm",
          type: "select",
          options: products,
          required: true,
        },
        price: {
          label: "Giá",
          type: "number",
          required: true,
        },
        discount: {
          label: "Giảm giá",
          type: "number",
        },
        stock: {
          label: "Số lượng tồn",
          type: "number",
          required: true,
        },
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
          renderField: ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
            <FileInputWithPreview value={value} onChange={onChange} />
          ),
          required: false,
        },
      }}

      renderRow={(item, column) => {
        if (column === "status") {
          return item.status === 1 ? "Active" : "Inactive";
        }
        if (column === "product_id") {
          const product = products.find((p) => p.value === item.product_id);
          return product ? product.label : item.product_id;
        }
        if (column === "image") {
          return item.image ? (
            <img
              src={process.env.NEXT_PUBLIC_API_URL + "/storage/" + item.image}
              alt="variant"
              className="h-10 w-10 object-cover rounded"
            />
          ) : (
            "-"
          );
        }
        return item[column as keyof Variant];
      }}

      extraForm={
        <DynamicSpecForm
          productId={productId} // <-- truyền vào đây
          categoryId={categoryId}       // Bắt buộc truyền categoryId
          defaultValues={specValues}
          onSubmit={(values) => setSpecValues(values)}  // Đổi onChange thành onSubmit
        />
      }

    />
  );
}


// "use client";

// import CrudGeneric from "@/components/ui/CrudGeneric";
// import { useEffect, useState } from "react";
// import { variantApi, Variant , } from "@/features/variants/api/variantApi";
// import { fetchProducts, Product } from '@/features/products/api/productApi';
// import { useParams } from "next/navigation";
// import {FileInputWithPreview} from "@/components/ui/FileInputWithPreview"
// import DynamicSpecForm from "@/components/ui/DynamicSpecForm"
// export default function VariantPage() {
//   const [variants, setVariants] = useState<Variant[]>([]);
//   const [products, setProducts] = useState<{ label: string; value: number }[]>([]);
//    const params = useParams();
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
//       setProducts(
//         productResponse.map((p: Product) => ({
//           label: p.name,
//           value: p.id,
//         }))
//       );
//     } catch (error: any) {
//       alert(error.message || "Lỗi khi tải dữ liệu");
//     }
//   };

//   const handleCreate = async (item: Omit<Variant, "id">) => {
//     try {
//       const newItem = { ...item, product_id: productId };
//       await variantApi.create(newItem);
//       fetchAll();
//     } catch (error: any) {
//       alert(error.message || "Lỗi tạo variant");
//     }
//   };

//   const handleUpdate = async (id: number, item: Omit<Variant, "id">) => {
//     try {
//       const updatedItem = { ...item, product_id: productId };
//       await variantApi.update(id, updatedItem);
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

//   return (
//           <CrudGeneric<Variant>
//         title="Quản lý Variant"
//         initialData={variants}
//         columns={["id", "product_id", "sku", "price", "discount", "stock", "status", "image"]}
//         fields={["price", "discount", "stock", "status", "image"]}

//         onCreate={handleCreate}
//         onUpdate={handleUpdate}
//         onDelete={handleDelete}
//         onToggleStatus={handleToggleStatus}

//         fieldsConfig={{
//           product_id: {
//             label: "Sản phẩm",
//             type: "select",
//             options: products,
//             required: true,
//           },
//           price: {
//             label: "Giá",
//             type: "number",
//             required: true,
//           },
//           discount: {
//             label: "Giảm giá",
//             type: "number",
//           },
//           stock: {
//             label: "Số lượng tồn",
//             type: "number",
//             required: true,
//           },
//           status: {
//             label: "Trạng thái",
//             type: "select",
//             options: [
//               { label: "Kích hoạt", value: 1 },
//               { label: "Vô hiệu hóa", value: 0 },
//             ],
//           },
//           image: {
//               label: "Ảnh Variant",
//               type: "file",
//               renderField: ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
//                 <FileInputWithPreview value={value} onChange={onChange} />
//               ),
//               required: false,
//           },
//         }}

//         renderRow={(item, column) => {
//           if (column === "status") {
//             return item.status === 1 ? "Active" : "Inactive";
//           }
//           if (column === "product_id") {
//             const product = products.find((p) => p.value === item.product_id);
//             return product ? product.label : item.product_id;
//           }
//           if (column === "image") {
//             return item.image ? (
//               <img
//                 src={process.env.NEXT_PUBLIC_API_URL + "/storage/" + item.image}
//                 alt="variant"
//                 className="h-10 w-10 object-cover rounded"
//               />
//             ) : (
//               "-"
//             );
//           }
//           return item[column as keyof Variant];
//         }}
//       />

//   );
// }


