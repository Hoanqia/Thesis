// frontend\src\features\variants\components\ProductTable.tsx
import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Variant } from '@/features/variants/api/variantApi'; 
import { VariantFromSupplier } from '@/features/suppliers/api/supplierApi';
import { formatCurrency } from '@/lib/utils';
import { calculateNewPrice } from '@/lib/utils';

interface ProductTableProps {
  filteredVariants: Variant[];
  selectedVariantIds: Set<number>;
  isAllSelected: boolean;
  toggleSelectAll: () => void;
  toggleSelectVariant: (id: number) => void;
  profitPercentInput: string;
  // THÊM PROP MỚI ĐỂ XỬ LÝ VIỆC CHỌN NHÀ CUNG CẤP MẶC ĐỊNH
  onSelectDefaultSupplier: (variantId: number, variantFromSupplierId: number) => void;
}

const ITEMS_PER_PAGE = 10;

export default function ProductTable({
  filteredVariants,
  selectedVariantIds,
  isAllSelected,
  toggleSelectAll,
  toggleSelectVariant,
  profitPercentInput,
  onSelectDefaultSupplier, // NHẬN PROP MỚI
}: ProductTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(filteredVariants.length / ITEMS_PER_PAGE);

  const currentVariants = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredVariants.slice(startIndex, endIndex);
  }, [filteredVariants, currentPage]);

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const goToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const HEADER_HEIGHT_REM = 3.5;
  const ROW_HEIGHT_REM = 3.5;
  const maxBodyHeightCalc = `${ITEMS_PER_PAGE * ROW_HEIGHT_REM}rem`;
  const totalMaxHeightCalc = `calc(${maxBodyHeightCalc} + ${HEADER_HEIGHT_REM}rem)`;

  return (
    <div className="overflow-x-auto">
      <div className="relative overflow-y-auto" style={{ maxHeight: totalMaxHeightCalc }}>
        <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg table-fixed">
          <thead className="bg-gray-100 sticky top-0 z-20">
            <tr>
              <th className="w-12 py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="w-20 py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">Hình ảnh</th>
              <th className="w-64 py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">Tên sản phẩm / SKU</th>
              <th className="w-32 py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">Giá hiện tại</th>
              {/* THAY THẾ CỘT GIÁ GỐC BÌNH QUÂN BẰNG CỘT NGUỒN GIÁ FIFO */}
              <th className="w-64 py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">Nguồn giá mua (FIFO)</th>
              <th className="w-32 py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">Giá gốc được chọn</th>
              <th className="w-24 py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">Lợi nhuận (%)</th>
              <th className="w-32 py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">Giá mới dự kiến</th>
              <th className="w-32 py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {currentVariants.map((variant) => {
              const isActive = variant.status === 1;

              // Lấy VariantFromSupplier được chọn làm mặc định (hoặc đầu tiên nếu không có)
              // Ưu tiên: `is_default` từ backend, sau đó `selected_supplier_id` từ state frontend, cuối cùng là giá thấp nhất
              const selectedVFS = variant.variant_from_suppliers?.find(vfs => vfs.is_default) ||
                                  variant.variant_from_suppliers?.find(vfs => vfs.id === variant.selected_supplier_id) ||
                                  (variant.variant_from_suppliers && variant.variant_from_suppliers.length > 0
                                    ? variant.variant_from_suppliers.reduce((prev, current) =>
                                        (prev.current_purchase_price < current.current_purchase_price) ? prev : current)
                                    : undefined);


              // Giá gốc để tính toán là giá mua của VFS được chọn, hoặc average_cost nếu không có VFS
              const baseCostForCalculation = selectedVFS?.current_purchase_price  || 0;

              let newPriceCalculated: number = variant.price;
              const parsedProfitPercent = parseFloat(profitPercentInput);

              // Nếu người dùng nhập profitPercentInput, tính giá mới theo đó
              if (!isNaN(parsedProfitPercent) && parsedProfitPercent >= -100) { // Cho phép lợi nhuận âm
                newPriceCalculated = calculateNewPrice(
                  baseCostForCalculation,
                  parsedProfitPercent,
                  'charm_vnd_990' // Đây là giá trị cứng, bạn có thể truyền `selectedPsychologicalStrategy` từ prop nếu muốn preview theo nó
                );
              } else {
                // Nếu không nhập profitPercentInput, giá mới dự kiến sẽ dựa trên profit_percent hiện tại của variant
                newPriceCalculated = calculateNewPrice(
                  baseCostForCalculation,
                  variant.profit_percent, // Dùng profit_percent hiện tại
                  'charm_vnd_990' // Hoặc giá trị mặc định/từ prop
                );
              }


              const displayImageUrl = (variant.image_url || variant.image || '/path/to/placeholder-image.jpg'); // Placeholder

              return (
                <tr key={variant.id} className="hover:bg-gray-50 h-14">
                  <td className="py-3 px-4 border-b border-gray-200">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-blue-600 rounded"
                      checked={selectedVariantIds.has(variant.id)}
                      onChange={() => toggleSelectVariant(variant.id)}
                    />
                  </td>
                  <td className="py-3 px-4 border-b border-gray-200 overflow-hidden">
                    {variant.image || variant.image_url ? (
                      <Image
                        src={displayImageUrl}
                        alt={variant.sku} width={50} height={50} className="rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                        No Img
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 border-b border-gray-200 overflow-hidden whitespace-nowrap text-ellipsis">
                    <p className="font-medium text-gray-900">{variant.full_name}</p>
                    <p className="text-sm text-gray-600">{variant.sku}</p>
                  </td>
                  <td className="py-3 px-4 border-b border-gray-200 font-semibold text-gray-800 overflow-hidden whitespace-nowrap text-ellipsis">
                    {formatCurrency(variant.price)}
                  </td>

                  {/* CỘT NGUỒN GIÁ MUA (FIFO) */}
                  <td className="py-3 px-4 border-b border-gray-200">
                    {variant.variant_from_suppliers && variant.variant_from_suppliers.length > 0 ? (
                      <div className="relative">
                        <select
                          className="block w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                          // Sử dụng selected_supplier_id từ state của component cha để kiểm soát
                          value={variant.selected_supplier_id || ''}
                          onChange={(e) => onSelectDefaultSupplier(variant.id, parseInt(e.target.value))}
                        >
                          <option value="">Chọn nhà cung cấp...</option>
                          {variant.variant_from_suppliers
                            .sort((a, b) => (a.is_default ? -1 : b.is_default ? 1 : 0)) // Ưu tiên default lên đầu
                            .map(vfs => (
                            <option key={vfs.id} value={vfs.id}>
                              {vfs.supplier?.name || 'Không rõ NCC'} - {formatCurrency(vfs.current_purchase_price)}
                              {vfs.is_default ? ' (Mặc định)' : ''}
                              {!vfs.is_active ? ' (Ngừng HĐ)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Chưa có NCC nào</span>
                    )}
                  </td>

                  {/* CỘT GIÁ GỐC ĐƯỢC CHỌN (FIFO) */}
                  <td className="py-3 px-4 border-b border-gray-200 text-gray-600 overflow-hidden whitespace-nowrap text-ellipsis">
                    {formatCurrency(baseCostForCalculation)}
                  </td>

                  <td className="py-3 px-4 border-b border-gray-200 overflow-hidden whitespace-nowrap text-ellipsis">
                    <span className="text-sm text-gray-700">{variant.profit_percent.toFixed(2)}%</span>
                  </td>
                  <td className="py-3 px-4 border-b border-gray-200 overflow-hidden whitespace-nowrap text-ellipsis">
                    <span className="font-bold text-blue-600">
                      {profitPercentInput === '' ? formatCurrency(newPriceCalculated) : formatCurrency(newPriceCalculated)}
                    </span>
                  </td>
                  <td className="py-3 px-4 border-b border-gray-200">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {isActive ? 'Hoạt động' : 'Không hoạt động'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {currentVariants.length > 0 && currentVariants.length < ITEMS_PER_PAGE && (
              Array.from({ length: ITEMS_PER_PAGE - currentVariants.length }).map((_, index) => (
                <tr key={`placeholder-${index}`} className="h-14">
                  <td colSpan={9} className="py-3 px-4 border-b border-gray-200 text-center text-gray-300">
                    {/* Hàng trống */}
                  </td>
                </tr>
              ))
            )}
            {currentVariants.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-gray-500">
                  Không tìm thấy sản phẩm nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tiếp
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Hiển thị <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> đến{' '}
                <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredVariants.length)}</span> của{' '}
                <span className="font-medium">{filteredVariants.length}</span> kết quả
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Trước</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 010 1.06L9.06 10l3.73 3.71a.75.75 0 11-1.06 1.06l-4.25-4.25a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0z" clipRule="evenodd" />
                  </svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    onClick={() => goToPage(pageNumber)}
                    aria-current={currentPage === pageNumber ? 'page' : undefined}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold
                      ${currentPage === pageNumber
                        ? 'bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                      }`}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Tiếp</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 010-1.06L10.94 10 7.21 6.29a.75.75 0 111.06-1.06l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}

// // components/ProductTable.tsx
// import React, { useState, useMemo } from 'react'; // Đảm bảo import useState và useMemo
// import Image from 'next/image';
// import { Variant } from '@/features/variants/api/variantApi';
// import { formatCurrency } from '@/lib/utils';
// import { calculateNewPrice } from '@/lib/utils';

// interface ProductTableProps {
//   filteredVariants: Variant[];
//   selectedVariantIds: Set<number>;
//   isAllSelected: boolean;
//   toggleSelectAll: () => void;
//   toggleSelectVariant: (id: number) => void;
//   profitPercentInput: string;
// }

// const ITEMS_PER_PAGE = 10; // Số lượng mục trên mỗi trang

// export default function ProductTable({
//   filteredVariants,
//   selectedVariantIds,
//   isAllSelected,
//   toggleSelectAll,
//   toggleSelectVariant,
//   profitPercentInput,
// }: ProductTableProps) {
//   const [currentPage, setCurrentPage] = useState(1); // State quản lý trang hiện tại

//   // Tính toán tổng số trang dựa trên filteredVariants (đã được lọc từ component cha)
//   const totalPages = Math.ceil(filteredVariants.length / ITEMS_PER_PAGE);

//   // Sử dụng useMemo để chỉ lấy các variant của trang hiện tại
//   const currentVariants = useMemo(() => {
//     const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
//     const endIndex = startIndex + ITEMS_PER_PAGE;
//     return filteredVariants.slice(startIndex, endIndex);
//   }, [filteredVariants, currentPage]); // Dependency là filteredVariants và currentPage

//   // Hàm chuyển đến trang trước
//   const goToPreviousPage = () => {
//     setCurrentPage((prev) => Math.max(prev - 1, 1));
//   };

//   // Hàm chuyển đến trang kế tiếp
//   const goToNextPage = () => {
//     setCurrentPage((prev) => Math.min(prev + 1, totalPages));
//   };

//   // Hàm chuyển đến một trang cụ thể
//   const goToPage = (pageNumber: number) => {
//     setCurrentPage(pageNumber);
//   };

//   // Tính toán chiều cao cho div chứa bảng để có thanh cuộn
//   // Chiều cao của một hàng là h-14, tương đương 3.5rem (56px)
//   // Chiều cao của thead khoảng 3.5rem (padding py-3)
//   const HEADER_HEIGHT_REM = 3.5;
//   const ROW_HEIGHT_REM = 3.5;
//   const maxBodyHeightCalc = `${ITEMS_PER_PAGE * ROW_HEIGHT_REM}rem`;
//   const totalMaxHeightCalc = `calc(${maxBodyHeightCalc} + ${HEADER_HEIGHT_REM}rem)`;

//   return (
//     <div className="overflow-x-auto">
//       {/* Div bao bọc bảng để tạo scrollbar dọc và giữ thead sticky */}
//       {/* max-height được tính toán để chứa vừa đủ 10 hàng và header */}
//       <div className="relative overflow-y-auto" style={{ maxHeight: totalMaxHeightCalc }}>
//         <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg table-fixed">
//           {/* thead với sticky top-0 và z-index cao để che phủ nội dung tbody khi cuộn */}
//           <thead className="bg-gray-100 sticky top-0 z-20"> {/* Tăng z-index để đảm bảo che phủ */}
//             <tr>
//               {/* Cố định chiều rộng của các cột */}
//               <th className="w-12 py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
//                 <input
//                   type="checkbox"
//                   className="form-checkbox h-4 w-4 text-blue-600 rounded"
//                   checked={isAllSelected}
//                   onChange={toggleSelectAll}
//                 />
//               </th>
//               <th className="w-20 py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">Hình ảnh</th>
//               <th className="w-64 py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">Tên sản phẩm / SKU</th>
//               <th className="w-32 py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">Giá hiện tại</th>
//               <th className="w-32 py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">Giá gốc (Cost)</th>
//               <th className="w-24 py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">Lợi nhuận (%)</th>
//               <th className="w-32 py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">Giá mới</th>
//               <th className="w-32 py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">Trạng thái</th>
//             </tr>
//           </thead>
//           <tbody>
//             {currentVariants.map((variant) => {
//               const isActive = variant.status === 1;

//               let newPriceCalculated: number = variant.price;

//               const parsedProfitPercent = parseFloat(profitPercentInput);

//               const baseCostForCalculation = (variant.average_cost !== undefined && variant.average_cost !== null && variant.average_cost > 0)
//                 ? variant.average_cost
//                 : variant.price;

//               if (!isNaN(parsedProfitPercent) && parsedProfitPercent >= 0) {
//                 newPriceCalculated = calculateNewPrice(
//                   baseCostForCalculation,
//                   parsedProfitPercent,
//                   'charm_vnd_990'
//                 );
//               }

//               const displayImageUrl = (variant.image_url || variant.image || '/path/to/placeholder-image.jpg');
//               return (
//                 <tr key={variant.id} className="hover:bg-gray-50 h-14"> {/* Cố định chiều cao hàng */}
//                   <td className="py-3 px-4 border-b border-gray-200">
//                     <input
//                       type="checkbox"
//                       className="form-checkbox h-4 w-4 text-blue-600 rounded"
//                       checked={selectedVariantIds.has(variant.id)}
//                       onChange={() => toggleSelectVariant(variant.id)}
//                     />
//                   </td>
//                   <td className="py-3 px-4 border-b border-gray-200 overflow-hidden"> {/* Đảm bảo hình ảnh không tràn */}
//                     {variant.image ? (
//                       <Image
//                         src={displayImageUrl}
//                         alt={variant.sku} width={50} height={50} className="rounded object-cover" />
//                     ) : (
//                       <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
//                         No Img
//                       </div>
//                     )}
//                   </td>
//                   <td className="py-3 px-4 border-b border-gray-200 overflow-hidden whitespace-nowrap text-ellipsis"> {/* Cắt bớt văn bản nếu tràn */}
//                     <p className="font-medium text-gray-900">{variant.full_name}</p>
//                     <p className="text-sm text-gray-600">{variant.sku}</p>
//                   </td>
//                   <td className="py-3 px-4 border-b border-gray-200 font-semibold text-gray-800 overflow-hidden whitespace-nowrap text-ellipsis">
//                     {formatCurrency(variant.price)}
//                   </td>
//                   <td className="py-3 px-4 border-b border-gray-200 text-gray-600 overflow-hidden whitespace-nowrap text-ellipsis">
//                     {formatCurrency(variant.average_cost)}
//                   </td>
//                   <td className="py-3 px-4 border-b border-gray-200 overflow-hidden whitespace-nowrap text-ellipsis">
//                     <span className="text-sm text-gray-700">{variant.profit_percent.toFixed(2)}%</span>
//                   </td>
//                   <td className="py-3 px-4 border-b border-gray-200 overflow-hidden whitespace-nowrap text-ellipsis">
//                     <span className="font-bold text-blue-600">
//                       {profitPercentInput === '' ? formatCurrency(variant.price) : formatCurrency(newPriceCalculated)}
//                     </span>
//                   </td>
//                   <td className="py-3 px-4 border-b border-gray-200">
//                     <span
//                       className={`px-2 py-1 rounded-full text-xs font-semibold ${
//                         isActive
//                           ? 'bg-green-100 text-green-800'
//                           : 'bg-red-100 text-red-800'
//                       }`}
//                     >
//                       {isActive ? 'Hoạt động' : 'Không hoạt động'}
//                     </span>
//                   </td>
//                 </tr>
//               );
//             })}
//             {/* Các hàng giữ chỗ để đảm bảo chiều cao bảng luôn hiển thị 10 hàng, tránh nhảy layout */}
//             {currentVariants.length > 0 && currentVariants.length < ITEMS_PER_PAGE && (
//               Array.from({ length: ITEMS_PER_PAGE - currentVariants.length }).map((_, index) => (
//                 <tr key={`placeholder-${index}`} className="h-14"> {/* Chiều cao cố định */}
//                   <td colSpan={8} className="py-3 px-4 border-b border-gray-200 text-center text-gray-300">
//                     {/* Hàng trống */}
//                   </td>
//                 </tr>
//               ))
//             )}
//             {/* Thông báo khi không có sản phẩm nào được tìm thấy trên trang hiện tại */}
//             {currentVariants.length === 0 && (
//               <tr>
//                 <td colSpan={8} className="py-8 text-center text-gray-500">
//                   Không tìm thấy sản phẩm nào.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Pagination Controls - Chỉ hiển thị khi có nhiều hơn 1 trang */}
//       {totalPages > 1 && (
//         <nav className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
//           <div className="flex flex-1 justify-between sm:hidden">
//             <button
//               onClick={goToPreviousPage}
//               disabled={currentPage === 1}
//               className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               Trước
//             </button>
//             <button
//               onClick={goToNextPage}
//               disabled={currentPage === totalPages}
//               className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               Tiếp
//             </button>
//           </div>
//           <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
//             <div>
//               <p className="text-sm text-gray-700">
//                 Hiển thị <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> đến{' '}
//                 <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredVariants.length)}</span> của{' '}
//                 <span className="font-medium">{filteredVariants.length}</span> kết quả
//               </p>
//             </div>
//             <div>
//               <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
//                 <button
//                   onClick={goToPreviousPage}
//                   disabled={currentPage === 1}
//                   className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   <span className="sr-only">Trước</span>
//                   <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
//                     <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 010 1.06L9.06 10l3.73 3.71a.75.75 0 11-1.06 1.06l-4.25-4.25a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0z" clipRule="evenodd" />
//                   </svg>
//                 </button>
//                 {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
//                   <button
//                     key={pageNumber}
//                     onClick={() => goToPage(pageNumber)}
//                     aria-current={currentPage === pageNumber ? 'page' : undefined}
//                     className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold
//                       ${currentPage === pageNumber
//                         ? 'bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
//                         : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
//                       }`}
//                   >
//                     {pageNumber}
//                   </button>
//                 ))}
//                 <button
//                   onClick={goToNextPage}
//                   disabled={currentPage === totalPages}
//                   className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   <span className="sr-only">Tiếp</span>
//                   <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
//                     <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 010-1.06L10.94 10 7.21 6.29a.75.75 0 111.06-1.06l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0z" clipRule="evenodd" />
//                   </svg>
//                 </button>
//               </nav>
//             </div>
//           </div>
//         </nav>
//       )}
//     </div>
//   );
// }
