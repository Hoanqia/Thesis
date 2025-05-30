"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CrudGeneric from "@/components/ui/CrudGeneric";
import toast, { Toaster } from "react-hot-toast";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
} from "@/features/products/api/productApi";
import {
  Category,
  fetchCategories,
  fetchParentCategories,
  fetchChildCategories,
} from "@/features/categories/api/categoryApi";
import { fetchBrands } from "@/features/brands/api/brandApi";

export interface UIProduct {
  id: number;
  name: string;
  slug: string;
  description: string;
  cat_id: number;
  brand_id: number;
  is_featured: boolean;
  status: boolean;
}
interface UIProductWithNames extends UIProduct {
  cat_name: string;
  brand_name: string;
  parent_cat_id?: number;
  child_cat_id?: number;
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<UIProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [childCategories, setChildCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadBrands();
    loadParentCategories();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await fetchProducts();
      setProducts(res);
    } catch {
      toast.error("Lấy danh sách sản phẩm thất bại");
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetchCategories();
      setCategories(res);
    } catch {
      toast.error("Lấy danh mục thất bại");
    }
  };

  const loadParentCategories = async () => {
    try {
      const res = await fetchParentCategories();
      setParentCategories(res);
    } catch {
      toast.error("Lấy danh mục cha thất bại");
    }
  };

  const handleParentChange = async (parentId: number) => {
    setChildCategories([]);
    try {
      const res = await fetchChildCategories(parentId);
      setChildCategories(res);
    } catch {
      toast.error("Lấy danh mục con thất bại");
    }
  };

  const loadBrands = async () => {
    try {
      const res = await fetchBrands();
      setBrands(res);
    } catch {
      toast.error("Lấy thương hiệu thất bại");
    }
  };

  const handleCreate = async (
    item: Omit<UIProductWithNames, "id" | "slug" | "cat_name" | "brand_name">
  ) => {
    try {
      const payload = {
        name: item.name,
        description: item.description,
        // Ưu tiên dùng child nếu có, nếu không dùng parent
        cat_id: item.child_cat_id ?? item.parent_cat_id!,
        brand_id: item.brand_id,
        is_featured: item.is_featured,
        status: item.status,
      };
      await createProduct(payload);
      await loadProducts();
      toast.success("Tạo sản phẩm thành công");
    } catch {
      toast.error("Tạo sản phẩm thất bại");
    }
  };

  const handleUpdate = async (
    id: number,
    item: Omit<UIProductWithNames, "id" | "slug" | "cat_name" | "brand_name">
  ) => {
    const product = products.find((p) => p.id === id);
    if (!product) {
      toast.error(`Sản phẩm với id ${id} không tồn tại`);
      return;
    }
    try {
      const payload = {
        name: item.name,
        description: item.description,
        cat_id: item.child_cat_id ?? item.parent_cat_id!,
        brand_id: item.brand_id,
        is_featured: item.is_featured,
        status: item.status,
      };
      await updateProduct(product.slug, payload);
      await loadProducts();
      toast.success("Cập nhật sản phẩm thành công");
    } catch {
      toast.error("Cập nhật sản phẩm thất bại");
    }
  };

  const handleDelete = async (id: number) => {
    const product = products.find((p) => p.id === id);
    if (!product) {
      toast.error(`Sản phẩm với id ${id} không tồn tại`);
      return;
    }
    try {
      await deleteProduct(product.slug);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Xóa sản phẩm thành công");
    } catch {
      toast.error("Xóa sản phẩm thất bại");
    }
  };

  const handleToggleStatus = async (id: number) => {
    const product = products.find((p) => p.id === id);
    if (!product) {
      toast.error(`Sản phẩm với id ${id} không tồn tại`);
      return;
    }
    try {
      const res = await toggleProductStatus(product.slug, product.status);
      setProducts((prev) => prev.map((p) => (p.id === id ? res : p)));
      toast.success("Chuyển trạng thái thành công");
    } catch {
      toast.error("Chuyển trạng thái thất bại");
    }
  };

  const productsWithNames: UIProductWithNames[] = products.map((p) => {
    const category = categories.find((c) => c.id === p.cat_id);
    const brand = brands.find((b) => b.id === p.brand_id);
    return {
      ...p,
      cat_name: category?.name || "N/A",
      brand_name: brand?.name || "N/A",
      parent_cat_id: undefined,
      child_cat_id: undefined,
    };
  });

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <CrudGeneric<UIProductWithNames>
        title="Sản phẩm"
        initialData={productsWithNames}
        columns={[
          "id",
          "name",
          "slug",
          "cat_name",
          "brand_name",
          "is_featured",
          "status",
        ]}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        fields={[
          "parent_cat_id",
          "child_cat_id",
          "name",
          "description",
          "brand_id",
          "is_featured",
          "status",
        ]}
        fieldsConfig={{
          parent_cat_id: {
            label: "Danh mục cha",
            type: "select",
            options: parentCategories.map((c) => ({ value: c.id, label: c.name })),
            onChange: (val: number) => {
              handleParentChange(val);
            },
            required: true,
          },
          child_cat_id: {
            label: "Danh mục con",
            type: "select",
            options: childCategories.map((c) => ({ value: c.id, label: c.name })),
            // chỉ required khi thực sự có child options
            required: childCategories.length > 0,
          },
          name: { label: "Tên sản phẩm", required: true },
          description: { label: "Mô tả" },
          brand_id: {
            label: "Thương hiệu",
            type: "select",
            required: true,
            options: brands.map((b) => ({ value: b.id, label: b.name })),
          },
          is_featured: { label: "Nổi bật", type: "checkbox" },
          status: {
            label: "Trạng thái",
            type: "select",
            options: [
              { label: "Active", value: true },
              { label: "Inactive", value: false },
            ],
          },
        }}
        renderActions={(product) => (
          <button
            className="text-indigo-600 hover:underline"
            onClick={() => router.push(`/admin/products/${product.id}/variants`)}
          >
            Xem variants
          </button>
        )}
      />
    </>
  );
}

