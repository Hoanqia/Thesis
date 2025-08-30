
// "use client"
// import { useEffect, useState, useMemo, use } from "react";
// import { Product, fetchProductsByCatSlug } from "@/features/products/api/productApi";
// import { Variant } from "@/features/variants/api/variantApi";
// import { ProductCard } from "@/features/products/components/ProductCard";
// import { Button } from "@/components/ui/Button";
// import { fetchBrandsbyCatSlug, Brand } from "@/features/brands/api/brandApi";
// import { useProductStore } from "@/store/productStore";
// import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton nếu bạn muốn hiển thị loading state

// interface Props {
//   params: Promise<{ categorySlug: string }>;
// }

// const CACHE_DURATION = 5 * 60 * 1000;
// const ITEMS_PER_PAGE = 20; // Hằng số cho số sản phẩm mỗi trang

// export default function ProductListPage({ params }: Props) {
//   const { categorySlug } = use(params);

//   const {
//     products,
//     productVariants,
//     lastFetchedCategorySlug,
//     lastFetchedTimestamp,
//     setProducts,
//     setProductVariants,
//     setLastFetchedCategorySlug,
//     setLastFetchedTimestamp,
//   } = useProductStore();

//   const [brands, setBrands] = useState<Brand[]>([]);
//   const [sortType, setSortType] = useState<string>("featured");
//   const [selectedBrand, setSelectedBrand] = useState<number | null>(null);
//   const [loadingInitialData, setLoadingInitialData] = useState(true); // Thêm state để quản lý loading ban đầu


//     // === THÊM CÁC STATE PHÂN TRANG MỚI ===
//   const [currentPage, setCurrentPage] = useState<number>(1);
//   const [totalPages, setTotalPages] = useState<number>(1);
//   const [totalProductsCount, setTotalProductsCount] = useState<number>(0);

//   useEffect(() => {
//     const loadProductsAndVariants = async () => {
//       setLoadingInitialData(true); // Bắt đầu tải dữ liệu
//       const now = Date.now();
//       const isCacheValid =
//         categorySlug === lastFetchedCategorySlug &&
//         lastFetchedTimestamp !== null &&
//         now - lastFetchedTimestamp < CACHE_DURATION;

//       if (isCacheValid) {
//         setLoadingInitialData(false); // Kết thúc tải nếu dùng cache
//         return;
//       }

//       try {
//         const data = await fetchProductsByCatSlug(categorySlug);
//         console.log("API response (raw products data):", data);

//         setProducts(data);

//         // build variants map once
//         const variantsMap: Record<number, Variant[]> = {};
//         data.forEach((p) => {
//           variantsMap[p.id] = p.variants || [];
//         });
//         setProductVariants(variantsMap);
//         setLastFetchedCategorySlug(categorySlug);
//         setLastFetchedTimestamp(now);
//       } catch (error) { // Bắt lỗi để xử lý
//         console.error("Error fetching products:", error);
//         setProducts([]);
//         setProductVariants({});
//         setLastFetchedCategorySlug(null);
//         setLastFetchedTimestamp(null);
//       } finally {
//         setLoadingInitialData(false); // Kết thúc tải dữ liệu dù thành công hay thất bại
//       }
//     };

//    const loadBrands = async () => {
//       try {
//         const brandList = await fetchBrandsbyCatSlug(categorySlug);
//         // Đảm bảo brandList là một mảng trước khi setBrands
//         setBrands(Array.isArray(brandList) ? brandList : []);
//       } catch (error) {
//         console.error("Error fetching brands:", error);
//         setBrands([]); // Đảm bảo brands là mảng rỗng khi có lỗi
//       }
//     };
//     loadBrands();
//     loadProductsAndVariants();
//   }, [categorySlug, setProducts, setProductVariants, setLastFetchedCategorySlug, setLastFetchedTimestamp]);

//   // ==== DÙNG useMemo() để tránh filter/sort mỗi render ====
//    const filteredProducts = useMemo(() => { return selectedBrand
//     ? products.filter((p) => p.brand && p.brand.id === selectedBrand) // <- Đã sửa ở đây
//       : products;
//       }, [products, selectedBrand]);

//   const sortedProducts = useMemo(() => {
//     // Nếu không có sản phẩm nào sau khi lọc, không cần sắp xếp
//     if (filteredProducts.length === 0) {
//       return [];
//     }
    
//     return [...filteredProducts].sort((a, b) => {
//       const aVariants = productVariants[a.id] || [];
//       const bVariants = productVariants[b.id] || [];
      
//       // Đảm bảo xử lý trường hợp không có biến thể
//       const aMin = aVariants.length ? Math.min(...aVariants.map((v) => v.price)) : Infinity;
//       const bMin = bVariants.length ? Math.min(...bVariants.map((v) => v.price)) : Infinity;

//       if (sortType === "price-low-high") return aMin - bMin;
//       if (sortType === "price-high-low") return bMin - aMin;
      
