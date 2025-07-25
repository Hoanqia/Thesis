// // components/LowStockAlerts.tsx
// import { LuTriangleAlert } from 'react-icons/lu';
// import React from 'react';

// // Định nghĩa kiểu cho một cảnh báo tồn kho
// export interface StockAlert {
//   id: number;
//   productName: string;
//   currentStock: number;
//   type: 'low_stock' | 'expired_soon'; // Loại cảnh báo
//   threshold?: number; // Ngưỡng chỉ có khi là 'low_stock'
//   expiryDate?: string; // Ngày hết hạn chỉ có khi là 'expired_soon'
//   unit?: string; // Đơn vị tính (vd: "chai", "kg")
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
//             <li key={alert.id} className="py-3 flex items-center">
//               <LuTriangleAlert  className="text-red-500 mr-2 flex-shrink-0" />
//               <div className="flex-grow">
//                 <p className="font-medium text-gray-800">{alert.productName}</p>
//                 <p className="text-sm text-gray-600">
//                   Còn: {alert.currentStock} {alert.unit || 'sản phẩm'}{' '}
//                   {alert.type === 'low_stock'
//                     ? `(Ngưỡng: ${alert.threshold})`
//                     : `(Hết hạn: ${alert.expiryDate})`}
//                 </p>
//               </div>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// }

import { LuTriangleAlert } from 'react-icons/lu';
import React from 'react';
import { StockAlert as StockAlertInterface } from '@/features/statistics/api/statisticApi'; // Import từ statisticApi.ts

// Định nghĩa kiểu cho một cảnh báo tồn kho (sử dụng interface từ statisticApi)
export interface StockAlert extends StockAlertInterface {
  // Thêm expiryDate và unit nếu chúng không có trong StockAlertInterface
  // hoặc đảm bảo StockAlertInterface trong statisticApi.ts đã bao gồm chúng.
  // Dựa trên PHP service, expiryDate hiện không có trong API cho stock alerts.
  // Tôi sẽ giữ nó là optional ở đây.
  expiryDate?: string; 
}

interface LowStockAlertsProps {
  alerts: StockAlert[];
}

export default function LowStockAlerts({ alerts }: LowStockAlertsProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Cảnh Báo Tồn Kho</h2>
      {alerts.length === 0 ? (
        <p className="text-gray-500">Không có cảnh báo tồn kho nào.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {alerts.map((alert) => (
            // id từ backend có thể là string (ví dụ: 'low_123'), nên key cần là string
            <li key={alert.id} className="py-3 flex items-center">
              <LuTriangleAlert  className="text-red-500 mr-2 flex-shrink-0" />
              <div className="flex-grow">
                <p className="font-medium text-gray-800">{alert.productName}</p>
                <p className="text-sm text-gray-600">
                  Còn: {alert.currentStock} {alert.unit || 'sản phẩm'}{' '}
                  {alert.type === 'low_stock'
                    ? `(Ngưỡng: ${alert.threshold})`
                    : alert.expiryDate ? `(Hết hạn: ${alert.expiryDate})` : '' // Chỉ hiển thị nếu có expiryDate
                  }
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
