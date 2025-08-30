
// 'use client';
// import { toast } from "react-hot-toast";
// import { useEffect, useState, useMemo } from "react";
// import { useRouter, useParams } from "next/navigation";
// import { Heart, ShoppingCart } from "lucide-react";
// import { cartApi } from "@/features/cart/api/cartApi";
// import { wishlistApi } from "@/features/wishlists/api/wishlistApi";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/Button";
// import Image from "next/image";

// // IMPORT CÁC INTERFACE TỪ CÁC FILE API CỦA CHÚNG
// import { Product } from "@/features/products/api/productApi";
// import { Category, fetchCategoryBySlug } from "@/features/categories/api/categoryApi";
// // ĐẢM BẢO IMPORT Variant, SpecValue, và Specification từ variantApi.ts
// // Bỏ ProductSpec nếu nó không được sử dụng ở nơi nào khác với cấu trúc này
// import { Variant, SpecValue, Specification } from "@/features/variants/api/variantApi";


// interface ProductCardProps {
//   product: Product;
//   categorySlug?: string;
//   variants?: Variant[]; // Prop này sẽ nhận mảng Variant từ Product
// }

// export const ProductCard =  React.memo(function ProductCard({ product, categorySlug, variants: initialVariants = [] }: ProductCardProps)   {
//   const router = useRouter();
//   const [category, setCategory] = useState<Category | null>(null);
//   const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

//   const MAX_VARIANTS_DISPLAY = 3;
//   // SỬ DỤNG `initialVariants` để tránh lỗi "undefined"
//   const variantsToDisplay = initialVariants.slice(0, MAX_VARIANTS_DISPLAY);
//   const hasMoreVariants = initialVariants.length > MAX_VARIANTS_DISPLAY;

//   const handleAddToCart = async () => {
//     if (!selectedVariant) {
//       console.error("Chưa chọn biến thể để thêm vào giỏ hàng.");
//       toast.error("Vui lòng chọn biến thể trước khi thêm vào giỏ hàng.");
//       return;
//     }

//     try {
//       const res = await cartApi.addToCart(selectedVariant.id, 1);
//       if (res.status === 'success') {
//         console.log("Đã thêm vào giỏ hàng:", res.message);
//         toast.success(res.message || "Đã thêm vào giỏ hàng!");
//       } else {
//         console.error("Thêm vào giỏ hàng thất bại:", res.message);
//         toast.error(res.message || "Thêm vào giỏ hàng thất bại.");
//       }
//     } catch (error) {
//       console.error("Lỗi khi gọi API addToCart:", error);
//       toast.error("Có lỗi xảy ra khi thêm vào giỏ hàng.");
//     }
//   };

//   const handleWishlist = async () => {
//     if (!selectedVariant) {
//       console.error("Chưa chọn biến thể để thêm vào wishlist.");
//       toast.error("Vui lòng chọn biến thể trước khi thêm vào wishlist.");
//       return;
//     }

//     try {
//       const res = await wishlistApi.createWishlist(selectedVariant.id);
//       console.log("Đã thêm vào wishlist:", res);
//       toast.success("Đã thêm vào wishlist!");
//     } catch (error) {
//       console.error("Lỗi khi thêm vào wishlist:", error);
//       toast.error("Có lỗi xảy ra khi thêm vào wishlist.");
//     }
//   };

//   function getFullImageUrl(path?: string) {
//     if (!path) return "/placeholder.jpg";
//     if (path.startsWith("http")) return path;
//     const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
//     const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
//     return `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}/storage/${normalizedPath}`;
//   }

//   useEffect(() => {
//     if (initialVariants.length > 0) {
//       setSelectedVariant(initialVariants[0]);
//     } else {
//       setSelectedVariant(null);
//     }
//   }, [initialVariants]);

//   useEffect(() => {
//     if (categorySlug) {
//       fetchCategoryBySlug(categorySlug)
//         .then(setCategory)
//         .catch(console.error);
//     }
//   }, [categorySlug]);

