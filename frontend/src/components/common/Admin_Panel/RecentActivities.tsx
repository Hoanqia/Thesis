
// // frontend\src\components\common\Admin_Panel\RecentActivities.tsx
// import { LuArrowDownLeft, LuArrowUpRight } from 'react-icons/lu';
// import React from 'react';
// import { RecentActivity as ActivityInterface } from '@/features/statistics/api/statisticApi'; // Import từ statisticApi.ts

// // Định nghĩa kiểu cho một hoạt động (sử dụng interface từ statisticApi)
// export interface Activity extends ActivityInterface {}

// interface RecentActivitiesProps {
//   activities: Activity[];
// }

// export default function RecentActivities({ activities }: RecentActivitiesProps) {
//   return (
//     <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
//       <h2 className="text-xl font-semibold mb-4">Hoạt Động Gần Đây</h2>
//       {activities.length === 0 ? (
//         <p className="text-gray-500">Chưa có hoạt động nào gần đây.</p>
//       ) : (
//         <ul className="space-y-3">
//           {activities.map((activity) => (
//             // id từ backend có thể là string (ví dụ: 'grn_123'), nên key cần là string
//             <li key={activity.id} className="flex items-start">
//               {activity.type === 'import' ? (
//                 <LuArrowDownLeft className="text-green-500 text-lg mr-3 mt-1" />
//               ) : (
//                 <LuArrowUpRight className="text-blue-500 text-lg mr-3 mt-1" />
//               )}
//               <div className="flex-grow">
//                 <p className="text-gray-800">
//                   <span className="font-medium">{activity.user}</span> đã{' '}
//                   <span className="font-semibold">
//                     {activity.type === 'import' ? 'nhập' : 'xuất'}
//                   </span>{' '}
//                   {activity.quantity} {activity.unit || 'sản phẩm'} **{activity.productName}**
//                 </p>
//                 <p className="text-xs text-gray-500 mt-0.5">{activity.timeAgo}</p>
//               </div>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// }
// frontend\src\components\common\Admin_Panel\RecentActivities.tsx
import { LuArrowDownLeft, LuArrowUpRight } from 'react-icons/lu';
import React from 'react';
import { RecentActivity as ActivityInterface, PaginatedData } from '@/features/statistics/api/statisticApi';

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

// Định nghĩa kiểu cho một hoạt động (sử dụng interface từ statisticApi)
export interface Activity extends ActivityInterface {}

interface RecentActivitiesProps {
  activities: Activity[];
  paginationData: PaginatedData<ActivityInterface>; // Nhận toàn bộ dữ liệu phân trang từ API
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

export default function RecentActivities({ activities, paginationData, onPageChange }: RecentActivitiesProps) {
  const { current_page, last_page } = paginationData;
  const pageNumbers = generatePageNumbers(current_page, last_page);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
      <h2 className="text-xl font-semibold mb-4">Hoạt Động Gần Đây</h2>
      {activities.length === 0 ? (
        <p className="text-gray-500">Chưa có hoạt động nào gần đây.</p>
      ) : (
        <>
          <ul className="space-y-3 mb-4">
            {activities.map((activity) => (
              <li key={activity.id} className="flex items-start">
                {activity.type === 'import' ? (
                  <LuArrowDownLeft className="text-green-500 text-lg mr-3 mt-1" />
                ) : (
                  <LuArrowUpRight className="text-blue-500 text-lg mr-3 mt-1" />
                )}
                <div className="flex-grow">
                  <p className="text-gray-800">
                    <span className="font-medium">{activity.user}</span> đã{' '}
                    <span className="font-semibold">
                      {activity.type === 'import' ? 'nhập' : 'xuất'}
                    </span>{' '}
                    {activity.quantity} {activity.unit || 'sản phẩm'} **{activity.productName}**
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{activity.timeAgo}</p>
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