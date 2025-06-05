// components/VoucherCard.tsx
"use client";

import React from "react";
import { Circle, CheckCircle, Truck, Percent } from "lucide-react";
import { Voucher } from "@/features/vouchers/api/voucherApi"; // đường dẫn tới file voucherApi.ts

interface VoucherCardProps {
  voucher: Voucher;
  isSelected: boolean;
  onSelect: (voucherId: number) => void;
}

export default function VoucherCard({
  voucher,
  isSelected,
  onSelect,
}: VoucherCardProps) {
  // 1. Tính trạng thái expired
  const now = new Date();
  const endDate = new Date(voucher.end_date);
  const isExpiredByDate = now > endDate;
  const isUsedUp =
    voucher.max_uses !== null ? voucher.used_count >= voucher.max_uses : false;
  const isInactive = voucher.status !== 1;

  const isExpired = isInactive || isExpiredByDate || isUsedUp;

  // 2. Tạo các chuỗi hiển thị
  // 2.1. Tiêu đề chính
  let title = "";
  if (voucher.type === "shipping_discount") {
    title = "Voucher Freeship";
  } else {
    // product_discount
    if (voucher.discount_percent !== null) {
      title = `Giảm ${voucher.discount_percent}%`;
    } else {
      title = "Voucher Giảm Giá";
    }
  }

  // 2.2. Subtitle: Đơn tối thiểu
  const subTitle =
    voucher.minimum_order_amount !== null
      ? `Đơn tối thiểu ${new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(voucher.minimum_order_amount)}`
      : "";

  // 2.3. Thông tin ngày hết hạn
  const formattedEndDate = `${endDate.getDate()}/${
    endDate.getMonth() + 1
  }/${endDate.getFullYear()}`;
  let dateInfo = "";
  if (isExpiredByDate) {
    dateInfo = `Đã hết hạn (${formattedEndDate})`;
  } else {
    // nếu chưa hết, hiển thị “Hết hạn ngày ...”
    dateInfo = `Hạn dùng đến ${formattedEndDate}`;
  }

  // 2.4. Thông tin “Đã dùng” nếu có max_uses
  let usedInfo = "";
  if (voucher.max_uses !== null) {
    usedInfo = `Đã dùng ${voucher.used_count}/${voucher.max_uses}`;
  }

  // 3. Chọn icon / ô màu cho từng loại voucher
  const IconBox = () => {
    if (voucher.type === "shipping_discount") {
      return (
        <div className="w-12 h-12 bg-teal-100 rounded flex items-center justify-center">
          <Truck size={24} className="text-teal-600" />
        </div>
      );
    } else {
      return (
        <div className="w-12 h-12 bg-orange-100 rounded flex items-center justify-center">
          <Percent size={24} className="text-orange-600" />
        </div>
      );
    }
  };

  return (
    <div
      onClick={() => {
        if (!isExpired) {
          onSelect(voucher.id);
        }
      }}
      className={`
        flex items-start p-4 mb-2 rounded-lg border
        ${isExpired ? "bg-gray-100 border-gray-200 cursor-not-allowed" : "bg-white hover:shadow-md cursor-pointer"}
      `}
    >
      {/* 4. Icon radio (selected / unselected) */}
      <div className="mr-4 mt-1">
        {isSelected ? (
          <CheckCircle
            size={20}
            className={`${isExpired ? "text-gray-300" : "text-green-500"}`}
          />
        ) : (
          <Circle
            size={20}
            className={`${isExpired ? "text-gray-300" : "text-gray-400"}`}
          />
        )}
      </div>

      {/* 5. IconBox (shipping / product) */}
      <div className="mr-4">
        <IconBox />
      </div>

      {/* 6. Phần thông tin voucher */}
      <div className="flex-1">
        {/* 6.1. Dòng chính: title + code */}
        <div className="flex justify-between items-start">
          <div>
            <h4
              className={`text-sm font-semibold ${
                isExpired ? "text-gray-400" : "text-gray-800"
              }`}
            >
              {title}
            </h4>
            <p
              className={`text-xs ${
                isExpired ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Mã: <span className="font-medium">{voucher.code}</span>
            </p>
          </div>
          {/* Hiển thị % giảm hoặc freeship */}
          <div>
            {voucher.type === "product_discount" && voucher.discount_percent !== null && (
              <span className={`text-sm font-semibold ${isExpired ? "text-gray-400" : "text-red-500"}`}>
                -{voucher.discount_percent}%
              </span>
            )}
            {voucher.type === "shipping_discount" && (
              <span
                className={`text-sm font-semibold ${
                  isExpired ? "text-gray-400" : "text-teal-600"
                }`}
              >
                Freeship
              </span>
            )}
          </div>
        </div>

        {/* 6.2. Subtitle (Đơn tối thiểu) */}
        {subTitle && (
          <p className={`text-xs mt-1 ${isExpired ? "text-gray-400" : "text-gray-500"}`}>
            {subTitle}
          </p>
        )}

        {/* 6.3. Thông tin ngày hết hạn */}
        <p className={`text-xs mt-1 ${isExpired ? "text-gray-400" : "text-gray-500"}`}>
          {dateInfo}
        </p>

        {/* 6.4. Thông tin đã dùng (nếu có) */}
        {usedInfo && (
          <p className={`text-xs mt-1 ${isExpired ? "text-gray-400" : "text-gray-500"}`}>
            {usedInfo}
          </p>
        )}
      </div>
    </div>
  );
}