//   /**
//    * Lấy giá trị của một spec cụ thể từ variant_spec_values.
//    *
//    * @param variant Biến thể sản phẩm.
//    * @param specName Tên của spec (ví dụ: "Màu sắc", "RAM").
//    * @returns Giá trị của spec (string, number) hoặc null nếu không tìm thấy.
//    */
//   function getSpecValue(
//     variant: Variant,
//     specName: string
//   ): string | number | null {
//     // Tìm kiếm trong mảng `variant_spec_values` của variant
//     const specValueObj = variant.variant_spec_values?.find(
//       (sv: SpecValue) => sv.specification.name.toLowerCase() === specName.toLowerCase()
//     );

//     if (specValueObj) {
//       // Dựa vào data_type để lấy giá trị đúng
//       const dataType = specValueObj.specification.data_type;
//       switch (dataType) {
//         case "int":
//           return specValueObj.value_int;
//         case "decimal":
//           return specValueObj.value_decimal;
//         case "text":
//           return specValueObj.value_text;
//         case "option":
//           // Đối với kiểu 'option', giá trị nằm trong spec_options.value
//           return specValueObj.spec_options?.value || null;
//         default:
//           return null;
//       }
//     }
//     return null;
//   }


//   function buildVariantLabel(variant: Variant, category: Category | null): string {
//     // Sử dụng hàm getSpecValue đã được sửa đổi
//     const colorValue = getSpecValue(variant, "Màu sắc");
//     const ramValue = getSpecValue(variant, "RAM");
//     const storageValue = getSpecValue(variant, "Dung lượng bộ nhớ");

//     const parts: string[] = [];
//     // Chuyển các giá trị sang string khi thêm vào mảng parts
//     if (colorValue !== null) parts.push(String(colorValue));
//     if (ramValue !== null) parts.push(`${ramValue} GB`);
//     if (storageValue !== null) parts.push(`${storageValue} GB`);
//     if (category?.id_parent) {
//       return (colorValue !== null ? String(colorValue) : "N/A");
//     }

//     return parts.length > 0 ? parts.filter(Boolean).join(" – ") : "N/A";
//   }

//   const onImageClick = () => {
//     if (categorySlug && product.slug) {
//       router.push(`/products/${categorySlug}/${product.slug}`);
//     }
//   };

//   return (
//     <Card className="w-full max-w-sm shadow-lg rounded-2xl p-4">
//       <CardContent className="relative flex flex-col items-center">
//         <div
//           onClick={onImageClick}
//           className="cursor-pointer w-[200px] h-[200px] relative"
//         >
//           <Image
//             src={getFullImageUrl(selectedVariant?.image_url) || "/placeholder.jpg"}
//             alt={product.name}
//             fill
//             className="rounded-xl object-contain"
//             priority
//             unoptimized
//           />
//         </div>
//         <h2 className="text-lg font-semibold mt-2">{product.name}</h2>
//         <p className="text-primary font-bold mt-1">
//           {selectedVariant
//             ? (parseFloat(String(selectedVariant.price)) - parseFloat(String(selectedVariant.discount))).toLocaleString(
//                 "vi-VN",
//                 { style: "currency", currency: "VND" }
//               )
//             : "Đang tải giá..."}
//         </p>

//         <div className="flex flex-wrap gap-2 mt-3 justify-center h-[120px] overflow-hidden items-start">
//           {variantsToDisplay.map((variant) => {
//             // const variantLabel = useMemo(
//             //   () => buildVariantLabel(variant, category),
//             //   [variant, category]
//             // );
//                                     const variantLabel = buildVariantLabel(variant, category);

//             return (
//               <Button
//                 key={variant.id}
//                 size="sm"
//                 variant={
//                   selectedVariant?.id === variant.id ? "default" : "outline"
//                 }
//                 onClick={() => setSelectedVariant(variant)}
//               >
//                 {variantLabel}
//               </Button>
//             );
//           })}
//           {hasMoreVariants && (
//             <Button
//               size="sm"
//               variant="outline"
//               onClick={onImageClick}
//             >
//               ...
//             </Button>
//           )}
//         </div>
//         <div className="absolute top-2 right-2 flex flex-col items-center gap-1">
//           <button
//             onClick={handleWishlist}
//             className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
//           >
//             <Heart className="w-5 h-5 text-gray-600" />
//           </button>
//           <button
//             onClick={handleAddToCart}
//             className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
//           >
//             <ShoppingCart className="w-5 h-5 text-gray-600" />
//           </button>
//         </div>
//       </CardContent>
//     </Card>
//   );
// });

