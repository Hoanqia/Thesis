
// // frontend\src\components\common\Admin_Panel\LowStockAlerts.tsx
// import { LuTriangleAlert } from 'react-icons/lu';
// import React from 'react';
// import { StockAlert as StockAlertInterface } from '@/features/statistics/api/statisticApi'; // Import từ statisticApi.ts

// // Định nghĩa kiểu cho một cảnh báo tồn kho (sử dụng interface từ statisticApi)
// export interface StockAlert extends StockAlertInterface {
//   // Thêm expiryDate và unit nếu chúng không có trong StockAlertInterface
//   // hoặc đảm bảo StockAlertInterface trong statisticApi.ts đã bao gồm chúng.
//   // Dựa trên PHP service, expiryDate hiện không có trong API cho stock alerts.
//   // Tôi sẽ giữ nó là optional ở đây.
//   expiryDate?: string; 
// }

// interface LowStockAlertsProps {
//   alerts: StockAlert[];
// }

// export default function LowStockAlerts({ alerts }: LowStockAlertsProps) {
//   return (
//     <div className="bg-white p-6 rounded-lg shadow-md">
//       <h2 className="text-xl font-semibold mb-4">Cảnh Báo Tồn Kho</h2>
//       {alerts.length === 0 ? (
//         <p className="text-gray-500">Không có cảnh báo tồn kho nào.</p>
//       ) : (
//         <ul className="divide-y divide-gray-200">
//           {alerts.map((alert) => (
//             // id từ backend có thể là string (ví dụ: 'low_123'), nên key cần là string
//             <li key={alert.id} className="py-3 flex items-center">
//               <LuTriangleAlert  className="text-red-500 mr-2 flex-shrink-0" />
//               <div className="flex-grow">
//                 <p className="font-medium text-gray-800">{alert.productName}</p>
//                 <p className="text-sm text-gray-600">
//                   Còn: {alert.currentStock} {alert.unit || 'sản phẩm'}{' '}
//                   {alert.type === 'low_stock'
//                     ? `(Ngưỡng: ${alert.threshold})`
//                     : alert.expiryDate ? `(Hết hạn: ${alert.expiryDate})` : '' // Chỉ hiển thị nếu có expiryDate
//                   }
//                 </p>
//               </div>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// }
// frontend\src\components\common\Admin_Panel\LowStockAlerts.tsx
import { LuTriangleAlert } from 'react-icons/lu';
import React from 'react';
import { StockAlert as StockAlertInterface, PaginatedData } from '@/features/statistics/api/statisticApi';

// Import component phân trang từ shadcn/ui
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Định nghĩa kiểu cho một cảnh báo tồn kho (sử dụng interface từ statisticApi)
export interface StockAlert extends StockAlertInterface {
  expiryDate?: string;
}

interface LowStockAlertsProps {
  alerts: StockAlert[];
  paginationData: PaginatedData<StockAlertInterface>; // Nhận toàn bộ dữ liệu phân trang từ API
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

export default function LowStockAlerts({ alerts, paginationData, onPageChange }: LowStockAlertsProps) {
  const { current_page, last_page } = paginationData;
  const pageNumbers = generatePageNumbers(current_page, last_page);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Cảnh Báo Tồn Kho</h2>
      {alerts.length === 0 ? (
        <p className="text-gray-500">Không có cảnh báo tồn kho nào.</p>
      ) : (
        <>
          <ul className="divide-y divide-gray-200 mb-4">
            {alerts.map((alert) => (
              <li key={alert.id} className="py-3 flex items-center">
                <LuTriangleAlert className="text-red-500 mr-2 flex-shrink-0" />
                <div className="flex-grow">
                  <p className="font-medium text-gray-800">{alert.productName}</p>
                  <p className="text-sm text-gray-600">
                    Còn: {alert.currentStock} {alert.unit || 'sản phẩm'}{' '}
                    {alert.type === 'low_stock'
                      ? `(Ngưỡng: ${alert.threshold})`
                      : alert.expiryDate ? `(Hết hạn: ${alert.expiryDate})` : ''
                    }
                  </p>
                </div>
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