// // // frontend/src/app/admin/products/page.tsx
// "use client";
// import { useRouter } from "next/navigation";
// import { useEffect, useState } from "react";
// import CrudGeneric from "@/components/ui/CrudGeneric";
// import toast, { Toaster } from "react-hot-toast";
// import {
//   fetchProducts,
//   createProduct,
//   updateProduct,
//   deleteProduct,
//   toggleProductStatus,
// } from "@/features/products/api/productApi";
// import {
//   Category,
//   fetchCategories,
//   fetchParentCategories,
//   fetchChildCategories,
// } from "@/features/categories/api/categoryApi";
// import { fetchBrands } from "@/features/brands/api/brandApi";

// export interface UIProduct {
//   id: number;
//   name: string;
//   slug: string;
//   description: string;
//   cat_id: number;
//   brand_id: number;
//   is_featured: boolean;
//   status: boolean;
// }
// interface UIProductWithNames extends UIProduct {
//   cat_name: string;
//   brand_name: string;
//   parent_cat_id?: number;
//   child_cat_id?: number;
// }

// export default function ProductsPage() {
//     const router = useRouter();
//   const [products, setProducts] = useState<UIProduct[]>([]);
//   const [categories, setCategories] = useState<Category[]>([]);
//   const [parentCategories, setParentCategories] = useState<Category[]>([]);
//   const [childCategories, setChildCategories] = useState<Category[]>([]);
//   const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);

//   useEffect(() => {
//     loadProducts();
//     loadCategories();
//     loadBrands();
//     loadParentCategories();
//   }, []);

//   const loadProducts = async () => {
//     try {
//       const res = await fetchProducts();
//       setProducts(res);
//     } catch {
//       toast.error("Lấy danh sách sản phẩm thất bại");
//     }
//   };

//   const loadCategories = async () => {
//     try {
//       const res = await fetchCategories();
//       setCategories(res);
//     } catch {
//       toast.error("Lấy danh mục thất bại");
//     }
//   };

//   const loadParentCategories = async () => {
//     try {
//       const res = await fetchParentCategories();
//       console.log("Fetched parent categories:", res);
//       setParentCategories(res);
//     } catch (err) {
//       console.error("Error loading parent categories:", err);
//       toast.error("Lấy danh mục cha thất bại");
//     }
//   };

//   const handleParentChange = async (parentId: number) => {
//     console.log("Parent selected ID:", parentId);
//     setChildCategories([]);
//     try {
//       const res = await fetchChildCategories(parentId);
//       console.log(
//         `Fetched ${res.length} child categories for parent`,
//         parentId,
//         res
//       );
//       setChildCategories(res);
//     } catch (err) {
//       console.error("Error loading child categories:", err);
//       toast.error("Lấy danh mục con thất bại");
//     }
//   };

//   const loadBrands = async () => {
//     try {
//       const res = await fetchBrands();
//       setBrands(res);
//     } catch {
//       toast.error("Lấy thương hiệu thất bại");
//     }
//   };

