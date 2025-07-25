"use client"
import { useEffect, useState, use } from "react";
import { Product, fetchProductsByCatSlug } from "@/features/products/api/productApi";
import { Variant } from "@/features/variants/api/variantApi";
import { ProductCard } from "@/features/products/components/ProductCard";
import { Button } from "@/components/ui/Button";
import { fetchBrandsbyCatSlug, Brand } from "@/features/brands/api/brandApi";
import { useProductStore } from "@/store/productStore";

interface Props {
  params: Promise<{ categorySlug: string }>;
}

// <<<< ĐỊNH NGHĨA THỜI GIAN CACHE HẾT HẠN (TÍNH BẰNG MILLISECONDS)
// Ví dụ: 5 phút = 5 * 60 * 1000 = 300000ms
const CACHE_DURATION = 5 * 60 * 1000; // Cache dữ liệu trong 5 phút

export default function ProductListPage({ params }: Props) {
  const { categorySlug } = use(params);

  const {
    products,
    productVariants,
    lastFetchedCategorySlug,
    lastFetchedTimestamp, // <<<< LẤY lastFetchedTimestamp TỪ STORE
    setProducts,
    setProductVariants,
    setLastFetchedCategorySlug,
    setLastFetchedTimestamp, // <<<< LẤY SETTER MỚI
  } = useProductStore();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [sortType, setSortType] = useState<string>("featured");
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null);

  useEffect(() => {
    const loadProductsAndVariants = async () => {
      const now = Date.now(); // Lấy thời gian hiện tại
      const isCacheValid = 
        categorySlug === lastFetchedCategorySlug && // Cùng danh mục
        lastFetchedTimestamp !== null && // Đã có timestamp
        (now - lastFetchedTimestamp < CACHE_DURATION); // Cache chưa hết hạn

      if (isCacheValid) {
        console.log(`[ProductListPage] Using fresh cached product data for category: ${categorySlug}`);
        return; 
      }

      console.log(`[ProductListPage] Fetching new product data for category: ${categorySlug} (Cache expired or new category)`);
      try {
        const data = await fetchProductsByCatSlug(categorySlug);
        setProducts(data);

        const variantsMap: Record<number, Variant[]> = {};
        data.forEach((product) => {
          if (product.variants) {
            variantsMap[product.id] = product.variants;
          } else {
            variantsMap[product.id] = []; 
          }
        });
        setProductVariants(variantsMap);
        setLastFetchedCategorySlug(categorySlug);
        setLastFetchedTimestamp(now); // <<<< LƯU THỜI GIAN FETCH HIỆN TẠI VÀO STORE
      } catch (error) {
        console.error("Lỗi khi tải products hoặc variants:", error);
        setProducts([]);
        setProductVariants({});
        setLastFetchedCategorySlug(null); 
        setLastFetchedTimestamp(null); // <<<< RESET TIMESTAMP KHI CÓ LỖI
      }
    };

    const loadBrands = async () => {
      try {
        const brandList = await fetchBrandsbyCatSlug(categorySlug);
        setBrands(brandList);
      } catch (error) {
        console.error("Lỗi khi tải brand:", error);
        setBrands([]);
      }
    };

    loadBrands();
    loadProductsAndVariants(); 
  }, [
    categorySlug, 
    lastFetchedCategorySlug, 
    lastFetchedTimestamp, // <<<< THÊM VÀO DEPENDENCY ARRAY
    setProducts, 
    setProductVariants, 
    setLastFetchedCategorySlug,
    setLastFetchedTimestamp // <<<< THÊM VÀO DEPENDENCY ARRAY
  ]);

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
    
    return 0; 
  });

  return (
    <div className="p-6 space-y-6">
      {/* Brand selector */}
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

      {/* Product list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {sortedProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            categorySlug={categorySlug}
          />
        ))}
      </div>
    </div>
  );
}
// "use client"
// import { useEffect, useState, use } from "react";
// import { ProductCard } from "@/features/products/components/ProductCard";
// import { Product, fetchProductsbyCatSlug } from "@/features/products/api/productApi";
// import { variantApi, Variant } from "@/features/variants/api/variantApi";
// import { Button } from "@/components/ui/Button";
// import { fetchBrandsbyCatSlug, Brand } from "@/features/brands/api/brandApi";

// interface Props {
//   params: Promise<{ categorySlug: string }>;
// }

// export default function ProductListPage({ params }: Props) {
//   const [products, setProducts] = useState<Product[]>([]);
//   const [productVariants, setProductVariants] = useState<Record<number, Variant[]>>({});
//   const { categorySlug } = use(params);
//   const [brands, setBrands] = useState<Brand[]>([]);
//   const [sortType, setSortType] = useState<string>("featured");
//   const [selectedBrand, setSelectedBrand] = useState<number | null>(null);

//   useEffect(() => {
//     const loadProducts = async () => {
//       try {
//         const data = await fetchProductsbyCatSlug(categorySlug);
//         setProducts(data);

//         // Fetch variants for each product
//         const variantsMap: Record<number, Variant[]> = {};
//         await Promise.all(
//           data.map(async (product) => {
//             const variants = await variantApi.fetchByProduct(product.id);
//             variantsMap[product.id] = variants;
//           })
//         );
//         setProductVariants(variantsMap);
//       } catch (error) {
//         console.error("Lỗi khi tải products hoặc variants:", error);
//         setProducts([]);
//       }
//     };

//     const loadBrands = async () => {
//       try {
//         const brandList = await fetchBrandsbyCatSlug(categorySlug);
//         setBrands(brandList);
//       } catch (error) {
//         console.error("Lỗi khi tải brand:", error);
//         setBrands([]);
//       }
//     };

//     loadBrands();
//     loadProducts();
//   }, [categorySlug]);

//   const filteredProducts = selectedBrand
//     ? products.filter((p) => p.brand_id === selectedBrand)
//     : products;

//   const sortedProducts = [...filteredProducts].sort((a, b) => {
//     const aVariants = productVariants[a.id] || [];
//     const bVariants = productVariants[b.id] || [];
//     const aMinPrice = aVariants.length ? Math.min(...aVariants.map((v) => v.price)) : 0;
//     const bMinPrice = bVariants.length ? Math.min(...bVariants.map((v) => v.price)) : 0;

//     if (sortType === "price-low-high") return aMinPrice - bMinPrice;
//     if (sortType === "price-high-low") return bMinPrice - aMinPrice;
//     return 0;
//   });

//   return (
//     <div className="p-6 space-y-6">
//       {/* Brand selector */}
//       <div className="flex flex-wrap gap-4">
//         <Button
//           variant={selectedBrand === null ? "default" : "outline"}
//           onClick={() => setSelectedBrand(null)}
//         >
//           Tất cả
//         </Button>
//         {brands.map((brand) => (
//           <Button
//             key={brand.id}
//             variant={selectedBrand === brand.id ? "default" : "outline"}
//             onClick={() => setSelectedBrand(brand.id)}
//           >
//             {brand.name}
//           </Button>
//         ))}
//       </div>

//       {/* Sorting options */}
//       <div className="flex gap-4 border-b pb-2">
//         <button
//           onClick={() => setSortType("featured")}
//           className={sortType === "featured" ? "font-semibold" : ""}
//         >
//           Nổi bật
//         </button>
//         <button
//           onClick={() => setSortType("bestseller")}
//           className={sortType === "bestseller" ? "font-semibold" : ""}
//         >
//           Bán chạy
//         </button>
//         <button
//           onClick={() => setSortType("discount")}
//           className={sortType === "discount" ? "font-semibold" : ""}
//         >
//           Giảm giá
//         </button>
//         <button
//           onClick={() => setSortType("price-high-low")}
//           className={sortType === "price-high-low" ? "font-semibold" : ""}
//         >
//           Giá cao - thấp
//         </button>
//         <button
//           onClick={() => setSortType("price-low-high")}
//           className={sortType === "price-low-high" ? "font-semibold" : ""}
//         >
//           Giá thấp - cao
//         </button>
//       </div>

//       {/* Product grid */}
//       {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
//         {sortedProducts.map((product) => (
//           <ProductCard key={product.id} product={product} />
//         ))}
//       </div> */}
//       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
//   {sortedProducts.map((product) => (
//     <ProductCard key={product.id} product={product} categorySlug={categorySlug} />
//   ))}
// </div>
//     </div>
//   );
// }