'use client';
import { toast } from "react-hot-toast";
import React, { useEffect, useState, useMemo, useCallback } from "react"; // Thêm React và useCallback
import { useRouter, useParams } from "next/navigation";
import { Heart, ShoppingCart } from "lucide-react";
import { cartApi } from "@/features/cart/api/cartApi";
import { wishlistApi } from "@/features/wishlists/api/wishlistApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import Image from "next/image";

// IMPORT CÁC INTERFACE TỪ CÁC FILE API CỦA CHÚNG
import { Product } from "@/features/products/api/productApi";
import { Category, fetchCategoryBySlug } from "@/features/categories/api/categoryApi";
// ĐẢM BẢO IMPORT Variant, SpecValue, và Specification từ variantApi.ts
import { Variant, SpecValue, Specification } from "@/features/variants/api/variantApi";


interface ProductCardProps {
  product: Product;
  categorySlug?: string;
  variants?: Variant[]; // Prop này sẽ nhận mảng Variant từ Product
}

export const ProductCard = React.memo(function ProductCard({ product, categorySlug, variants: initialVariants = [] }: ProductCardProps) {
  const router = useRouter();
  const [category, setCategory] = useState<Category | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  const MAX_VARIANTS_DISPLAY = 3;
  // SỬ DỤNG `initialVariants` để tránh lỗi "undefined"
  const variantsToDisplay = initialVariants.slice(0, MAX_VARIANTS_DISPLAY);
  const hasMoreVariants = initialVariants.length > MAX_VARIANTS_DISPLAY;

  const handleAddToCart = useCallback(async () => { // Bọc với useCallback
    if (!selectedVariant) {
      console.error("Chưa chọn biến thể để thêm vào giỏ hàng.");
      toast.error("Vui lòng chọn biến thể trước khi thêm vào giỏ hàng.");
      return;
    }

    try {
      const res = await cartApi.addToCart(selectedVariant.id, 1);
      if (res.status === 'success') {
        console.log("Đã thêm vào giỏ hàng:", res.message);
        toast.success(res.message || "Đã thêm vào giỏ hàng!");
      } else {
        console.error("Thêm vào giỏ hàng thất bại:", res.message);
        toast.error(res.message || "Thêm vào giỏ hàng thất bại.");
      }
    } catch (error) {
      console.error("Lỗi khi gọi API addToCart:", error);
      toast.error("Có lỗi xảy ra khi thêm vào giỏ hàng.");
    }
  }, [selectedVariant]); // selectedVariant là dependency

  const handleWishlist = useCallback(async () => { // Bọc với useCallback
    if (!selectedVariant) {
      console.error("Chưa chọn biến thể để thêm vào wishlist.");
      toast.error("Vui lòng chọn biến thể trước khi thêm vào wishlist.");
      return;
    }

    try {
      const res = await wishlistApi.createWishlist(selectedVariant.id);
      console.log("Đã thêm vào wishlist:", res);
      toast.success("Đã thêm vào wishlist!");
    } catch (error) {
      console.error("Lỗi khi thêm vào wishlist:", error);
      toast.error("Có lỗi xảy ra khi thêm vào wishlist.");
    }
  }, [selectedVariant]); // selectedVariant là dependency

  // Hàm này không cần useCallback vì nó không được truyền xuống component con
  function getFullImageUrl(path?: string) {
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    return `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}/storage/${normalizedPath}`;
  }

  useEffect(() => {
    if (initialVariants.length > 0) {
      setSelectedVariant(initialVariants[0]);
    } else {
      setSelectedVariant(null);
    }
  }, [initialVariants]);

  useEffect(() => {
    if (categorySlug) {
      fetchCategoryBySlug(categorySlug)
        .then(setCategory)
        .catch(console.error);
    }
  }, [categorySlug]);

  // Bọc getSpecValue bằng useCallback để nó ổn định
  const getSpecValue = useCallback(
    (variant: Variant, specName: string): string | number | null => {
      const specValueObj = variant.variant_spec_values?.find(
        (sv: SpecValue) => sv.specification.name.toLowerCase() === specName.toLowerCase()
      );

      if (specValueObj) {
        const dataType = specValueObj.specification.data_type;
        switch (dataType) {
          case "int":
            return specValueObj.value_int;
          case "decimal":
            return specValueObj.value_decimal;
          case "text":
            return specValueObj.value_text;
          case "option":
            return specValueObj.spec_options?.value || null;
          default:
            return null;
        }
      }
      return null;
    }, [] // Không có dependencies vì nó chỉ đọc dữ liệu từ `variant` và `specName`
  );


  // Bọc buildVariantLabel bằng useCallback để nó ổn định
  const buildVariantLabel = useCallback(
    (variant: Variant, category: Category | null): string => {
      const colorValue = getSpecValue(variant, "Màu sắc");
      const ramValue = getSpecValue(variant, "RAM");
      const storageValue = getSpecValue(variant, "Dung lượng bộ nhớ");

      const parts: string[] = [];
      if (colorValue !== null) parts.push(String(colorValue));
      if (ramValue !== null) parts.push(`${ramValue} GB`);
      if (storageValue !== null) parts.push(`${storageValue} GB`);

      if (category?.id_parent) {
        return (colorValue !== null ? String(colorValue) : "N/A");
      }

      return parts.length > 0 ? parts.filter(Boolean).join(" – ") : "N/A";
    }, [getSpecValue] // getSpecValue là dependency
  );

  const onImageClick = useCallback(() => { // Bọc với useCallback
    if (categorySlug && product.slug) {
      router.push(`/products/${categorySlug}/${product.slug}`);
    }
  }, [categorySlug, product.slug, router]);


  return (
    <Card className="w-full max-w-sm shadow-lg rounded-2xl p-4">
      <CardContent className="relative flex flex-col items-center">
        <div
          onClick={onImageClick}
          className="cursor-pointer w-[200px] h-[200px] relative"
        >
          <Image
            src={getFullImageUrl(selectedVariant?.image_url) || "/placeholder.jpg"}
            alt={product.name}
            fill
            className="rounded-xl object-contain"
            priority
            unoptimized
          />
        </div>
        <h2 className="text-lg font-semibold mt-2">{product.name}</h2>
        <p className="text-primary font-bold mt-1">
          {selectedVariant
            ? (parseFloat(String(selectedVariant.price)) - parseFloat(String(selectedVariant.discount))).toLocaleString(
                "vi-VN",
                { style: "currency", currency: "VND" }
              )
            : "Đang tải giá..."}
        </p>

        <div className="flex flex-wrap gap-2 mt-3 justify-center h-[120px] overflow-hidden items-start">
          {variantsToDisplay.map((variant) => {
            // SỬ DỤNG useMemo Ở ĐÂY để tính toán label chỉ khi variant hoặc category thay đổi
            const variantLabel = useMemo(
              () => buildVariantLabel(variant, category),
              [variant, category, buildVariantLabel] // Thêm buildVariantLabel vào dependencies
            );

            return (
              <Button
                key={variant.id}
                size="sm"
                variant={
                  selectedVariant?.id === variant.id ? "default" : "outline"
                }
                onClick={() => setSelectedVariant(variant)}
              >
                {variantLabel}
              </Button>
            );
          })}
          {hasMoreVariants && (
            <Button
              size="sm"
              variant="outline"
              onClick={onImageClick}
            >
              ...
            </Button>
          )}
        </div>
        <div className="absolute top-2 right-2 flex flex-col items-center gap-1">
          <button
            onClick={handleWishlist}
            className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
          >
            <Heart className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={handleAddToCart}
            className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
          >
            <ShoppingCart className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
});