//       // Thêm logic sắp xếp cho "featured", "bestseller", "discount"
//       if (sortType === "featured") {
//         // Sắp xếp sản phẩm nổi bật lên đầu
//         return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
//       }
//       if (sortType === "discount") {
//         // Sắp xếp theo giảm giá (từ cao nhất đến thấp nhất)
//         const aDiscount = aVariants.length ? Math.max(...aVariants.map(v => v.discount || 0)) : 0;
//         const bDiscount = bVariants.length ? Math.max(...bVariants.map(v => v.discount || 0)) : 0;
//         return bDiscount - aDiscount;
//       }
//       // "bestseller" cần dữ liệu về số lượng bán hoặc lượt xem, giả định bạn có thể thêm vào Product interface
//       // Nếu không có dữ liệu cụ thể, có thể giữ nguyên thứ tự ban đầu hoặc sắp xếp theo tên
//       return 0; // Giữ nguyên thứ tự nếu không có tiêu chí sắp xếp cụ thể
//     });
//   }, [filteredProducts, productVariants, sortType]);

//   // Hiển thị Skeleton khi đang tải dữ liệu ban đầu
//   if (loadingInitialData) {
//     return (
//       <div className="p-6 space-y-6">
//         <div className="flex flex-wrap gap-4">
//           {Array.from({ length: 5 }).map((_, i) => (
//             <Skeleton key={i} className="w-24 h-10 rounded-md" />
//           ))}
//         </div>
//         <div className="flex gap-4 border-b pb-2">
//           {Array.from({ length: 5 }).map((_, i) => (
//             <Skeleton key={i} className="w-24 h-6 rounded-md" />
//           ))}
//         </div>
//         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
//           {Array.from({ length: 10 }).map((_, i) => (
//             <Skeleton key={i} className="w-full h-[360px] rounded-lg" />
//           ))}
//         </div>
//       </div>
//     );
//   }

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
//         {["featured","bestseller","discount","price-high-low","price-low-high"].map((type) => (
//           <button
//             key={type}
//             onClick={() => setSortType(type)}
//             className={sortType === type ? "font-semibold" : ""}
//           >
//             {type === "featured" ? "Nổi bật"
//               : type === "bestseller" ? "Bán chạy"
//               : type === "discount" ? "Giảm giá"
//               : type === "price-high-low" ? "Giá cao - thấp"
//               : "Giá thấp - cao"}
//           </button>
//         ))}
//       </div>

//       {/* Product list */}
//       {sortedProducts.length === 0 ? (
//         <div className="text-center py-10">
//           <p className="text-lg text-gray-600">Chưa có sản phẩm.</p>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
//           {sortedProducts.map((product) => (
//             <ProductCard
//               key={product.id}
//               product={product}
//               categorySlug={categorySlug}
//               variants={productVariants[product.id] || []}
//             />
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

"use client"
import { useEffect, useState, useMemo, use } from "react";
// Đảm bảo import PaginatedProductsResponse từ productApi.ts
import { Product, fetchProductsByCatSlug, PaginatedProductsResponse } from "@/features/products/api/productApi";
import { Variant } from "@/features/variants/api/variantApi";
import { ProductCard } from "@/features/products/components/ProductCard";
import { Button } from "@/components/ui/Button";
import { fetchBrandsbyCatSlug, Brand } from "@/features/brands/api/brandApi";
import { useProductStore } from "@/store/productStore";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  params: Promise<{ categorySlug: string }>;
}

const CACHE_DURATION = 5 * 60 * 1000;
const ITEMS_PER_PAGE = 10; // Hằng số cho số sản phẩm mỗi trang

