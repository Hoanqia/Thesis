// frontend\src\app\admin\price-management\page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import PriceManagementForm from '@/features/variants/components/BulkPriceUpdateForm'; // Đổi tên file này thành PriceManagementForm.tsx
import ProductTable from '@/features/variants/components/ProductTable';
import { Variant, variantApi } from '@/features/variants/api/variantApi'; // Import VariantFromSupplier
import supplierApi, { VariantFromSupplier } from '@/features/suppliers/api/supplierApi';
import { Category, fetchCategories } from '@/features/categories/api/categoryApi';
import axios from 'axios';
import { toast } from 'react-hot-toast'; // Giả sử bạn sử dụng react-hot-toast

export default function PriceManagementPage() { // Đổi tên component
  const [allVariants, setAllVariants] = useState<Variant[]>([]);
  const [filteredVariants, setFilteredVariants] = useState<Variant[]>([]);
  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<number>>(new Set());
  const [profitPercentInput, setProfitPercentInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingUpdate, setLoadingUpdate] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPsychologicalStrategy, setSelectedPsychologicalStrategy] = useState<string>('');

  // Helper for consistent API error handling
  const handleApiError = useCallback((error: any, defaultMessage: string) => {
    console.error("API Error:", error);
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.data.errors) {
        let errorMessages: string[] = [];
        Object.values(error.response.data.errors).forEach((errMsgs: any) => {
          if (Array.isArray(errMsgs)) {
            errorMessages = errorMessages.concat(errMsgs);
          }
        });
        toast.error(errorMessages.join(', ') || defaultMessage);
      } else if (error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(defaultMessage);
      }
    } else {
      toast.error(defaultMessage);
    }
  }, []);

  // Function to load initial variant data
  const loadVariants = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedVariants = await variantApi.fetchAllVariants();

      const transformedVariants = fetchedVariants.map(v => {
        let defaultSupplierId: number | undefined;
        let defaultSupplierPrice: number | undefined;

        // Ưu tiên chọn VFS có is_default = true
        // Nếu không có, chọn VFS có current_purchase_price thấp nhất
        // Nếu vẫn không có, không chọn gì cả
        if (v.variant_from_suppliers && v.variant_from_suppliers.length > 0) {
          const defaultVFS = v.variant_from_suppliers.find(vfs => vfs.is_default === true) ||
                             v.variant_from_suppliers.reduce((prev, current) =>
                                (prev.current_purchase_price < current.current_purchase_price) ? prev : current); // Chọn giá thấp nhất

          defaultSupplierId = defaultVFS?.id;
          defaultSupplierPrice = defaultVFS?.current_purchase_price;
        }

        return {
          ...v,
          price: typeof v.price === 'string' ? parseFloat(v.price) : v.price,
          discount: typeof v.discount === 'string' ? parseFloat(v.discount) : v.discount,
          average_cost: typeof v.average_cost === 'string' ? parseFloat(v.average_cost) : v.average_cost,
          profit_percent: typeof v.profit_percent === 'string' ? parseFloat(v.profit_percent) : v.profit_percent,
          product: v.product ? {
            ...v.product,
            category: v.product.category ? { ...v.product.category } : undefined
          } : undefined,
          selected_supplier_id: defaultSupplierId, // Lưu ID của VFS được chọn
          selected_supplier_price: defaultSupplierPrice, // Lưu giá của VFS được chọn
        };
      });

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
  }, [searchTerm, selectedCategory, handleSearchAndFilter, allVariants]);

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

  // --- NEW: Xử lý khi người dùng chọn một VariantFromSupplier làm nguồn giá mua ---
  const handleSelectDefaultSupplier = useCallback(async (variantId: number, variantFromSupplierId: number) => {
    try {
        // Cập nhật state cục bộ ngay lập tức để UI phản hồi nhanh
        setFilteredVariants(prevVariants => prevVariants.map(v => {
            if (v.id === variantId) {
                const selectedVFS = v.variant_from_suppliers?.find(vfs => vfs.id === variantFromSupplierId);
                // Tạo một bản sao của variant và cập nhật các thuộc tính
                // Đảm bảo chỉ có một is_default là true trong mảng variant_from_suppliers
                const updatedVariantFromSuppliers = v.variant_from_suppliers?.map(vfs => ({
                    ...vfs,
                    is_default: vfs.id === variantFromSupplierId ? true : false
                }));

                return {
                    ...v,
                    selected_supplier_id: variantFromSupplierId,
                    selected_supplier_price: selectedVFS?.current_purchase_price,
                    variant_from_suppliers: updatedVariantFromSuppliers // Cập nhật mảng VFS
                };
            }
            return v;
        }));

        // Gửi yêu cầu lên backend để lưu lựa chọn mặc định
        await supplierApi.setDefaultVariantFromSupplier(variantFromSupplierId);
        toast.success("Đã chọn nguồn giá mua mặc định.");
    } catch (error) {
        handleApiError(error, "Không thể đặt nguồn giá mua mặc định.");
        // Nếu lỗi, bạn có thể cân nhắc revert lại UI state hoặc re-fetch dữ liệu
        // Để đơn giản, tôi sẽ re-fetch lại toàn bộ dữ liệu để đảm bảo đồng bộ
        loadVariants();
    }
  }, [handleApiError, loadVariants]);


  // --- NEW: Handle "Cập nhật giá cho {selectedVariantCount} sản phẩm" (Đặt giá theo lợi nhuận mục tiêu và nguồn FIFO) ---
  const handleSetPricesByTargetProfit = useCallback(async () => {
    if (selectedVariantIds.size === 0) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm để cập nhật giá.");
      return;
    }
    const parsedProfit = parseFloat(profitPercentInput);
    if (isNaN(parsedProfit) || parsedProfit < -100) {
      toast.error("Phần trăm lợi nhuận không hợp lệ. Vui lòng nhập số.");
      return;
    }

    setLoadingUpdate(true);
    try {
      const variantsToUpdate = Array.from(selectedVariantIds).map(variantId => {
        const variant = filteredVariants.find(v => v.id === variantId);
        if (!variant || !variant.selected_supplier_id) {
          console.warn(`Variant ${variantId} selected but no default supplier variant found or selected. Skipping.`);
          return null;
        }
        return { variant_id: variantId, variant_from_supplier_id: variant.selected_supplier_id };
      }).filter(Boolean); // Lọc bỏ các null

      if (variantsToUpdate.length === 0) {
        toast.error("Không có sản phẩm nào đủ điều kiện để cập nhật giá (chưa chọn nhà cung cấp).");
        setLoadingUpdate(false);
        return;
      }

// Gom các tham số vào một đối tượng payload
      const payloadForSetProfit = {
        variants: variantsToUpdate as { variant_id: number; variant_from_supplier_id: number; }[],
        profit_percent: parsedProfit,
        psychological_strategy: selectedPsychologicalStrategy,
      };

      const response = await variantApi.setPricesByTargetProfitFromSupplier(payloadForSetProfit); // TRUYỀN DUY NHẤT ĐỐI TƯỢNG PAYLOAD
      toast.success(response.message || `Đã cập nhật giá cho ${response.data} sản phẩm.`);
      await loadVariants(); // Re-fetch data to reflect updated prices and profit_percent from backend
      setSelectedVariantIds(new Set()); // Clear selection
      setProfitPercentInput(''); // Reset input
    } catch (error) {
      handleApiError(error, "Có lỗi xảy ra khi cập nhật giá theo lợi nhuận mục tiêu.");
    } finally {
      setLoadingUpdate(false);
    }
  }, [selectedVariantIds, profitPercentInput, selectedPsychologicalStrategy, filteredVariants, loadVariants, handleApiError]);

  // --- NEW: Handle "Cập nhật giá bán theo giá gốc mới ({selectedVariantCount})" (Sử dụng nguồn FIFO đã chọn) ---
  const handleRecalculatePricesByCurrentCost = useCallback(async () => {
    if (selectedVariantIds.size === 0) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm để cập nhật giá.");
      return;
    }

    setLoadingUpdate(true);
    try {
      const variantsToUpdate = Array.from(selectedVariantIds).map(variantId => {
        const variant = filteredVariants.find(v => v.id === variantId);
        if (!variant || !variant.selected_supplier_id) {
          console.warn(`Variant ${variantId} selected but no default supplier variant found or selected. Skipping.`);
          return null;
        }
        return { variant_id: variantId, variant_from_supplier_id: variant.selected_supplier_id };
      }).filter(Boolean); // Lọc bỏ các null

      if (variantsToUpdate.length === 0) {
        toast.error("Không có sản phẩm nào đủ điều kiện để cập nhật giá (chưa chọn nhà cung cấp).");
        setLoadingUpdate(false);
        return;
      }

      // Gom các tham số vào một đối tượng payload
      const payloadForRecalculate = {
        variants: variantsToUpdate as { variant_id: number; variant_from_supplier_id: number; }[],
        psychological_strategy: selectedPsychologicalStrategy,
      };

      const response = await variantApi.recalculatePricesByChosenSupplierCost(payloadForRecalculate); // TRUYỀN DUY NHẤT ĐỐI TƯỢNG PAYLOAD
      toast.success(response.message || `Đã cập nhật giá bán theo giá gốc mới cho ${response.data} sản phẩm.`);
      await loadVariants(); // Re-fetch data to reflect updated prices from backend
      setSelectedVariantIds(new Set()); // Clear selection
    } catch (error) {
      handleApiError(error, "Có lỗi xảy ra khi cập nhật giá bán theo giá gốc mới.");
    } finally {
      setLoadingUpdate(false);
    }
  }, [selectedVariantIds, selectedPsychologicalStrategy, filteredVariants, loadVariants, handleApiError]);


  if (loading) {
    return (
      <div className="container mx-auto p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Đang tải dữ liệu sản phẩm...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Quản lý giá sản phẩm theo FIFO</h1> {/* Đổi tiêu đề */}

      <PriceManagementForm // Đổi tên component form
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        handleSearchAndFilter={handleSearchAndFilter}
        profitPercentInput={profitPercentInput}
        handleProfitPercentInputChange={handleProfitPercentInputChange}
        handleSetPricesByTargetProfit={handleSetPricesByTargetProfit}
        handleRecalculatePricesByCurrentCost={handleRecalculatePricesByCurrentCost}
        selectedVariantCount={selectedVariantIds.size}
        categories={categories.map(cat => cat.name)}
        selectedPsychologicalStrategy={selectedPsychologicalStrategy}
        setSelectedPsychologicalStrategy={setSelectedPsychologicalStrategy}
        loadingUpdate={loadingUpdate}
      />

      <ProductTable
        filteredVariants={filteredVariants}
        selectedVariantIds={selectedVariantIds}
        isAllSelected={isAllSelected}
        toggleSelectAll={toggleSelectAll}
        toggleSelectVariant={toggleSelectVariant}
        profitPercentInput={profitPercentInput}
        onSelectDefaultSupplier={handleSelectDefaultSupplier} // TRUYỀN PROP MỚI
      />
    </div>
  );
}

