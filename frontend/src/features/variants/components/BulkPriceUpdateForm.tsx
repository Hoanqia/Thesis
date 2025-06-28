// frontend\src\features\variants\components\PriceManagementForm.tsx (Nội dung giống BulkPriceUpdateForm.tsx của bạn)
import React from 'react';

interface PriceManagementFormProps { // Đổi tên interface
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  handleSearchAndFilter: () => void;
  profitPercentInput: string;
  handleProfitPercentInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSetPricesByTargetProfit: () => Promise<void>; // Hàm mới cho nút "Cập nhật giá cho X sản phẩm"
  handleRecalculatePricesByCurrentCost: () => Promise<void>; // Hàm mới cho nút "Cập nhật giá bán theo giá gốc mới"

  selectedVariantCount: number;
  categories: string[];
  selectedPsychologicalStrategy: string;
  setSelectedPsychologicalStrategy: (strategy: string) => void;
  loadingUpdate: boolean;

}

export default function PriceManagementForm({ // Đổi tên component
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  handleSearchAndFilter,
  profitPercentInput,
  handleProfitPercentInputChange,
  handleSetPricesByTargetProfit,
  handleRecalculatePricesByCurrentCost,
  selectedVariantCount,
  categories,
  selectedPsychologicalStrategy,
  setSelectedPsychologicalStrategy,
  loadingUpdate,
}: PriceManagementFormProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Quản lý giá sản phẩm</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700">Tìm kiếm sản phẩm</label>
          <input
            type="text"
            id="search"
            placeholder="Tên sản phẩm, SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">Lọc theo danh mục</label>
          <select
            id="category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={handleSearchAndFilter}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Tìm kiếm & Lọc
          </button>
        </div>
      </div>

      <form className="flex flex-col sm:flex-row items-end gap-4">
        <div className="flex-1 w-full">
          <label htmlFor="profitPercent" className="block text-sm font-medium text-gray-700">
            Phần trăm lợi nhuận mới (ví dụ: 25.5 cho 25.5%)
          </label>
          <input
            type="number"
            id="profitPercent"
            value={profitPercentInput}
            onChange={handleProfitPercentInputChange}
            step="0.01"
            min="-100"
            placeholder="Nhập % lợi nhuận mới"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div className="flex-1 w-full mt-4 sm:mt-0">
          <label htmlFor="psychologicalStrategy" className="block text-sm font-medium text-gray-700">
            Chiến lược giá tâm lý
          </label>
          <select
            id="psychologicalStrategy"
            value={selectedPsychologicalStrategy}
            onChange={(e) => setSelectedPsychologicalStrategy(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
          >
            <option value="">Không áp dụng</option>
            <option value="charm_vnd_990">Giá lẻ đuôi .990 (VNĐ)</option>
            <option value="charm_99">Giá lẻ đuôi .99 (USD)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleSetPricesByTargetProfit}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={selectedVariantCount === 0 || profitPercentInput === '' || isNaN(parseFloat(profitPercentInput)) || loadingUpdate}
        >
          Cập nhật giá cho {selectedVariantCount} sản phẩm
        </button>

        <button
          type="button"
          onClick={handleRecalculatePricesByCurrentCost}
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={selectedVariantCount === 0 || loadingUpdate}
        >
          Cập nhật giá bán theo giá gốc mới ({selectedVariantCount})
        </button>
      </form>
    </div>
  );
}
// // components/BulkPriceUpdateForm.tsx
// import React from 'react';

// interface BulkPriceUpdateFormProps {
//   searchTerm: string;
//   setSearchTerm: (term: string) => void;
//   selectedCategory: string;
//   setSelectedCategory: (category: string) => void;
//   handleSearchAndFilter: () => void;
//   profitPercentInput: string;
//   handleProfitPercentInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
//   // Thay đổi: Các hàm xử lý nút này sẽ được truyền từ component cha (ProductManagementPage.tsx)
//   // và chúng sẽ gọi các API mới.
//   handleSetPricesByTargetProfit: (psychologicalStrategy?: string) => Promise<void>; // Hàm mới cho nút "Cập nhật giá cho X sản phẩm"
//   handleRecalculatePricesByCurrentCost: (psychologicalStrategy?: string) => Promise<void>; // Hàm mới cho nút "Cập nhật giá bán theo giá gốc mới"

