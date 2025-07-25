// // components/RecentActivities.tsx
// import { LuArrowDownLeft, LuArrowUpRight } from 'react-icons/lu';
// import React from 'react';

// // Định nghĩa kiểu cho một hoạt động
// export interface Activity {
//   id: number;
//   type: 'import' | 'export'; // Loại hoạt động
//   productName: string;
//   quantity: number;
//   user: string;
//   timeAgo: string;
//   unit?: string;
// }

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

import { LuArrowDownLeft, LuArrowUpRight } from 'react-icons/lu';
import React from 'react';
import { RecentActivity as ActivityInterface } from '@/features/statistics/api/statisticApi'; // Import từ statisticApi.ts

// Định nghĩa kiểu cho một hoạt động (sử dụng interface từ statisticApi)
export interface Activity extends ActivityInterface {}

interface RecentActivitiesProps {
  activities: Activity[];
}

export default function RecentActivities({ activities }: RecentActivitiesProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
      <h2 className="text-xl font-semibold mb-4">Hoạt Động Gần Đây</h2>
      {activities.length === 0 ? (
        <p className="text-gray-500">Chưa có hoạt động nào gần đây.</p>
      ) : (
        <ul className="space-y-3">
          {activities.map((activity) => (
            // id từ backend có thể là string (ví dụ: 'grn_123'), nên key cần là string
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
      )}
    </div>
  );
}