// 'use client';

// import { useState, useEffect, useMemo, useCallback } from 'react';
// import BulkPriceUpdateForm from '@/features/variants/components/BulkPriceUpdateForm';
// import ProductTable from '@/features/variants/components/ProductTable';
// import { Variant, variantApi } from '@/features/variants/api/variantApi';
// import { Category, fetchCategories } from '@/features/categories/api/categoryApi';
// import axios from 'axios'; // For axios error handling

// export default function BulkPriceUpdatePage() {
//   const [allVariants, setAllVariants] = useState<Variant[]>([]);
//   const [filteredVariants, setFilteredVariants] = useState<Variant[]>([]);
//   const [selectedVariantIds, setSelectedVariantIds] = useState<Set<number>>(new Set());
//   const [profitPercentInput, setProfitPercentInput] = useState<string>('');
//   const [loading, setLoading] = useState<boolean>(true);
//   const [loadingUpdate, setLoadingUpdate] = useState<boolean>(false); // New state for update button loading

//   const [searchTerm, setSearchTerm] = useState<string>('');
//   const [selectedCategory, setSelectedCategory] = useState<string>('');
//   const [categories, setCategories] = useState<Category[]>([]);
//   const [selectedPsychologicalStrategy, setSelectedPsychologicalStrategy] = useState<string>(''); // New state for psychological strategy