//   const handleCreate = async (item: Omit<UIProductWithNames, "id" | "slug" | "cat_name" | "brand_name">) => {
//     try {
//       const payload = {
//         name: item.name,
//         description: item.description,
//         cat_id: item.child_cat_id!,
//         brand_id: item.brand_id,
//         is_featured: item.is_featured,
//         status: item.status,
//       };
//       console.log("Payload của ceate",payload);
//       await createProduct(payload);
//       await loadProducts();
//       toast.success("Tạo sản phẩm thành công");
//     } catch {
//       toast.error("Tạo sản phẩm thất bại");
//     }
//   };

//   const handleUpdate = async (
//     id: number,
//     item: Omit<UIProductWithNames, "id" | "slug" | "cat_name" | "brand_name">
//   ) => {
//     const product = products.find((p) => p.id === id);
//     if (!product) {
//       toast.error(`Sản phẩm với id ${id} không tồn tại`);
//       return;
//     }
//     try {
//       const payload = {
//         name: item.name,
//         description: item.description,
//         cat_id: item.child_cat_id!,
//         brand_id: item.brand_id,
//         is_featured: item.is_featured,
//         status: item.status,
//       };
//       await updateProduct(product.slug, payload);
//       await loadProducts();
//       toast.success("Cập nhật sản phẩm thành công");
//     } catch {
//       toast.error("Cập nhật sản phẩm thất bại");
//     }
//   };

//   const handleDelete = async (id: number) => {
//     const product = products.find((p) => p.id === id);
//     if (!product) {
//       toast.error(`Sản phẩm với id ${id} không tồn tại`);
//       return;
//     }
//     try {
//       await deleteProduct(product.slug);
//       setProducts((prev) => prev.filter((p) => p.id !== id));
//       toast.success("Xóa sản phẩm thành công");
//     } catch {
//       toast.error("Xóa sản phẩm thất bại");
//     }
//   };

//   const handleToggleStatus = async (id: number) => {
//     const product = products.find((p) => p.id === id);
//     if (!product) {
//       toast.error(`Sản phẩm với id ${id} không tồn tại`);
//       return;
//     }
//     try {
//       const res = await toggleProductStatus(product.slug, product.status);
//       setProducts((prev) => prev.map((p) => (p.id === id ? res : p)));
//       toast.success("Chuyển trạng thái thành công");
//     } catch {
//       toast.error("Chuyển trạng thái thất bại");
//     }
//   };

//   const productsWithNames: UIProductWithNames[] = products.map((p) => {
//     const category = categories.find((c) => c.id === p.cat_id);
//     const brand = brands.find((b) => b.id === p.brand_id);
//     return {
//       ...p,
//       cat_name: category ? category.name : "N/A",
//       brand_name: brand ? brand.name : "N/A",
//       parent_cat_id: undefined,
//       child_cat_id: undefined,
//     };
//   });

//   return (
//     <>
//       <Toaster position="top-right" reverseOrder={false} />
//       <CrudGeneric<UIProductWithNames>
//         title="Sản phẩm"
//         initialData={productsWithNames}
//         columns={[
//           "id",
//           "name",
//           "slug",
//           "cat_name",
//           "brand_name",
//           "is_featured",
//           "status",
//         ]}
//         onCreate={handleCreate}
//         onUpdate={handleUpdate}
//         onDelete={handleDelete}
//         onToggleStatus={handleToggleStatus}
//         fields={[
//           "parent_cat_id",
//           "child_cat_id",
//           "name",
//           "description",
//           "brand_id",
//           "is_featured",
//           "status",
//         ]}
//         fieldsConfig={{
//           parent_cat_id: {
//             label: "Danh mục cha",
//             type: "select",
//             options: parentCategories.map((c) => ({ value: c.id, label: c.name })),
//             onChange: (val: number) => {
//               console.log("parent_cat_id onChange:", val);
//               handleParentChange(val);
//             },
//           },
//           child_cat_id: {
//             label: "Danh mục con",
//             type: "select",
//             options: childCategories.map((c) => ({ value: c.id, label: c.name })),
//             required: true,
//             onChange: (val: number) => console.log("child_cat_id onChange:", val),
//           },
//           name: { label: "Tên sản phẩm", required: true },
//           description: { label: "Mô tả" },
//           brand_id: {
//             label: "Thương hiệu",
//             type: "select",
//             required: true,
//             options: brands.map((b) => ({ value: b.id, label: b.name })),
//           },
//           is_featured: { label: "Nổi bật", type: "checkbox" },
//           status: {
//             label: "Trạng thái",
//             type: "select",
//             options: [
//               { label: "Active", value: true },
//               { label: "Inactive", value: false },
//             ],
//           },
//         }}

//         renderActions={(product) => (
//           <button
//             className="text-indigo-600 hover:underline"
//             onClick={() => router.push(`/admin/products/${product.id}/variants`)}
//           >
//             Xem variants
//           </button>
//         )}
//       />
//     </>
//   );
// }