//   selectedVariantCount: number;
//   categories: string[];
//   // Thêm props cho việc chọn chiến lược giá tâm lý
//   selectedPsychologicalStrategy: string;
//   setSelectedPsychologicalStrategy: (strategy: string) => void;
//     loadingUpdate: boolean; // <--- THÊM DÒNG NÀY

// }

// export default function BulkPriceUpdateForm({
//   searchTerm,
//   setSearchTerm,
//   selectedCategory,
//   setSelectedCategory,
//   handleSearchAndFilter,
//   profitPercentInput,
//   handleProfitPercentInputChange,
//   handleSetPricesByTargetProfit, // Đã đổi tên
//   handleRecalculatePricesByCurrentCost, // Đã đổi tên
//   selectedVariantCount,
//   categories,
//   selectedPsychologicalStrategy, // Thêm vào destructuring
//   setSelectedPsychologicalStrategy, // Thêm vào destructuring
//   loadingUpdate,
// }: BulkPriceUpdateFormProps) {
//   return (
//     <div className="bg-white p-6 rounded-lg shadow-md mb-6">
//       <h2 className="text-xl font-semibold text-gray-800 mb-4">Cập nhật giá hàng loạt</h2>

//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//         <div>
//           <label htmlFor="search" className="block text-sm font-medium text-gray-700">Tìm kiếm sản phẩm</label>
//           <input
//             type="text"
//             id="search"
//             placeholder="Tên sản phẩm, SKU..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//           />
//         </div>
//         <div>
//           <label htmlFor="category" className="block text-sm font-medium text-gray-700">Lọc theo danh mục</label>
//           <select
//             id="category"
//             value={selectedCategory}
//             onChange={(e) => setSelectedCategory(e.target.value)}
//             className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//           >
//             <option value="">Tất cả danh mục</option>
//             {categories.map(cat => (
//               <option key={cat} value={cat}>{cat}</option>
//             ))}
//           </select>
//         </div>
//         <div className="flex items-end">
//           <button
//             onClick={handleSearchAndFilter}
//             className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
//           >
//             Tìm kiếm & Lọc
//           </button>
//         </div>
//       </div>

//       <form className="flex flex-col sm:flex-row items-end gap-4"> {/* Removed onSubmit for form, buttons handle directly */}
//         <div className="flex-1 w-full">
//           <label htmlFor="profitPercent" className="block text-sm font-medium text-gray-700">
//             Phần trăm lợi nhuận mới (ví dụ: 25.5 cho 25.5%)
//           </label>
//           <input
//             type="number"
//             id="profitPercent"
//             value={profitPercentInput}
//             onChange={handleProfitPercentInputChange}
//             step="0.01"
//             min="-100" // Cho phép lợi nhuận âm
//             placeholder="Nhập % lợi nhuận mới"
//             className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//           />
//         </div>

//         {/* THÊM DROPDOWN CHỌN CHIẾN LƯỢC GIÁ TÂM LÝ */}
//         <div className="flex-1 w-full mt-4 sm:mt-0">
//           <label htmlFor="psychologicalStrategy" className="block text-sm font-medium text-gray-700">
//             Chiến lược giá tâm lý
//           </label>
//           <select
//             id="psychologicalStrategy"
//             value={selectedPsychologicalStrategy}
//             onChange={(e) => setSelectedPsychologicalStrategy(e.target.value)}
//             className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
//           >
//             <option value="">Không áp dụng</option>
//             <option value="charm_vnd_990">Giá lẻ đuôi .990 (VNĐ)</option>
//             <option value="charm_99">Giá lẻ đuôi .99 (USD)</option>
//             {/* Thêm các option khác nếu bạn có thêm chiến lược */}
//           </select>
//         </div>

//         <button
//           type="button" // Changed to type="button" since form onSubmit is removed
//           onClick={() => handleSetPricesByTargetProfit(selectedPsychologicalStrategy)} // Gọi API setPricesByTargetProfit
//           className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
//           disabled={selectedVariantCount === 0 || profitPercentInput === '' || isNaN(parseFloat(profitPercentInput))}
//         >
//           Cập nhật giá cho {selectedVariantCount} sản phẩm
//         </button>

