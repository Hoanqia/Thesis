'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import BulkPriceUpdateForm from '@/features/variants/components/BulkPriceUpdateForm';
import ProductTable from '@/features/variants/components/ProductTable';
import { Variant, variantApi } from '@/features/variants/api/variantApi';
import { Category, fetchCategories } from '@/features/categories/api/categoryApi';
import axios from 'axios'; // For axios error handling

export default function BulkPriceUpdatePage() {
  const [allVariants, setAllVariants] = useState<Variant[]>([]);
  const [filteredVariants, setFilteredVariants] = useState<Variant[]>([]);
  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<number>>(new Set());
  const [profitPercentInput, setProfitPercentInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingUpdate, setLoadingUpdate] = useState<boolean>(false); // New state for update button loading

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPsychologicalStrategy, setSelectedPsychologicalStrategy] = useState<string>(''); // New state for psychological strategy

  // Helper for consistent API error handling
  const handleApiError = useCallback((error: any, defaultMessage: string) => {
    console.error("API Error:", error);
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.data.errors) {
        Object.values(error.response.data.errors).forEach((errMsgs: any) => {
          if (Array.isArray(errMsgs)) {
          } 
        });
      }
    } else {
    }
  }, []);

  // Function to load initial variant data
  const loadVariants = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedVariants = await variantApi.fetchAllVariants();

      const transformedVariants = fetchedVariants.map(v => ({
        ...v,
        // Ensure conversion from string to number if API returns string
        price: typeof v.price === 'string' ? parseFloat(v.price) : v.price,
        discount: typeof v.discount === 'string' ? parseFloat(v.discount) : v.discount,
        average_cost: typeof v.average_cost === 'string' ? parseFloat(v.average_cost) : v.average_cost,
        profit_percent: typeof v.profit_percent === 'string' ? parseFloat(v.profit_percent) : v.profit_percent, // Ensure profit_percent is number
        product: v.product ? {
          ...v.product,
          category: v.product.category ? { ...v.product.category } : undefined
        } : undefined
      }));

      setAllVariants(transformedVariants);
      setFilteredVariants(transformedVariants); // Initialize filtered variants

    } catch (error) {
      handleApiError(error, "Không thể tải dữ liệu sản phẩm.");
    } finally {
      setLoading(false);
    }
  }, [handleApiError]);


  // Function to load categories data
  const loadCategories = useCallback(async () => {
    try {
      const fetchedCategories = await fetchCategories();
      setCategories(fetchedCategories);
    } catch (error) {
      handleApiError(error, "Không thể tải dữ liệu danh mục.");
    }
  }, [handleApiError]);

  // Fetch data on client when component mounts
  useEffect(() => {
    loadVariants();
    loadCategories();
  }, [loadVariants, loadCategories]);

  // Apply search and filter logic
  const handleSearchAndFilter = useCallback(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
    const filtered = allVariants.filter(variant => {
      const variantCategoryName = variant.product?.category?.name;

      const matchesSearch =
        variant.sku.toLowerCase().includes(lowerCaseSearchTerm) ||
        (variant.product?.name && variant.product.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (variant.full_name && variant.full_name.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (variantCategoryName && variantCategoryName.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (variant.variant_spec_values?.some(sv => {
          const specValue = sv.value_text || sv.spec_options?.value;
          return (
            (sv.specification.name && sv.specification.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (specValue && specValue.toLowerCase().includes(lowerCaseSearchTerm))
          );
        }) || false);

      const matchesCategory = selectedCategory === '' || (variantCategoryName === selectedCategory);

      return matchesSearch && matchesCategory;
    });

    setFilteredVariants(filtered);
    setSelectedVariantIds(new Set()); // Reset selection when filter changes
  }, [allVariants, searchTerm, selectedCategory]);

  // Re-filter variants whenever search term or selected category changes
  useEffect(() => {
    handleSearchAndFilter();
  }, [searchTerm, selectedCategory, handleSearchAndFilter, allVariants]); // Add allVariants to dependencies for initial filtering

  // Logic to check if all filtered variants are selected
  const isAllSelected = useMemo(() => {
    if (filteredVariants.length === 0) return false;
    return filteredVariants.every((variant) => selectedVariantIds.has(variant.id));
  }, [filteredVariants, selectedVariantIds]);

  // Toggle select/deselect a single variant
  const toggleSelectVariant = useCallback((id: number) => {
    setSelectedVariantIds((prevSelected) => {
      const newSet = new Set(prevSelected);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Toggle select/deselect all filtered variants
  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedVariantIds(new Set());
    } else {
      const newSet = new Set(filteredVariants.map((variant) => variant.id));
      setSelectedVariantIds(newSet);
    }
  }, [isAllSelected, filteredVariants]);

  // Handle change for profit percent input
  const handleProfitPercentInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProfitPercentInput(value);
  }, []);

  // --- NEW: Handle "Cập nhật giá cho {selectedVariantCount} sản phẩm" button (Đặt giá theo gốc mới) ---
  const handleSetPricesByTargetProfit = useCallback(async () => {
    if (selectedVariantIds.size === 0) {
      return;
    }
    const parsedProfit = parseFloat(profitPercentInput);
    if (isNaN(parsedProfit) || parsedProfit < -100) { // Allow negative profit but not below -100
      return;
    }

    setLoadingUpdate(true);
    try {
      const response = await variantApi.setPricesByTargetProfit(
        Array.from(selectedVariantIds),
        parsedProfit,
        selectedPsychologicalStrategy
      );
      // Re-fetch data to reflect updated prices and profit_percent from backend
      await loadVariants();
      setSelectedVariantIds(new Set()); // Clear selection
      setProfitPercentInput(''); // Reset input
    } catch (error) {
      handleApiError(error, "Có lỗi xảy ra khi cập nhật giá theo lợi nhuận mục tiêu.");
    } finally {
      setLoadingUpdate(false);
    }
  }, [selectedVariantIds, profitPercentInput, selectedPsychologicalStrategy, loadVariants, handleApiError]);

  // --- NEW: Handle "Cập nhật giá bán theo giá gốc mới ({selectedVariantCount})" button ---
  const handleRecalculatePricesByCurrentCost = useCallback(async () => {
    if (selectedVariantIds.size === 0) {
      return;
    }

    setLoadingUpdate(true);
    try {
      const response = await variantApi.recalculatePricesByCurrentCost(
        Array.from(selectedVariantIds),
        selectedPsychologicalStrategy
      );
      // Re-fetch data to reflect updated prices from backend
      await loadVariants();
      setSelectedVariantIds(new Set()); // Clear selection
    } catch (error) {
      handleApiError(error, "Có lỗi xảy ra khi cập nhật giá bán theo giá gốc mới.");
    } finally {
      setLoadingUpdate(false);
    }
  }, [selectedVariantIds, selectedPsychologicalStrategy, loadVariants, handleApiError]);


  if (loading) {
    return (
      <div className="container mx-auto p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Đang tải dữ liệu sản phẩm...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Quản lý giá sản phẩm hàng loạt</h1>

      <BulkPriceUpdateForm
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        // setCategories={setCategories} // Pass setCategories if you want the form to manage categories directly
        setSelectedCategory={setSelectedCategory}
        handleSearchAndFilter={handleSearchAndFilter}
        profitPercentInput={profitPercentInput}
        handleProfitPercentInputChange={handleProfitPercentInputChange}
        // Pass the new API handling functions
        handleSetPricesByTargetProfit={handleSetPricesByTargetProfit}
        handleRecalculatePricesByCurrentCost={handleRecalculatePricesByCurrentCost}
        selectedVariantCount={selectedVariantIds.size}
        categories={categories.map(cat => cat.name)} // Pass only category names to the form
        selectedPsychologicalStrategy={selectedPsychologicalStrategy}
        setSelectedPsychologicalStrategy={setSelectedPsychologicalStrategy}
        loadingUpdate={loadingUpdate} // Pass loading state to disable buttons
      />

      <ProductTable
        filteredVariants={filteredVariants}
        selectedVariantIds={selectedVariantIds}
        isAllSelected={isAllSelected}
        toggleSelectAll={toggleSelectAll}
        toggleSelectVariant={toggleSelectVariant}
        profitPercentInput={profitPercentInput}
      />
    </div>
  );
}
// // app/admin/bulk-price-update/page.tsx
// 'use client';

// import { useState, useEffect, useMemo, useCallback } from 'react';
// import BulkPriceUpdateForm from '@/features/variants/components/BulkPriceUpdateForm';
// import ProductTable from '@/features/variants/components/ProductTable';
// import { Variant, variantApi } from '@/features/variants/api/variantApi';
// import { Category, fetchCategories } from '@/features/categories/api/categoryApi';
// export default function BulkPriceUpdatePage() {
//   const [allVariants, setAllVariants] = useState<Variant[]>([]);
//   const [filteredVariants, setFilteredVariants] = useState<Variant[]>([]);
//   const [selectedVariantIds, setSelectedVariantIds] = useState<Set<number>>(new Set());
//   const [profitPercentInput, setProfitPercentInput] = useState<string>('');
//   // const [profitPercentChange, setProfitPercentChange] = useState<number | null>(null); // <-- Xóa state này
//   const [loading, setLoading] = useState<boolean>(true);

//   const [searchTerm, setSearchTerm] = useState<string>('');
//   const [selectedCategory, setSelectedCategory] = useState<string>('');
//   const [categories, setCategories] = useState<Category[]>([]); // <-- Thay đổi kiểu dữ liệu thành Category[]

//   // Hàm load dữ liệu variants ban đầu
//   const loadVariants = useCallback(async () => {
//     setLoading(true);
//     try {
//       const fetchedVariants = await variantApi.fetchAllVariants();

//        const transformedVariants = fetchedVariants.map(v => ({
//           ...v,
//           // Đảm bảo chuyển đổi string sang number nếu API trả về string
//           price: typeof v.price === 'string' ? parseFloat(v.price) : v.price,
//           discount: typeof v.discount === 'string' ? parseFloat(v.discount) : v.discount,
//           average_cost: typeof v.average_cost === 'string' ? parseFloat(v.average_cost) : v.average_cost,
//           product: v.product ? {
//             ...v.product,
//             category: v.product.category ? { ...v.product.category } : undefined
//           } : undefined
//       }));

//       setAllVariants(transformedVariants);
//       setFilteredVariants(transformedVariants);

      
//     } catch (error) {
//       console.error("Failed to fetch variants:", error);
//       alert("Không thể tải dữ liệu sản phẩm. Vui lòng thử lại sau.");
//     } finally {
//       setLoading(false);
//     }
//   }, []);


//    // Hàm load dữ liệu categories
//   const loadCategories = useCallback(async () => {
//     try {
//       const fetchedCategories = await fetchCategories();
//       setCategories(fetchedCategories);
//     } catch (error) {
//       console.error("Failed to fetch categories:", error);
//       // Bạn có thể xử lý lỗi ở đây, ví dụ hiển thị một thông báo
//     }
//   }, []);


//   // Fetch data on client when component mounts
//   useEffect(() => {
//     loadVariants();
//     loadCategories();
//   }, [loadVariants, loadCategories]);

//   // Logic kiểm tra xem tất cả các variants đã lọc có được chọn không
//   const isAllSelected = useMemo(() => {
//     if (filteredVariants.length === 0) return false;
//     return filteredVariants.every((variant) => selectedVariantIds.has(variant.id));
//   }, [filteredVariants, selectedVariantIds]);

//   // Toggle chọn/bỏ chọn một variant
//   const toggleSelectVariant = useCallback((id: number) => {
//     setSelectedVariantIds((prevSelected) => {
//       const newSet = new Set(prevSelected);
//       if (newSet.has(id)) {
//         newSet.delete(id);
//       } else {
//         newSet.add(id);
//       }
//       return newSet;
//     });
//   }, []);

//   // Toggle chọn/bỏ chọn tất cả các variants đã lọc
//   const toggleSelectAll = useCallback(() => {
//     if (isAllSelected) {
//       setSelectedVariantIds(new Set());
//     } else {
//       const newSet = new Set(filteredVariants.map((variant) => variant.id));
//       setSelectedVariantIds(newSet);
//     }
//   }, [isAllSelected, filteredVariants]);

//   // Xử lý khi người dùng ấn nút "Cập nhật giá" (dùng % lợi nhuận mới)
//   const handleApplyChanges = useCallback(async (e: React.FormEvent) => {
//     e.preventDefault();
//     const parsedProfit = parseFloat(profitPercentInput);

//     if (selectedVariantIds.size === 0) {
//       alert("Vui lòng chọn ít nhất một sản phẩm để cập nhật.");
//       return;
//     }
//     if (isNaN(parsedProfit) || parsedProfit < 0) {
//       alert("Phần trăm lợi nhuận không hợp lệ. Vui lòng nhập một số dương.");
//       return;
//     }

//     setLoading(true);
//     try {
//       const updatePromises = Array.from(selectedVariantIds).map(async (id) => {
//         // Gửi profit_percent mới lên backend để backend tính toán và lưu giá
//         const dataToUpdate = {
//           profit_percent: parsedProfit,
//           // Không cần gửi price ở đây vì backend sẽ tính
//         };
//         // Giả sử API update của bạn sẽ trả về variant đã được cập nhật với giá mới
//         return variantApi.update(id, dataToUpdate);
//       });

//       await Promise.all(updatePromises); // Chờ tất cả các cập nhật hoàn tất

//       setSelectedVariantIds(new Set()); // Bỏ chọn tất cả sau khi cập nhật
//       setProfitPercentInput(''); // Xóa giá trị input

//       // Sau khi cập nhật thành công, re-fetch dữ liệu mới nhất từ backend
//       await loadVariants();
//       alert(`Đã cập nhật lợi nhuận cho ${updatePromises.length} sản phẩm. Giá mới đã được tính toán và lưu tại backend.`);
//     } catch (error) {
//       console.error("Lỗi khi cập nhật lợi nhuận:", error);
//       alert("Có lỗi xảy ra khi cập nhật lợi nhuận. Vui lòng kiểm tra console để biết thêm chi tiết.");
//     } finally {
//       setLoading(false);
//     }
//   }, [selectedVariantIds, profitPercentInput, loadVariants]); // Thêm loadVariants vào dependency

//   // Hàm xử lý khi người dùng nhấn nút "Cập nhật giá bán theo giá gốc mới"
//   // HÀM NÀY SẼ ĐƯỢC XÓA HOẶC TÍCH HỢP VÀO handleApplyChanges nếu logic hoàn toàn giống nhau
//   // Trong trường hợp này, tôi sẽ xóa nó để tránh trùng lặp
//   const handleUpdatePriceByAverageCost = useCallback(async () => {
//     if (selectedVariantIds.size === 0) {
//       alert("Vui lòng chọn ít nhất một sản phẩm để cập nhật.");
//       return;
//     }

//     setLoading(true);
//     try {
//       const updatePromises = Array.from(selectedVariantIds).map(async (id) => {
//         // Gửi yêu cầu backend tính toán lại giá dựa trên average_cost và profit_percent hiện tại
//         // Giả sử backend có một endpoint hoặc logic riêng cho việc này,
//         // hoặc bạn chỉ cần gọi update mà không cần gửi profit_percent mới nếu nó đã có sẵn
//         const variantToUpdate = allVariants.find(v => v.id === id);
//         if (!variantToUpdate) return; // Bỏ qua nếu không tìm thấy variant

//         // Gửi một request với profit_percent hiện tại để backend tính lại giá
//         // Hoặc một endpoint chuyên dụng để "recalculate price based on average cost"
//         // Ở đây tôi giả định bạn chỉ cần gửi lại profit_percent hiện tại
//         const dataToUpdate = {
//           profit_percent: variantToUpdate.profit_percent, // Giữ nguyên profit_percent hiện tại
//           // backend sẽ dựa vào profit_percent này và average_cost để tính price
//         };
//         return variantApi.update(id, dataToUpdate);
//       });

//       await Promise.all(updatePromises);

//       setSelectedVariantIds(new Set());
//       setProfitPercentInput('');
//       // setProfitPercentChange(null); // Không còn cần thiết

//       await loadVariants(); // Re-fetch data để lấy giá mới nhất
//       alert(`Đã cập nhật giá bán cho ${updatePromises.length} sản phẩm theo giá gốc mới.`);
//     } catch (error) {
//       console.error("Lỗi khi cập nhật giá bán theo giá gốc mới:", error);
//       alert("Có lỗi xảy ra khi cập nhật giá bán. Vui lòng kiểm tra console để biết thêm chi tiết.");
//     } finally {
//       setLoading(false);
//     }
//   }, [selectedVariantIds, allVariants, loadVariants]);


//    // CHỈNH SỬA HÀM handleSearchAndFilter TẠI ĐÂY
//   const handleSearchAndFilter = useCallback(() => {
//     const lowerCaseSearchTerm = searchTerm.toLowerCase().trim(); // Thêm .trim()
//     const filtered = allVariants.filter(variant => {
//       // Lấy tên danh mục từ product.category.name một cách an toàn
//       const variantCategoryName = variant.product?.category?.name;

//       // Kiểm tra xem variant có khớp với searchTerm không
//       const matchesSearch =
//         variant.sku.toLowerCase().includes(lowerCaseSearchTerm) ||
//         (variant.product?.name && variant.product.name.toLowerCase().includes(lowerCaseSearchTerm)) || // Thêm tìm kiếm theo tên product
//         (variant.full_name && variant.full_name.toLowerCase().includes(lowerCaseSearchTerm)) || // <-- THÊM DÒNG NÀY ĐỂ TÌM THEO full_name

//         (variantCategoryName && variantCategoryName.toLowerCase().includes(lowerCaseSearchTerm)) ||
//         (variant.variant_spec_values?.some(sv => {
//           // Kết hợp các giá trị spec thành một chuỗi để tìm kiếm dễ hơn
//           const specValue = sv.value_text || sv.spec_options?.value;
//           return (
//             (specValue && specValue.toLowerCase().includes(lowerCaseSearchTerm)) ||
//             (sv.specification.name && sv.specification.name.toLowerCase().includes(lowerCaseSearchTerm))
//           );
//         }) || false);

//       // Kiểm tra xem variant có khớp với selectedCategory không
//       // Nếu selectedCategory rỗng, coi như khớp với tất cả
//       const matchesCategory = selectedCategory === '' || (variantCategoryName === selectedCategory);

//       // Trả về true nếu khớp cả điều kiện tìm kiếm và điều kiện lọc danh mục
//       return matchesSearch && matchesCategory;
//     });

//     setFilteredVariants(filtered);
//     setSelectedVariantIds(new Set()); // Reset lựa chọn khi filter để tránh chọn nhầm sản phẩm không còn hiển thị
//   }, [allVariants, searchTerm, selectedCategory]);

//   // Hàm xử lý thay đổi input % lợi nhuận (Không cần chỉnh sửa)
//   const handleProfitPercentInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     setProfitPercentInput(value);
//   }, []);

//   if (loading) {
//     return (
//       <div className="container mx-auto p-6 bg-gray-50 min-h-screen flex items-center justify-center">
//         <p className="text-xl text-gray-600">Đang tải dữ liệu sản phẩm...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
//       <h1 className="text-3xl font-bold text-gray-900 mb-6">Quản lý giá sản phẩm hàng loạt</h1>

//       <BulkPriceUpdateForm
//         searchTerm={searchTerm}
//         setSearchTerm={setSearchTerm}
//         selectedCategory={selectedCategory}
//         setSelectedCategory={setSelectedCategory}
//         handleSearchAndFilter={handleSearchAndFilter}
//         profitPercentInput={profitPercentInput} // TRUYỀN PROP NÀY XUỐNG BulkPriceUpdateForm
//         handleProfitPercentInputChange={handleProfitPercentInputChange}
//         handleApplyChanges={handleApplyChanges}
//         handleUpdatePriceByAverageCost={handleUpdatePriceByAverageCost} // <-- Vẫn giữ nút này
//         selectedVariantCount={selectedVariantIds.size}
//         categories={categories.map(cat => cat.name)} 
//       />

//       <ProductTable
//         filteredVariants={filteredVariants}
//         selectedVariantIds={selectedVariantIds}
//         isAllSelected={isAllSelected}
//         toggleSelectAll={toggleSelectAll}
//         toggleSelectVariant={toggleSelectVariant}
//         profitPercentInput={profitPercentInput} // TRUYỀN PROP NÀY XUỐNG ProductTable
//       />
//     </div>
//   );
// }