//   // Helper for consistent API error handling
//   const handleApiError = useCallback((error: any, defaultMessage: string) => {
//     console.error("API Error:", error);
//     if (axios.isAxiosError(error) && error.response) {
//       if (error.response.data.errors) {
//         Object.values(error.response.data.errors).forEach((errMsgs: any) => {
//           if (Array.isArray(errMsgs)) {
//           } 
//         });
//       }
//     } else {
//     }
//   }, []);

//   // Function to load initial variant data
//   const loadVariants = useCallback(async () => {
//     setLoading(true);
//     try {
//       const fetchedVariants = await variantApi.fetchAllVariants();

//       const transformedVariants = fetchedVariants.map(v => ({
//         ...v,
//         // Ensure conversion from string to number if API returns string
//         price: typeof v.price === 'string' ? parseFloat(v.price) : v.price,
//         discount: typeof v.discount === 'string' ? parseFloat(v.discount) : v.discount,
//         average_cost: typeof v.average_cost === 'string' ? parseFloat(v.average_cost) : v.average_cost,
//         profit_percent: typeof v.profit_percent === 'string' ? parseFloat(v.profit_percent) : v.profit_percent, // Ensure profit_percent is number
//         product: v.product ? {
//           ...v.product,
//           category: v.product.category ? { ...v.product.category } : undefined
//         } : undefined
//       }));

