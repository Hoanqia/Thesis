// components/ProductTable.tsx
import React from 'react';
import Image from 'next/image';
import { Variant } from '@/features/variants/api/variantApi';
import { formatCurrency } from '@/lib/utils';
import { calculateNewPrice } from '@/lib/utils'; // <-- IMPORT HÀM MỚI Ở ĐÂY

interface ProductTableProps {
  filteredVariants: Variant[];
  selectedVariantIds: Set<number>;
  isAllSelected: boolean;
  toggleSelectAll: () => void;
  toggleSelectVariant: (id: number) => void;
  profitPercentInput: string;
}

export default function ProductTable({
  filteredVariants,
  selectedVariantIds,
  isAllSelected,
  toggleSelectAll,
  toggleSelectVariant,
  profitPercentInput,
}: ProductTableProps) {

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                className="form-checkbox h-4 w-4 text-blue-600 rounded"
                checked={isAllSelected}
                onChange={toggleSelectAll}
              />
            </th>
            <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-700">Hình ảnh</th>
            <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-700">Tên sản phẩm / SKU</th>
            <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-700">Giá hiện tại</th>
            <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-700">Giá gốc (Cost)</th>
            <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-700">Lợi nhuận (%)</th>
            <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-700">Giá mới</th>
            <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-700">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {filteredVariants.map((variant) => {
            const isActive = variant.status === 1;

            let newPriceCalculated: number = variant.price; // Mặc định là giá hiện tại

            const parsedProfitPercent = parseFloat(profitPercentInput);

            // Xác định giá gốc cho tính toán. Ưu tiên average_cost nếu hợp lệ và > 0, nếu không dùng price.
            const baseCostForCalculation = (variant.average_cost !== undefined && variant.average_cost !== null && variant.average_cost > 0)
                                          ? variant.average_cost
                                          : variant.price; // Fallback to current price if average_cost is not valid/zero

            // Chỉ tính toán lại giá mới nếu profitPercentInput là một số hợp lệ và >= 0
            if (!isNaN(parsedProfitPercent) && parsedProfitPercent >= 0) {
              // GỌI HÀM calculateNewPrice ĐÃ CUNG CẤP
              newPriceCalculated = calculateNewPrice(
                baseCostForCalculation, // Dùng baseCostForCalculation làm đầu vào averageCost
                parsedProfitPercent,
                'charm_vnd_990' // Hoặc 'none' tùy theo chiến lược mặc định của bạn
              );
            }
            // else: newPriceCalculated giữ nguyên giá trị mặc định là variant.price
            // Điều này giải quyết vấn đề "chưa nhập thì nó hiện giá giống giá hiện tại"
              const displayImageUrl = (variant.image_url || variant.image || '/path/to/placeholder-image.jpg');
            return (
              <tr key={variant.id} className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-600 rounded"
                    checked={selectedVariantIds.has(variant.id)}
                    onChange={() => toggleSelectVariant(variant.id)}
                  />
                </td>
                <td className="py-3 px-4 border-b">
                  {variant.image ? (
                    <Image
                      src={displayImageUrl}
                      alt={variant.sku} width={50} height={50} className="rounded object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                      No Img
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 border-b">
                  <p className="font-medium text-gray-900">{variant.full_name}</p>
                  <p className="text-sm text-gray-600">{variant.sku}</p>
                </td>
                <td className="py-3 px-4 border-b font-semibold text-gray-800">
                  {formatCurrency(variant.price)}
                </td>
                <td className="py-3 px-4 border-b text-gray-600">
                  {formatCurrency(variant.average_cost)}
                </td>
                <td className="py-3 px-4 border-b">
                  <span className="text-sm text-gray-700">{variant.profit_percent.toFixed(2)}%</span>
                </td>
                <td className="py-3 px-4 border-b">
                  {/* HIỂN THỊ GIÁ MỚI DỰ KIẾN */}
                  <span className="font-bold text-blue-600">
                    {/* Hiển thị giá mới đã tính hoặc giá hiện tại nếu input rỗng */}
                    {profitPercentInput === '' ? formatCurrency(variant.price) : formatCurrency(newPriceCalculated)}
                  </span>
                </td>
                <td className="py-3 px-4 border-b">
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
          {filteredVariants.length === 0 && (
            <tr>
              <td colSpan={8} className="py-8 text-center text-gray-500">
                Không tìm thấy sản phẩm nào.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}