
// // frontend\src\components\common\Admin_Panel\TopSellingProducts.tsx
// import React from 'react';
// import { TopSellingProduct as ProductInterface } from '@/features/statistics/api/statisticApi'; // Import từ statisticApi.ts

// // Định nghĩa kiểu cho một sản phẩm bán chạy (sử dụng interface từ statisticApi)
// export interface Product extends ProductInterface {}

// interface TopSellingProductsProps {
//   products: Product[];
// }

// export default function TopSellingProducts({ products }: TopSellingProductsProps) {
//   return (
//     <div className="bg-white p-6 rounded-lg shadow-md">
//       <h2 className="text-xl font-semibold mb-4">Sản Phẩm Bán Chạy Nhất</h2>
//       {products.length === 0 ? (
//         <p className="text-gray-500">Chưa có dữ liệu sản phẩm bán chạy.</p>
//       ) : (
//         <ul className="divide-y divide-gray-200">
//           {products.map((product) => (
//             <li key={product.id} className="py-3 flex justify-between items-center">
//               <span className="font-medium text-gray-800">{product.name}</span>
//               <span className="text-gray-600">
//                 {product.quantity} đã bán ({product.revenue.toLocaleString('vi-VN')} VNĐ)
//               </span>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// }
// frontend\src\components\common\Admin_Panel\TopSellingProducts.tsx
import React from 'react';
import { TopSellingProduct as ProductInterface, PaginatedData } from '@/features/statistics/api/statisticApi';

// Import các component phân trang từ shadcn/ui
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Định nghĩa kiểu cho một sản phẩm bán chạy (sử dụng interface từ statisticApi)
export interface Product extends ProductInterface {}

interface TopSellingProductsProps {
  products: Product[];
  paginationData: PaginatedData<ProductInterface>; // Nhận toàn bộ dữ liệu phân trang từ API
  onPageChange: (page: number) => void;
}

// Hàm để tạo các nút số trang, có xử lý dấu ba chấm
const generatePageNumbers = (currentPage: number, lastPage: number) => {
  const pageNumbers = [];
  const startPage = Math.max(1, currentPage - 1);
  const endPage = Math.min(lastPage, currentPage + 1);

  if (startPage > 1) {
    pageNumbers.push(1);
    if (startPage > 2) {
      pageNumbers.push('ellipsis-start');
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  if (endPage < lastPage) {
    if (endPage < lastPage - 1) {
      pageNumbers.push('ellipsis-end');
    }
    pageNumbers.push(lastPage);
  }

  return pageNumbers;
};

export default function TopSellingProducts({ products, paginationData, onPageChange }: TopSellingProductsProps) {
  const { current_page, last_page } = paginationData;
  const pageNumbers = generatePageNumbers(current_page, last_page);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Sản Phẩm Bán Chạy Nhất</h2>
      {products.length === 0 ? (
        <p className="text-gray-500">Chưa có dữ liệu sản phẩm bán chạy.</p>
      ) : (
        <>
          <ul className="divide-y divide-gray-200 mb-4">
            {products.map((product) => (
              <li key={product.id} className="py-3 flex justify-between items-center">
                <span className="font-medium text-gray-800">{product.name}</span>
                <span className="text-gray-600">
                  {product.quantity} đã bán ({product.revenue.toLocaleString('vi-VN')} VNĐ)
                </span>
              </li>
            ))}
          </ul>

          {/* Tích hợp component phân trang của shadcn/ui */}
          {last_page > 1 && (
            <Pagination>
              <PaginationContent>
                {/* Nút Previous */}
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => onPageChange(current_page - 1)}
                    aria-disabled={current_page === 1}
                    tabIndex={current_page === 1 ? -1 : undefined}
                    className={current_page === 1 ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>

                {/* Các nút số trang và dấu ba chấm */}
                {pageNumbers.map((pageNumber, index) => (
                  <PaginationItem key={index}>
                    {typeof pageNumber === 'string' && pageNumber.startsWith('ellipsis') ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        onClick={() => onPageChange(pageNumber as number)}
                        isActive={pageNumber === current_page}
                      >
                        {pageNumber}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                {/* Nút Next */}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => onPageChange(current_page + 1)}
                    aria-disabled={current_page === last_page}
                    tabIndex={current_page === last_page ? -1 : undefined}
                    className={current_page === last_page ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}