//         <button
//           type="button" // Changed to type="button"
//           onClick={() => handleRecalculatePricesByCurrentCost(selectedPsychologicalStrategy)} // Gọi API recalculatePricesByCurrentCost
//           className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
//           disabled={selectedVariantCount === 0}
//         >
//           Cập nhật giá bán theo giá gốc mới ({selectedVariantCount})
//         </button>
//       </form>
//     </div>
//   );
// }
// // // components/BulkPriceUpdateForm.tsx
// // import React from 'react';

// // interface BulkPriceUpdateFormProps {
// //   searchTerm: string;
// //   setSearchTerm: (term: string) => void;
// //   selectedCategory: string;
// //   setSelectedCategory: (category: string) => void;
// //   handleSearchAndFilter: () => void;
// //   profitPercentInput: string;
// //   handleProfitPercentInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
// //   handleApplyChanges: (e: React.FormEvent) => Promise<void>;
// //   handleUpdatePriceByAverageCost: () => Promise<void>;



// //   selectedVariantCount: number;
// //   categories: string[]; // <-- Thêm prop categories
// // }

// // export default function BulkPriceUpdateForm({
// //   searchTerm,
// //   setSearchTerm,
// //   selectedCategory,
// //   setSelectedCategory,
// //   handleSearchAndFilter,
// //   profitPercentInput,
// //   handleProfitPercentInputChange,
// //   handleApplyChanges,
// //   handleUpdatePriceByAverageCost,
// //   selectedVariantCount,
// //   categories, // <-- Sử dụng prop categories
// // }: BulkPriceUpdateFormProps) {
// //   return (
// //     <div className="bg-white p-6 rounded-lg shadow-md mb-6">
// //       <h2 className="text-xl font-semibold text-gray-800 mb-4">Cập nhật giá hàng loạt</h2>

// //       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
// //         <div>
// //           <label htmlFor="search" className="block text-sm font-medium text-gray-700">Tìm kiếm sản phẩm</label>
// //           <input
// //             type="text"
// //             id="search"
// //             placeholder="Tên sản phẩm, SKU..."
// //             value={searchTerm}
// //             onChange={(e) => setSearchTerm(e.target.value)}
// //             className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
// //           />
// //         </div>
// //         <div>
// //           <label htmlFor="category" className="block text-sm font-medium text-gray-700">Lọc theo danh mục</label>
// //           <select
// //             id="category"
// //             value={selectedCategory}
// //             onChange={(e) => setSelectedCategory(e.target.value)}
// //             className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
// //           >
// //             <option value="">Tất cả danh mục</option>
// //             {categories.map(cat => ( // <-- Sử dụng categories từ props
// //               <option key={cat} value={cat}>{cat}</option>
// //             ))}
// //           </select>
// //         </div>
// //         <div className="flex items-end">
// //           <button
// //             onClick={handleSearchAndFilter}
// //             className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
// //           >
// //             Tìm kiếm & Lọc
// //           </button>
// //         </div>
// //       </div>

// //       <form onSubmit={handleApplyChanges} className="flex flex-col sm:flex-row items-end gap-4">
// //         <div className="flex-1 w-full">
// //           <label htmlFor="profitPercent" className="block text-sm font-medium text-gray-700">
// //             Phần trăm lợi nhuận mới (ví dụ: 25.5 cho 25.5%)
// //           </label>
// //           <input
// //             type="number"
// //             id="profitPercent"
// //             value={profitPercentInput}
// //             onChange={handleProfitPercentInputChange}
// //             step="0.01"
// //             min="0"
// //             placeholder="Nhập % lợi nhuận mới"
// //             className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
// //           />
// //         </div>
// //         <button
// //           type="submit"
// //           className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
// //           disabled={selectedVariantCount === 0 || profitPercentInput === ''}
// //         >
// //           Cập nhật giá cho {selectedVariantCount} sản phẩm
// //         </button>
// //         <button
// //           type="button"
// //           onClick={handleUpdatePriceByAverageCost}
// //           className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
// //           disabled={selectedVariantCount === 0}
// //         >
// //           Cập nhật giá bán theo giá gốc mới ({selectedVariantCount})
// //         </button>
// //       </form>
// //     </div>
// //   );
// // }