//       setAllVariants(transformedVariants);
//       setFilteredVariants(transformedVariants); // Initialize filtered variants

//     } catch (error) {
//       handleApiError(error, "Không thể tải dữ liệu sản phẩm.");
//     } finally {
//       setLoading(false);
//     }
//   }, [handleApiError]);


//   // Function to load categories data
//   const loadCategories = useCallback(async () => {
//     try {
//       const fetchedCategories = await fetchCategories();
//       setCategories(fetchedCategories);
//     } catch (error) {
//       handleApiError(error, "Không thể tải dữ liệu danh mục.");
//     }
//   }, [handleApiError]);

//   // Fetch data on client when component mounts
//   useEffect(() => {
//     loadVariants();
//     loadCategories();
//   }, [loadVariants, loadCategories]);

//   // Apply search and filter logic
//   const handleSearchAndFilter = useCallback(() => {
//     const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
//     const filtered = allVariants.filter(variant => {
//       const variantCategoryName = variant.product?.category?.name;

//       const matchesSearch =
//         variant.sku.toLowerCase().includes(lowerCaseSearchTerm) ||
//         (variant.product?.name && variant.product.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
//         (variant.full_name && variant.full_name.toLowerCase().includes(lowerCaseSearchTerm)) ||
//         (variantCategoryName && variantCategoryName.toLowerCase().includes(lowerCaseSearchTerm)) ||
//         (variant.variant_spec_values?.some(sv => {
//           const specValue = sv.value_text || sv.spec_options?.value;
//           return (
//             (sv.specification.name && sv.specification.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
//             (specValue && specValue.toLowerCase().includes(lowerCaseSearchTerm))
//           );
//         }) || false);

//       const matchesCategory = selectedCategory === '' || (variantCategoryName === selectedCategory);

//       return matchesSearch && matchesCategory;
//     });

//     setFilteredVariants(filtered);
//     setSelectedVariantIds(new Set()); // Reset selection when filter changes
//   }, [allVariants, searchTerm, selectedCategory]);

//   // Re-filter variants whenever search term or selected category changes
//   useEffect(() => {
//     handleSearchAndFilter();
//   }, [searchTerm, selectedCategory, handleSearchAndFilter, allVariants]); // Add allVariants to dependencies for initial filtering

//   // Logic to check if all filtered variants are selected
//   const isAllSelected = useMemo(() => {
//     if (filteredVariants.length === 0) return false;
//     return filteredVariants.every((variant) => selectedVariantIds.has(variant.id));
//   }, [filteredVariants, selectedVariantIds]);

