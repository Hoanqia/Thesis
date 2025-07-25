// // components/HeroStatsCard.tsx
// import { LuPackage, LuDollarSign, LuShoppingCart, LuTriangleAlert  } from 'react-icons/lu';
// import React from 'react';

// // Định nghĩa kiểu cho các props của component
// interface HeroStatsCardProps {
//   title: string;
//   value: string;
//   type: 'inventory' | 'revenue' | 'orders' | 'alert'; // Đặt kiểu cụ thể cho 'type'
//   trend?: string | null; // trend có thể là string hoặc null/undefined
// }

// // Map các loại icon
// const icons = {
//   inventory: LuPackage,
//   revenue: LuDollarSign,
//   orders: LuShoppingCart,
//   alert: LuTriangleAlert ,
// };

// export default function HeroStatsCard({ title, value, type, trend = null }: HeroStatsCardProps) {
//   const Icon = icons[type] || LuPackage; // Icon mặc định nếu type không khớp

//   return (
//     <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
//       <div>
//         <h3 className="text-sm font-medium text-gray-500">{title}</h3>
//         <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
//         {trend && (
//           <p className={`text-xs mt-1 ${trend.includes('+') ? 'text-green-500' : 'text-red-500'}`}>
//             {trend} so với hôm qua
//           </p>
//         )}
//       </div>
//       <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
//         <Icon className="w-6 h-6" />
//       </div>
//     </div>
//   );
// }


import { LuPackage, LuDollarSign, LuShoppingCart, LuTriangleAlert  } from 'react-icons/lu';
import React from 'react';

// Định nghĩa kiểu cho các props của component
interface HeroStatsCardProps {
  title: string;
  value: string; // Giá trị có thể đã được format sẵn từ backend
  type: 'inventory' | 'revenue' | 'orders' | 'alert'; // Đặt kiểu cụ thể cho 'type'
  trend?: string | null; // trend có thể là string hoặc null/undefined
}

// Map các loại icon
const icons = {
  inventory: LuPackage,
  revenue: LuDollarSign,
  orders: LuShoppingCart,
  alert: LuTriangleAlert ,
};

export default function HeroStatsCard({ title, value, type, trend = null }: HeroStatsCardProps) {
  const Icon = icons[type] || LuPackage; // Icon mặc định nếu type không khớp

  return (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
      <div>
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {trend && (
          <p className={`text-xs mt-1 ${trend.includes('+') ? 'text-green-500' : 'text-red-500'}`}>
            {trend} so với hôm qua
          </p>
        )}
      </div>
      <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}
