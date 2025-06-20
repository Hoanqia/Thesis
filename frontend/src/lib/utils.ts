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
  charmStrategy: 'charm_vnd_990' | 'none' = 'charm_vnd_990'
): number => {
  // Đảm bảo averageCost không âm và profitPercent không âm
  if (averageCost < 0 || profitPercent < 0) {
    // Hoặc bạn có thể trả về một giá trị đặc biệt như NaN để báo hiệu lỗi
    // Hiện tại, yêu cầu là return 0 nếu averageCost <= 0, nhưng profitPercent < 0 cũng nên xử lý.
    // Nếu averageCost là 0 nhưng profitPercent > 0, chúng ta vẫn có thể tính ra 0.
    return 0;
  }

  // Bước 1: Tính giá cơ sở từ profit percent
  let basePrice = averageCost * (1 + profitPercent / 100);

  // Bước 2: Áp dụng chiến lược giá tâm lý (ví dụ: .990 cuối cùng)
  if (charmStrategy === 'charm_vnd_990') {
    // Round to nearest integer before checking last three digits
    const roundedBasePrice = Math.round(basePrice);
    const priceString = roundedBasePrice.toString();
    const lastThreeDigits = priceString.slice(-3);

    // If the price is less than 1000, we might not want to apply 990 charm,
    // or apply it differently (e.g., just make it 990 if it's less than 990)
    if (roundedBasePrice < 1000) {
      if (lastThreeDigits !== '990') { // If it's something like 500, 700, make it 990 if that's the desired charm
        basePrice = 990;
      }
      // If it's already 990, keep it.
    } else {
      // For prices >= 1000
      if (lastThreeDigits !== '990') {
        let base = Math.floor(basePrice / 1000) * 1000; // Làm tròn xuống hàng nghìn
        basePrice = base + 990;

        // Điều chỉnh nếu làm tròn xuống quá thấp so với giá gốc hoặc giá cũ
        // Mục tiêu là đảm bảo giá mới không thấp hơn quá nhiều so với giá ban đầu
        // hoặc không thấp hơn giá gốc (averageCost)
        if (basePrice <= averageCost) { // Sử dụng <= để đảm bảo luôn có lợi nhuận (nếu profitPercent > 0)
          basePrice = (Math.floor(averageCost / 1000) + 1) * 1000 + 990;
        }
      }
    }
  }

  // Làm tròn đến hàng nghìn nếu không có chiến lược 990
  if (charmStrategy === 'none') {
    basePrice = Math.round(basePrice / 1000) * 1000;
  }

  return Math.max(0, basePrice); // Đảm bảo giá không âm
};