import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};
export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('vi-VN');
};


export const calculateNewPrice = (
  averageCost: number,
  profitPercent: number,
  strategy: 'charm_vnd_990' | 'charm_99' | 'none' = 'none' // Thêm 'charm_99' vào type và đặt default là 'none'
): number => {
  // Đảm bảo giá gốc không âm.
  if (averageCost < 0) {
    return 0;
  }
  
  // Tính giá cơ sở trước khi áp dụng chiến lược giá tâm lý
  let basePrice = averageCost * (1 + profitPercent / 100);

  // Biến giữ giá đã điều chỉnh sau khi áp dụng chiến lược
  let adjustedPrice = basePrice;

  switch (strategy) {
    case 'charm_vnd_990':
      let unit = 0;
      let charm_suffix = 0;

      if (basePrice >= 1000000) { // Từ 1 triệu trở lên (X.990.000)
        unit = 1000000;
        charm_suffix = 990000;
      } else if (basePrice >= 100000) { // Từ 100 nghìn đến dưới 1 triệu (X9.900)
        unit = 100000;
        charm_suffix = 99000;
      } else if (basePrice >= 1000) { // Từ 1 nghìn đến dưới 100 nghìn (X.990)
        unit = 1000;
        charm_suffix = 990;
      } else {
        // Với các giá trị nhỏ hơn 1000, chiến lược .990 không phổ biến ở VND
        // Trả về giá gốc (làm tròn)
        return parseFloat(basePrice.toFixed(2));
      }

      // Tìm mốc đơn vị tròn ngay dưới hoặc bằng basePrice, giống Laravel
      const floorUnit = Math.floor(basePrice / unit) * unit;

      // Tính giá mục tiêu X.990 của mốc hiện tại
      const targetPriceCurrentUnit = floorUnit + charm_suffix;

      // So sánh basePrice với các mốc X.990 để chọn giá phù hợp, giống Laravel
      if (basePrice >= targetPriceCurrentUnit) {
        adjustedPrice = targetPriceCurrentUnit;
      } else {
        // Nếu basePrice nhỏ hơn mốc X.990 của đơn vị hiện tại, lùi về mốc X.990 của đơn vị PHÍA DƯỚI
        adjustedPrice = (floorUnit - unit) + charm_suffix;

        // Đảm bảo giá không âm
        if (adjustedPrice < 0) {
          adjustedPrice = 0;
        }
      }
      break;

    case 'charm_99': // Kết thúc bằng .99 (phổ biến ở thị trường USD)
      adjustedPrice = Math.floor(basePrice) + 0.99;
      break;

    default:
      // Nếu không có chiến lược cụ thể, trả về giá cơ sở
      adjustedPrice = basePrice;
      break;
  }

  // Luôn làm tròn giá cuối cùng đến 2 chữ số thập phân, giống Laravel
  return parseFloat(adjustedPrice.toFixed(2));
};

// export const calculateNewPrice = (
//   averageCost: number,
//   profitPercent: number,
//   charmStrategy: 'charm_vnd_990' | 'none' = 'charm_vnd_990'
// ): number => {
//   // Đảm bảo averageCost không âm và profitPercent không âm
//   if (averageCost < 0 || profitPercent < 0) {
//     // Hoặc bạn có thể trả về một giá trị đặc biệt như NaN để báo hiệu lỗi
//     // Hiện tại, yêu cầu là return 0 nếu averageCost <= 0, nhưng profitPercent < 0 cũng nên xử lý.
//     // Nếu averageCost là 0 nhưng profitPercent > 0, chúng ta vẫn có thể tính ra 0.
//     return 0;
//   }

//   // Bước 1: Tính giá cơ sở từ profit percent
//   let basePrice = averageCost * (1 + profitPercent / 100);

//   // Bước 2: Áp dụng chiến lược giá tâm lý (ví dụ: .990 cuối cùng)
//   if (charmStrategy === 'charm_vnd_990') {
//     // Round to nearest integer before checking last three digits
//     const roundedBasePrice = Math.round(basePrice);
//     const priceString = roundedBasePrice.toString();
//     const lastThreeDigits = priceString.slice(-3);

//     // If the price is less than 1000, we might not want to apply 990 charm,
//     // or apply it differently (e.g., just make it 990 if it's less than 990)
//     if (roundedBasePrice < 1000) {
//       if (lastThreeDigits !== '990') { // If it's something like 500, 700, make it 990 if that's the desired charm
//         basePrice = 990;
//       }
//       // If it's already 990, keep it.
//     } else {
//       // For prices >= 1000
//       if (lastThreeDigits !== '990') {
//         let base = Math.floor(basePrice / 1000) * 1000; // Làm tròn xuống hàng nghìn
//         basePrice = base + 990;

//         // Điều chỉnh nếu làm tròn xuống quá thấp so với giá gốc hoặc giá cũ
//         // Mục tiêu là đảm bảo giá mới không thấp hơn quá nhiều so với giá ban đầu
//         // hoặc không thấp hơn giá gốc (averageCost)
//         if (basePrice <= averageCost) { // Sử dụng <= để đảm bảo luôn có lợi nhuận (nếu profitPercent > 0)
//           basePrice = (Math.floor(averageCost / 1000) + 1) * 1000 + 990;
//         }
//       }
//     }
//   }

//   // Làm tròn đến hàng nghìn nếu không có chiến lược 990
//   if (charmStrategy === 'none') {
//     basePrice = Math.round(basePrice / 1000) * 1000;
//   }

//   return Math.max(0, basePrice); // Đảm bảo giá không âm
// };