//   // Toggle select/deselect a single variant
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

//   // Toggle select/deselect all filtered variants
//   const toggleSelectAll = useCallback(() => {
//     if (isAllSelected) {
//       setSelectedVariantIds(new Set());
//     } else {
//       const newSet = new Set(filteredVariants.map((variant) => variant.id));
//       setSelectedVariantIds(newSet);
//     }
//   }, [isAllSelected, filteredVariants]);

//   // Handle change for profit percent input
//   const handleProfitPercentInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     setProfitPercentInput(value);
//   }, []);

//   // --- NEW: Handle "Cập nhật giá cho {selectedVariantCount} sản phẩm" button (Đặt giá theo gốc mới) ---
//   const handleSetPricesByTargetProfit = useCallback(async () => {
//     if (selectedVariantIds.size === 0) {
//       return;
//     }
//     const parsedProfit = parseFloat(profitPercentInput);
//     if (isNaN(parsedProfit) || parsedProfit < -100) { // Allow negative profit but not below -100
//       return;
//     }

//     setLoadingUpdate(true);
//     try {
//       const response = await variantApi.setPricesByTargetProfit(
//         Array.from(selectedVariantIds),
//         parsedProfit,
//         selectedPsychologicalStrategy
//       );
//       // Re-fetch data to reflect updated prices and profit_percent from backend
//       await loadVariants();
//       setSelectedVariantIds(new Set()); // Clear selection
//       setProfitPercentInput(''); // Reset input
//     } catch (error) {
//       handleApiError(error, "Có lỗi xảy ra khi cập nhật giá theo lợi nhuận mục tiêu.");
//     } finally {
//       setLoadingUpdate(false);
//     }
//   }, [selectedVariantIds, profitPercentInput, selectedPsychologicalStrategy, loadVariants, handleApiError]);

//   // --- NEW: Handle "Cập nhật giá bán theo giá gốc mới ({selectedVariantCount})" button ---
//   const handleRecalculatePricesByCurrentCost = useCallback(async () => {
//     if (selectedVariantIds.size === 0) {
//       return;
//     }

//     setLoadingUpdate(true);
//     try {
//       const response = await variantApi.recalculatePricesByCurrentCost(
//         Array.from(selectedVariantIds),
//         selectedPsychologicalStrategy
//       );
//       // Re-fetch data to reflect updated prices from backend
//       await loadVariants();
//       setSelectedVariantIds(new Set()); // Clear selection
//     } catch (error) {
//       handleApiError(error, "Có lỗi xảy ra khi cập nhật giá bán theo giá gốc mới.");
//     } finally {
//       setLoadingUpdate(false);
//     }
//   }, [selectedVariantIds, selectedPsychologicalStrategy, loadVariants, handleApiError]);


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
//         // setCategories={setCategories} // Pass setCategories if you want the form to manage categories directly
//         setSelectedCategory={setSelectedCategory}
//         handleSearchAndFilter={handleSearchAndFilter}
//         profitPercentInput={profitPercentInput}
//         handleProfitPercentInputChange={handleProfitPercentInputChange}
//         // Pass the new API handling functions
//         handleSetPricesByTargetProfit={handleSetPricesByTargetProfit}
//         handleRecalculatePricesByCurrentCost={handleRecalculatePricesByCurrentCost}
//         selectedVariantCount={selectedVariantIds.size}
//         categories={categories.map(cat => cat.name)} // Pass only category names to the form
//         selectedPsychologicalStrategy={selectedPsychologicalStrategy}
//         setSelectedPsychologicalStrategy={setSelectedPsychologicalStrategy}
//         loadingUpdate={loadingUpdate} // Pass loading state to disable buttons
//       />

//       <ProductTable
//         filteredVariants={filteredVariants}
//         selectedVariantIds={selectedVariantIds}
//         isAllSelected={isAllSelected}
//         toggleSelectAll={toggleSelectAll}
//         toggleSelectVariant={toggleSelectVariant}
//         profitPercentInput={profitPercentInput}
//       />
//     </div>
//   );
// }
