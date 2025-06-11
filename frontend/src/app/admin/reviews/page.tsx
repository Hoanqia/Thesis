"use client";
import React, { useState, useEffect } from "react";
import CrudGeneric, { FieldConfig } from "@/components/ui/CrudGeneric";
import { reviewApi, Review, AdminReplyPayload } from "@/features/reviews/api/reviewApi";
import { Badge } from "@/components/ui/badge"; // Import Badge component
import toast from 'react-hot-toast'; // Import react-hot-toast




const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const data = await reviewApi.getAllReviews();
      setReviews(data);
    } catch (err) {
      console.error("Lỗi tải reviews (admin):", err);
      toast.error("Không thể tải đánh giá."); // Thông báo lỗi khi tải
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleUpdateReview = async (id: number, item: Partial<Review>) => {
    const payload: AdminReplyPayload = {
      admin_reply: item.admin_reply ?? "",
      status: item.status as boolean,
    };
    try {
      await reviewApi.adminReply(id, payload);
      toast.success("Đã cập nhật phản hồi đánh giá!"); // Toast thành công
      fetchReviews(); // Re-fetch data to update the table
    } catch (err) {
      console.error("Lỗi khi cập nhật phản hồi review:", err);
      toast.error("Cập nhật phản hồi thất bại. Vui lòng thử lại."); // Toast lỗi
    }
  };

  const handleDeleteReview = async (id: number) => {
    // CrudGeneric đã có xác nhận xóa, nên bạn có thể gọi toast trực tiếp
    try {
      await reviewApi.adminDelete(id);
      toast.success("Đã ẩn đánh giá thành công!"); // Toast thành công
      fetchReviews(); // Re-fetch data to update the table
    } catch (err) {
      console.error("Lỗi khi ẩn review:", err);
      toast.error("Ẩn đánh giá thất bại. Vui lòng thử lại."); // Toast lỗi
    }
  };

  
  const fields: (keyof Review)[] = ["admin_reply", "status"];
  const fieldsConfig: Partial<Record<keyof Review, FieldConfig>> = {
    admin_reply: {
      label: "Phản hồi Admin",
      type: "text",
      placeholder: "Nhập phản hồi của admin...",
      required: true,
    },
    status: {
      label: "Hiển thị",
      type: "checkbox",
    },
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Quản lý Reviews (Admin)</h1>
      <CrudGeneric<Review>
        title="Reviews"
        initialData={reviews}
        columns={[
          "id",
          "user_name",
          "variant_full_name",
          "message",
          "rate",
          "admin_reply",
          "created_at",
          "updated_at",
        ]}
        headerLabels={{
          id: "ID",
          user_name: "Người dùng",
          variant_full_name: "Sản phẩm",
          message: "Nội dung",
          rate: "Đánh giá",
          admin_reply: "Phản hồi Admin",
          created_at: "Ngày tạo",
          updated_at: "Ngày cập nhật",
        }}
        renderRow={(item, col) => {
          if (col === "rate") return <span>{item.rate} ⭐</span>;
          if (col === "status")
            return (
              <Badge variant={item.status ? "default" : "destructive"}>
                {item.status ? "Hiển thị" : "Ẩn"}
              </Badge>
            );
          if (col === "created_at" || col === "updated_at") {
            return item[col] ? new Date(item[col] as string).toLocaleDateString() : "N/A";
          }
          return String(item[col] ?? "");
        }}
        fields={fields}
        fieldsConfig={fieldsConfig}
        onUpdate={handleUpdateReview}
        onDelete={handleDeleteReview}
        onToggleStatus= {undefined}
      />
    </div>
  );
};

export default ReviewsPage;