// // components/TopSellingProducts.tsx
// import React from 'react';

// // Định nghĩa kiểu cho một sản phẩm bán chạy
// export interface Product {
//   id: number;
//   name: string;
//   quantity: number;
//   revenue: number;
// }

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

import React from 'react';
import { TopSellingProduct as ProductInterface } from '@/features/statistics/api/statisticApi'; // Import từ statisticApi.ts

// Định nghĩa kiểu cho một sản phẩm bán chạy (sử dụng interface từ statisticApi)
export interface Product extends ProductInterface {}

interface TopSellingProductsProps {
  products: Product[];
}

export default function TopSellingProducts({ products }: TopSellingProductsProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Sản Phẩm Bán Chạy Nhất</h2>
      {products.length === 0 ? (
        <p className="text-gray-500">Chưa có dữ liệu sản phẩm bán chạy.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {products.map((product) => (
            <li key={product.id} className="py-3 flex justify-between items-center">
              <span className="font-medium text-gray-800">{product.name}</span>
              <span className="text-gray-600">
                {product.quantity} đã bán ({product.revenue.toLocaleString('vi-VN')} VNĐ)
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
