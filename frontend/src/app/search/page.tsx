"use client";
import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation"; // Import useSearchParams
import { ProductCard } from "@/features/products/components/ProductCard";
import { Product, searchProduct } from "@/features/products/api/productApi"; // Import searchProduct API
import { variantApi, Variant } from "@/features/variants/api/variantApi";
import { Button } from "@/components/ui/Button";
// Import brandApi nếu bạn có API để lấy tất cả brands hoặc brands liên quan đến kết quả tìm kiếm
// Hiện tại, ProductListPage dùng fetchBrandsbyCatSlug, bạn cần cân nhắc cách fetch brands cho trang search
import { Brand } from "@/features/brands/api/brandApi"; // Chỉ import Brand type nếu không dùng API fetchBrandsbyCatSlug

interface Props {
  // Trang tìm kiếm sẽ lấy query từ URL, không cần params
  // params: Promise<{ categorySlug: string }>; // Không dùng cho trang search
}

export default function SearchProductPage() {
  const searchParams = useSearchParams(); // Lấy query từ URL
  const query = searchParams.get('q') || ''; // Lấy giá trị của tham số 'q'

  const [products, setProducts] = useState<Product[]>([]);
  const [productVariants, setProductVariants] = useState<Record<number, Variant[]>>({});
  // const { categorySlug } = use(params); // Không dùng
  const [brands, setBrands] = useState<Brand[]>([]); // Sẽ cần cập nhật cách load brands
  const [sortType, setSortType] = useState<string>("featured");
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null);

  useEffect(() => {
    const loadSearchResults = async () => {
      if (!query) {
        setProducts([]);
        setProductVariants({});
        setBrands([]);
        return;
      }

      try {
        // Gọi API searchProduct thay vì fetchProductsbyCatSlug
        const data = await searchProduct(query);
        setProducts(data);

        // Fetch variants for each product
        const variantsMap: Record<number, Variant[]> = {};
        await Promise.all(
          data.map(async (product) => {
            const variants = await variantApi.fetchByProduct(product.id);
            variantsMap[product.id] = variants;
          })
        );
        setProductVariants(variantsMap);

        // --- Cân nhắc cách load brands cho trang tìm kiếm ---
        // Trên ProductListPage, bạn dùng fetchBrandsbyCatSlug.
        // Trên trang search, bạn có thể:
        // 1. Fetch tất cả các brands (nếu số lượng không quá lớn)
        // 2. Fetch brands chỉ của các sản phẩm có trong kết quả tìm kiếm
        // 3. Bỏ qua brand filter nếu không cần thiết cho trang search
        // Ví dụ đơn giản: bạn có thể tạm thời để trống hoặc fetch một list brands chung
        // Hoặc bạn cần một API mới như `fetchBrandsByProductIds(productIds)`
        // Tạm thời, tôi sẽ để trống brands hoặc bạn có thể fetch tất cả brands nếu phù hợp
        // Ví dụ: const allBrands = await brandApi.fetchAllBrands();
        // setBrands(allBrands.filter(b => data.some(p => p.brand_id === b.id)));
        setBrands([]); // Đặt tạm thời là rỗng hoặc implement logic fetch brand phù hợp
      } catch (error) {
        console.error("Lỗi khi tải search results hoặc variants:", error);
        setProducts([]);
        setProductVariants({});
        setBrands([]);
      }
    };

    loadSearchResults();
  }, [query]); // Re-run effect when the search query changes

  const filteredProducts = selectedBrand
    ? products.filter((p) => p.brand_id === selectedBrand)
    : products;

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aVariants = productVariants[a.id] || [];
    const bVariants = productVariants[b.id] || [];
    const aMinPrice = aVariants.length ? Math.min(...aVariants.map((v) => v.price)) : 0;
    const bMinPrice = bVariants.length ? Math.min(...bVariants.map((v) => v.price)) : 0;

    if (sortType === "price-low-high") return aMinPrice - bMinPrice;
    if (sortType === "price-high-low") return bMinPrice - aMinPrice;
    
    // Giữ lại logic nổi bật, bán chạy, giảm giá nếu bạn có dữ liệu để sắp xếp
    // Hiện tại, không có trường nào để sắp xếp "featured", "bestseller", "discount"
    // nếu không có dữ liệu cụ thể trong Product hoặc Variant
    if (sortType === "featured") return 0; // Cần logic thực tế
    if (sortType === "bestseller") return 0; // Cần logic thực tế
    if (sortType === "discount") return 0; // Cần logic thực tế

    return 0;
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Kết quả tìm kiếm cho "{query}"</h1>

      {/* Brand selector */}
      {/* Sẽ hiển thị nếu bạn có brands để lọc */}
      {brands.length > 0 && (
        <div className="flex flex-wrap gap-4">
          <Button
            variant={selectedBrand === null ? "default" : "outline"}
            onClick={() => setSelectedBrand(null)}
          >
            Tất cả
          </Button>
          {brands.map((brand) => (
            <Button
              key={brand.id}
              variant={selectedBrand === brand.id ? "default" : "outline"}
              onClick={() => setSelectedBrand(brand.id)}
            >
              {brand.name}
            </Button>
          ))}
        </div>
      )}

      {/* Sorting options */}
      <div className="flex gap-4 border-b pb-2">
        <button
          onClick={() => setSortType("featured")}
          className={sortType === "featured" ? "font-semibold" : ""}
        >
          Nổi bật
        </button>
        <button
          onClick={() => setSortType("bestseller")}
          className={sortType === "bestseller" ? "font-semibold" : ""}
        >
          Bán chạy
        </button>
        <button
          onClick={() => setSortType("discount")}
          className={sortType === "discount" ? "font-semibold" : ""}
        >
          Giảm giá
        </button>
        <button
          onClick={() => setSortType("price-high-low")}
          className={sortType === "price-high-low" ? "font-semibold" : ""}
        >
          Giá cao - thấp
        </button>
        <button
          onClick={() => setSortType("price-low-high")}
          className={sortType === "price-low-high" ? "font-semibold" : ""}
        >
          Giá thấp - cao
        </button>
      </div>

      {/* Product grid */}
      {sortedProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {sortedProducts.map((product) => (
            <ProductCard key={product.id} product={product}  categorySlug={product.categorySlug}/>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-600 text-lg">Không tìm thấy sản phẩm nào phù hợp với từ khóa "{query}".</p>
      )}
    </div>
  );
}