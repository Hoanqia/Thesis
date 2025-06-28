

'use client';
import { toast } from "react-hot-toast"; // ← import toast
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Heart, ShoppingCart } from "lucide-react"; // ← import 2 icon
import { cartApi } from "@/features/cart/api/cartApi";
import { wishlistApi } from "@/features/wishlists/api/wishlistApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import Image from "next/image";
import { Product } from "@/features/products/api/productApi";
import { Category, fetchCategoryBySlug } from "@/features/categories/api/categoryApi";
// Import đầy đủ các interface đã mở rộng trong variantApi.ts
import {
  Variant,
  SpecValue,
  Specification,
  SpecOption,
} from "@/features/variants/api/variantApi";

import { axiosRequest } from "@/lib/axiosRequest";

interface ProductCardProps {
  product: Product;
  categorySlug?: string,
}

export function ProductCard({ product ,categorySlug}: ProductCardProps) {
    const router = useRouter();
      // const { categorySlug } = useParams<{ categorySlug: string }>();
    const [category, setCategory] = useState<Category | null>(null);

  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  const MAX_VARIANTS_DISPLAY = 3;
  const variantsToDisplay = variants.slice(0, MAX_VARIANTS_DISPLAY);
  const hasMoreVariants = variants.length > MAX_VARIANTS_DISPLAY;
  const handleAddToCart = async () => {
  if (!selectedVariant) {
    console.error("Chưa chọn biến thể để thêm vào giỏ hàng.");
    return;
  }

  try {
    const res = await cartApi.addToCart(selectedVariant.id, 1); // quantity = 1
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
};

  const handleWishlist = async () => {
  if (!selectedVariant) {
    console.error("Chưa chọn biến thể để thêm vào wishlist.");
          toast.error("Vui lòng chọn biến thể trước khi thêm vào wishlist.");

    return;
  }

  try {
    const res = await wishlistApi.createWishlist(selectedVariant.id);
    console.log("Đã thêm vào wishlist:", res);
          toast.success("Đã thêm vào wishlist!");

    // Optional: Thông báo UI
  } catch (error) {
    console.error("Lỗi khi thêm vào wishlist:", error);
          toast.error("Có lỗi xảy ra khi thêm vào wishlist.");

  }
};


  
  // Hàm lấy URL ảnh đầy đủ (nếu path bắt đầu bằng "http" thì giữ nguyên, ngược lại thêm base URL)
  function getFullImageUrl(path?: string) {
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}/storage/${path}`;
  }

  // Log thử URL ảnh của biến thể đang chọn (tuỳ bạn có cần hay không)
  console.log("Image URL:", getFullImageUrl(selectedVariant?.image));


  // Khi component mount hoặc product.id thay đổi → fetch variants của product
  useEffect(() => {
     if (categorySlug) {
      fetchCategoryBySlug(categorySlug)
        .then(setCategory)
        .catch(console.error);
    }

    const fetchVariants = async () => {
      try {
        console.log("Fetching variants from URL:", `${product.id}/variants`);
        // Giả sử API trả về { data: Variant[] }
        const res = await axiosRequest<{ data: Variant[] }>(
          `${product.id}/variants`,
          "GET"
        );
        setVariants(res.data);

        // Nếu có ít nhất 1 variant, đặt nó làm selected mặc định
        if (res.data.length > 0) {
          setSelectedVariant(res.data[0]);
        }
      } catch (error) {
        console.error("Failed to fetch variants", error);
      }
    };

    fetchVariants();
  }, [product.id,categorySlug]);


  /**
   * Hàm getSpecValue:
   *  - Nhận vào 1 Variant và 1 specName (ví dụ "RAM", "Màu sắc", "Dung lượng bộ nhớ")
   *  - Tìm trong mảng variant.variant_spec_values cái object có specification.name = specName
   *  - Tùy data_type mà trả về:
   *      + Nếu "option": lấy specObj.spec_options.value
   *      + Nếu value_int !== null: trả về "<value_int> <unit>" (ví dụ "8 GB")
   *      + Nếu value_decimal !== null: trả về "<value_decimal> <unit>"
   *      + Nếu value_text: trả về value_text
   *      + Nếu không tìm thấy: trả về null
   */
  function getSpecValue(
    variant: Variant,
    specName: string
  ): string | null {
    // Vì Variant đã có field variant_spec_values: SpecValue[]
    const specObj: SpecValue | undefined = variant.variant_spec_values?.find(
      (sv: SpecValue) =>
        sv.specification.name.toLowerCase() === specName.toLowerCase()
    );

    if (!specObj) return null;

    // Nếu data_type = "option", và spec_options không null, trả về giá trị option
    if (
      specObj.specification.data_type === "option" &&
      specObj.spec_options
    ) {
      return specObj.spec_options.value;
    }

    // Nếu có value_int → trả về "<value_int> <unit>"
    if (specObj.value_int !== null) {
      return `${specObj.value_int} ${specObj.specification.unit || ""}`.trim();
    }

    // Nếu có value_decimal → trả về "<value_decimal> <unit>"
    if (specObj.value_decimal !== null) {
      return `${specObj.value_decimal} ${
        specObj.specification.unit || ""
      }`.trim();
    }

    // Nếu value_text (text) → trả về value_text
    if (specObj.value_text) {
      return specObj.value_text;
    }

    return null;
  }


  /**
   * Hàm buildVariantLabel:
   *  - Gọi getSpecValue() cho ba trường "Màu sắc", "RAM", "Dung lượng bộ nhớ"
   *  - Nếu không tìm thấy, fallback "N/A"
   *  - Kết quả: "<color> – <ram> – <storage>"
   *  Ví dụ: "Xám – 8 GB – 512 GB"
   */
  function buildVariantLabel(variant: Variant, category: Category | null): string {
    // const colorValue = getSpecValue(variant, "Màu sắc") ;
      const colorValue = getSpecValue(variant, "Màu sắc");

    if (category?.id_parent) {
      // Nếu là category con, chỉ trả về màu
      return colorValue ?? "N/A";
    }
    const ramValue = getSpecValue(variant, "RAM") ;
    const storageValue = getSpecValue(variant, "Dung lượng bộ nhớ") ;

    const color = colorValue ?? "N/A";
    const ram = ramValue ? `RAM ${ramValue}` : "";
    const storage = storageValue ?? "";

    return `${color} – ${ram} – ${storage}`;
  }

  const onImageClick = () => {
    if (categorySlug && product.slug) {
      router.push(`/products/${categorySlug}/${product.slug}`);
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-lg rounded-2xl p-4">
      <CardContent className="relative flex flex-col items-center">
        {/* Ảnh của biến thể đang chọn */}
        {/* <div onClick={onImageClick} className="cursor-pointer">
          <Image
            src={getFullImageUrl(selectedVariant?.image) || "/placeholder.jpg"}
            alt={product.name}
            width={400}
            height={400}
            className="rounded-xl object-contain"
            priority
          />
        </div> */}
          <div
          onClick={onImageClick}
          className="cursor-pointer w-[200px] h-[200px] relative"
        >
          <Image
            src={getFullImageUrl(selectedVariant?.image) || "/placeholder.jpg"}
            alt={product.name}
            fill                   // cho image bám đầy container
            className="rounded-xl object-contain"
            priority
          />
        </div>
        {/* Tên sản phẩm */}
        <h2 className="text-lg font-semibold mt-2">{product.name}</h2>

        {/* Giá (price − discount) */}
        <p className="text-primary font-bold mt-1">
          {selectedVariant
            ? (selectedVariant.price - selectedVariant.discount).toLocaleString(
                "vi-VN",
                { style: "currency", currency: "VND" }
              )
            : "Đang tải giá..."}
        </p>

        {/* Dãy nút chọn variant, hiển thị “Màu – RAM – Dung lượng bộ nhớ”
        <div className="flex flex-wrap gap-2 mt-3">
          {variants.map((variant) => (
            <Button
              key={variant.id}
              size="sm"
              variant={
                selectedVariant?.id === variant.id ? "default" : "outline"
              }
              onClick={() => setSelectedVariant(variant)}
            >
              {buildVariantLabel(variant, category)}
            </Button>
          ))}
        </div> */}

        {/* Dãy nút chọn variant, hiển thị “Màu – RAM – Dung lượng bộ nhớ” */}
        {/* Sử dụng height cố định và overflow-hidden */}
        <div className="flex flex-wrap gap-2 mt-3 justify-center h-[120px] overflow-hidden items-start">
          {variantsToDisplay.map((variant) => (
            <Button
              key={variant.id}
              size="sm"
              variant={
                selectedVariant?.id === variant.id ? "default" : "outline"
              }
              onClick={() => setSelectedVariant(variant)}
            >
              {buildVariantLabel(variant, category)}
            </Button>
          ))}
          {/* Nút "..." nếu có nhiều variant hơn số hiển thị tối đa */}
          {hasMoreVariants && (
            <Button
              size="sm"
              variant="outline"
              onClick={onImageClick} // Có thể dẫn đến trang chi tiết sản phẩm để người dùng xem tất cả variant
            >
              ...
            </Button>
          )}
        </div>
         {/* —— Phần icon chồng lên góc dưới bên phải —— */}
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
}