export default function ProductListPage({ params }: Props) {
  const { categorySlug } = use(params);

  const {
    products,
    productVariants,
    lastFetchedCategorySlug,
    lastFetchedTimestamp,
    setProducts,
    setProductVariants,
    setLastFetchedCategorySlug,
    setLastFetchedTimestamp,
  } = useProductStore();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [sortType, setSortType] = useState<string>("featured");
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null);
  const [loadingInitialData, setLoadingInitialData] = useState(true);

  // === THÊM CÁC STATE PHÂN TRANG MỚI ===
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalProductsCount, setTotalProductsCount] = useState<number>(0); // Tổng số sản phẩm không phân trang


  useEffect(() => {
    const loadProductsAndVariants = async () => {
      setLoadingInitialData(true);
      const now = Date.now();
      
      // Cache logic cần bao gồm currentPage và ITEMS_PER_PAGE
      const isCacheValid =
        categorySlug === lastFetchedCategorySlug &&
        lastFetchedTimestamp !== null &&
        now - lastFetchedTimestamp < CACHE_DURATION;
        // Lưu ý: Nếu bạn muốn cache theo từng trang, bạn cần thêm currentPage vào lastFetchedCategorySlug
        // hoặc tạo một cache key phức tạp hơn trong useProductStore.
        // Hiện tại, cache này chỉ kiểm tra categorySlug.
        // Để cache theo trang, bạn có thể cần một map cacheKey -> data trong store.
        // Ví dụ đơn giản: nếu cache hợp lệ và bạn đang ở trang 1, thì dùng cache.
        // Với phân trang, thường bạn sẽ không cache toàn bộ danh sách products mà cache theo từng trang.
        // Vì vậy, logic cache hiện tại có thể cần được điều chỉnh nếu bạn muốn cache từng trang.
        // Tạm thời, chúng ta sẽ bỏ qua `isCacheValid` cho `fetchProductsByCatSlug`
        // vì nó sẽ luôn fetch lại khi `currentPage` thay đổi.

      try {
        // Cập nhật fetchProductsByCatSlug để truyền page và limit
        const response: PaginatedProductsResponse = await fetchProductsByCatSlug(categorySlug, currentPage, ITEMS_PER_PAGE);
        
        console.log("API response (paginated products data):", response);

        setProducts(response.data); // products bây giờ là mảng sản phẩm của trang hiện tại

        // Cập nhật thông tin phân trang
        setTotalProductsCount(response.meta.total);
        setTotalPages(response.meta.last_page);
        setCurrentPage(response.meta.current_page);


        // build variants map once
        const variantsMap: Record<number, Variant[]> = {};
        response.data.forEach((p) => { // Lặp qua response.data (sản phẩm của trang hiện tại)
          variantsMap[p.id] = p.variants || [];
        });
        setProductVariants(variantsMap);
        setLastFetchedCategorySlug(categorySlug);
        setLastFetchedTimestamp(now);
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
        setProductVariants({});
        setLastFetchedCategorySlug(null);
        setLastFetchedTimestamp(null);
        setTotalProductsCount(0);
        setTotalPages(1);
        setCurrentPage(1);
      } finally {
        setLoadingInitialData(false);
      }
    };

    const loadBrands = async () => {
      try {
        const brandList = await fetchBrandsbyCatSlug(categorySlug);
        setBrands(Array.isArray(brandList) ? brandList : []);
      } catch (error) {
        console.error("Error fetching brands:", error);
        setBrands([]);
      }
    };

    loadBrands();
    // Gọi loadProductsAndVariants khi categorySlug hoặc currentPage thay đổi
    loadProductsAndVariants();
  }, [categorySlug, currentPage, setProducts, setProductVariants, setLastFetchedCategorySlug, setLastFetchedTimestamp]);

  // ==== DÙNG useMemo() để tránh filter/sort mỗi render ====
  const filteredProducts = useMemo(() => {
    return selectedBrand
      ? products.filter((p) => p.brand && p.brand.id === selectedBrand)
      : products;
  }, [products, selectedBrand]);

  const sortedProducts = useMemo(() => {
    if (filteredProducts.length === 0) {
      return [];
    }
    
    return [...filteredProducts].sort((a, b) => {
      const aVariants = productVariants[a.id] || [];
      const bVariants = productVariants[b.id] || [];
      
      const aMin = aVariants.length ? Math.min(...aVariants.map((v) => v.price)) : Infinity;
      const bMin = bVariants.length ? Math.min(...bVariants.map((v) => v.price)) : Infinity;

      if (sortType === "price-low-high") return aMin - bMin;
      if (sortType === "price-high-low") return bMin - aMin;
      
      if (sortType === "featured") {
        return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
      }
      if (sortType === "discount") {
        const aDiscount = aVariants.length ? Math.max(...aVariants.map(v => v.discount || 0)) : 0;
        const bDiscount = bVariants.length ? Math.max(...bVariants.map(v => v.discount || 0)) : 0;
        return bDiscount - aDiscount;
      }
      return 0;
    });
  }, [filteredProducts, productVariants, sortType]);

  // Hiển thị Skeleton khi đang tải dữ liệu ban đầu
  if (loadingInitialData) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="w-24 h-10 rounded-md" />
          ))}
        </div>
        <div className="flex gap-4 border-b pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="w-24 h-6 rounded-md" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-[360px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

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
        {["featured","bestseller","discount","price-high-low","price-low-high"].map((type) => (
          <button
            key={type}
            onClick={() => setSortType(type)}
            className={sortType === type ? "font-semibold" : ""}
          >
            {type === "featured" ? "Nổi bật"
              : type === "bestseller" ? "Bán chạy"
              : type === "discount" ? "Giảm giá"
              : type === "price-high-low" ? "Giá cao - thấp"
              : "Giá thấp - cao"}
          </button>
        ))}
      </div>

      {/* Product list */}
      {totalProductsCount === 0 ? ( // Kiểm tra totalProductsCount để hiển thị "Chưa có sản phẩm"
        <div className="text-center py-10">
          <p className="text-lg text-gray-600">Chưa có sản phẩm nào cho danh mục này.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {sortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                categorySlug={categorySlug}
                variants={productVariants[product.id] || []}
              />
            ))}
          </div>

          {/* === PHẦN PHÂN TRANG MỚI === */}
          <div className="flex justify-center items-center space-x-4 mt-6">
            <Button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loadingInitialData}
              variant="outline"
            >
              Trang trước
            </Button>
            <span className="text-lg font-semibold">
              Trang {currentPage} / {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loadingInitialData}
              variant="outline"
            >
              Trang sau
            </Button>
          </div>
          {/* === KẾT THÚC PHẦN PHÂN TRANG MỚI === */}
        </>
      )}
    </div>
  );
}