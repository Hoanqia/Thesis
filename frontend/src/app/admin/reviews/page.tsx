"use client";
import React, { useState, useEffect, useCallback } from "react";
import CrudGeneric, { FieldConfig, ActionConfig, CrudItem } from "@/components/ui/CrudReview"; // Giả định đúng đường dẫn
import { reviewApi, Review, AdminReplyPayload } from "@/features/reviews/api/reviewApi";
import { Badge } from "@/components/ui/badge";
import toast from 'react-hot-toast';

// Định nghĩa một kiểu mở rộng của Review để sử dụng với CrudGeneric
interface ReviewFlat extends Review, CrudItem {}

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewFlat[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReviewForReply, setSelectedReviewForReply] = useState<ReviewFlat | null>(null);
  // SỬA ĐỔI: Thay đổi kiểu của replyInput thành string | null
  const [replyInput, setReplyInput] = useState<string | null>(""); // Khởi tạo với chuỗi rỗng, nhưng cho phép null

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reviewApi.getAllReviews();
      setReviews(data.map(r => ({ ...r, id: r.id })));
    } catch (err) {
      console.error("Lỗi tải reviews (admin):", err);
      toast.error("Không thể tải đánh giá.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleUpdateReview = async (id: number, item: Partial<Review>) => {
    const payload: AdminReplyPayload = {
      admin_reply: item.admin_reply ?? null,
      status: item.status as boolean,
    };
    try {
      await reviewApi.adminReply(id, payload);
      toast.success("Đã cập nhật đánh giá!");
      fetchReviews();
      setSelectedReviewForReply(null);
      setReplyInput(null); // SỬA ĐỔI: Set null khi đóng modal
    } catch (err) {
      console.error("Lỗi khi cập nhật review:", err);
      toast.error("Cập nhật đánh giá thất bại. Vui lòng thử lại.");
    }
  };

  const handleDeleteReview = async (id: number) => {
    try {
      await reviewApi.adminDelete(id);
      toast.success("Đã ẩn đánh giá thành công!");
      fetchReviews();
    } catch (err) {
      console.error("Lỗi khi ẩn review:", err);
      toast.error("Ẩn đánh giá thất bại. Vui lòng thử lại.");
    }
  };

  // const handleSubmitAdminReply = async () => {
  //   // SỬA ĐỔI: Đảm bảo replyInput là string khi trim()
  //   if (!selectedReviewForReply || !replyInput?.trim()) { // Sử dụng optional chaining và trim()
  //     toast.error("Vui lòng nhập nội dung phản hồi.");
  //     return;
  //   }

  //   const payload: AdminReplyPayload = {
  //     admin_reply: replyInput.trim(), // Đã kiểm tra null/undefined bằng optional chaining ở trên
  //     status: selectedReviewForReply.status,
  //   };

  //   try {
  //     await reviewApi.adminReply(selectedReviewForReply.id, payload);
  //     toast.success("Đã gửi phản hồi đánh giá!");
  //     fetchReviews();
  //     setSelectedReviewForReply(null);
  //     setReplyInput(null); // SỬA ĐỔI: Set null khi đóng modal
  //   } catch (err) {
  //     console.error("Lỗi khi gửi phản hồi admin:", err);
  //     toast.error("Gửi phản hồi thất bại. Vui lòng thử lại.");
  //   }
  // };
  const handleSubmitAdminReply = async () => {
    if (!selectedReviewForReply) {
      toast.error("Không tìm thấy đánh giá để phản hồi.");
      return;
    }
    // Gửi phản hồi mới hoặc xóa nếu input rỗng
    const finalReplyContent = replyInput?.trim() === "" ? null : replyInput;

    try {
      // Sử dụng hàm mới để chỉ cập nhật admin_reply
    await reviewApi.updateAdminReplyOnly(
        selectedReviewForReply.id,
        finalReplyContent,
        selectedReviewForReply.message, // Pass current message
        selectedReviewForReply.rate     // Pass current rate
      );     
       toast.success("Đã gửi/cập nhật phản hồi đánh giá!");
      fetchReviews(); // Tải lại reviews để cập nhật bảng
      setSelectedReviewForReply(null); // Đóng modal
      setReplyInput(null); // Xóa input
    } catch (err) {
      console.error("Lỗi khi gửi/cập nhật phản hồi admin:", err);
      toast.error("Gửi/cập nhật phản hồi thất bại. Vui lòng thử lại.");
    }
  };
  const renderReviewActions = useCallback((item: ReviewFlat): ActionConfig<ReviewFlat>[] => {
    const actions: ActionConfig<ReviewFlat>[] = [
      {
        label: item.status ? "Ẩn" : "Hiển thị",
        onClick: () => handleUpdateReview(item.id, { status: !item.status }),
        className: item.status ? "text-red-600" : "text-green-600",
      },
      {
        label: "Xóa",
        onClick: () => handleDeleteReview(item.id),
        className: "text-red-600",
      },
    ];

    // if (!item.admin_reply || item.admin_reply.trim() === "") {
    //   actions.unshift({
    //     label: "Trả lời",
    //     onClick: () => {
    //       setSelectedReviewForReply(item);
    //       // SỬA ĐỔI: Đảm bảo gán đúng kiểu string | null
    //       setReplyInput(item.admin_reply); // Gán trực tiếp item.admin_reply (có thể là null)
    //     },
    //     className: "text-blue-600",
    //   });
    // }
     // Thêm nút "Trả lời" hoặc "Sửa phản hồi"
    if (!item.admin_reply || item.admin_reply.trim() === "") {
      actions.unshift({
        label: "Trả lời",
        onClick: () => {
          setSelectedReviewForReply(item);
          setReplyInput(item.admin_reply); // Gán trực tiếp item.admin_reply (có thể là null)
        },
        className: "text-blue-600",
      });
    } else {
      actions.unshift({ // Thêm nút Sửa phản hồi nếu đã có phản hồi
        label: "Sửa phản hồi",
        onClick: () => {
          setSelectedReviewForReply(item);
          setReplyInput(item.admin_reply); // Gán giá trị phản hồi hiện có
        },
        className: "text-orange-600",
      });
    }

    return actions;
  }, [handleUpdateReview, handleDeleteReview]);

  const fields: (keyof Review)[] = ["admin_reply", "status"];
  const fieldsConfig: Partial<Record<keyof Review, FieldConfig>> = {
    admin_reply: {
      label: "Phản hồi Admin",
      type: "text",
      placeholder: "Nhập phản hồi của admin...",
      required: false,
    },
    status: {
      label: "Hiển thị",
      type: "checkbox",
    },
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Quản lý Reviews (Admin)</h1>
      <CrudGeneric<ReviewFlat>
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
          "status",
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
          status: "Trạng thái",
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
            return item[col] ? new Date(item[col] as string).toLocaleString() : "N/A";
          }
          if (col === "admin_reply") {
            return item.admin_reply && item.admin_reply.trim() !== "" ? item.admin_reply : <span className="text-gray-500 italic">Chưa trả lời</span>;
          }
          return String(item[col] ?? "");
        }}
        fields={fields}
        fieldsConfig={fieldsConfig}
        onUpdate={handleUpdateReview}
        onDelete={handleDeleteReview}
        renderActions={renderReviewActions}
      />

      {/* Modal trả lời đánh giá */}
      {selectedReviewForReply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="relative w-full max-w-lg bg-white rounded-lg shadow-lg">
            <div className="flex justify-between items-center border-b px-6 py-4">
              <h2 className="text-xl font-semibold">Trả lời đánh giá của khách hàng #{selectedReviewForReply.id}</h2>
              <button onClick={() => setSelectedReviewForReply(null)} className="text-gray-500 hover:text-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="font-medium">Người dùng:</p>
                <span>{selectedReviewForReply.user_name}</span>
              </div>
              <div>
                <p className="font-medium">Sản phẩm:</p>
                <span>{selectedReviewForReply.variant_full_name}</span>
              </div>
              <div>
                <p className="font-medium">Đánh giá:</p>
                <span>{selectedReviewForReply.message}</span>
              </div>
              <div>
                <p className="font-medium">Số sao:</p>
                <span>{selectedReviewForReply.rate} ⭐</span>
              </div>
              <div className="mt-4">
                <label htmlFor="adminReply" className="block text-sm font-medium text-gray-700 mb-2">
                  Phản hồi của bạn:
                </label>
                <textarea
                  id="adminReply"
                  rows={4}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Nhập phản hồi của admin..."
                  value={replyInput || ""} // SỬA ĐỔI: Sử dụng || "" để đảm bảo giá trị là string cho textarea
                  onChange={(e) => setReplyInput(e.target.value)}
                ></textarea>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setSelectedReviewForReply(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmitAdminReply}
                  // SỬA ĐỔI: Kiểm tra replyInput là null hoặc chuỗi rỗng sau khi trim
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={!replyInput && selectedReviewForReply.admin_reply === null} // SỬA ĐỔI: Disable nếu input rỗng VÀ phản hồi ban đầu cũng rỗng
                >
                  {selectedReviewForReply.admin_reply && selectedReviewForReply.admin_reply.trim() !== "" ? "Cập nhật Phản hồi" : "Gửi Phản hồi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsPage;


// "use client";
// import React, { useState, useEffect } from "react";
// import CrudGeneric, { FieldConfig } from "@/components/ui/CrudGeneric";
// import { reviewApi, Review, AdminReplyPayload } from "@/features/reviews/api/reviewApi";
// import { Badge } from "@/components/ui/badge"; // Import Badge component
// import toast from 'react-hot-toast'; // Import react-hot-toast




// const ReviewsPage: React.FC = () => {
//   const [reviews, setReviews] = useState<Review[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [selectedReviewForReply, setSelectedReviewForReply] = useState<ReviewFlat | null>(null); // State để lưu review cần trả lời
//   const [replyInput, setReplyInput] = useState<string>(""); // State cho nội dung trả lời

//   const fetchReviews = async () => {
//     setLoading(true);
//     try {
//       const data = await reviewApi.getAllReviews();
//       setReviews(data);
//     } catch (err) {
//       console.error("Lỗi tải reviews (admin):", err);
//       toast.error("Không thể tải đánh giá."); // Thông báo lỗi khi tải
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchReviews();
//   }, []);

//   const handleUpdateReview = async (id: number, item: Partial<Review>) => {
//     const payload: AdminReplyPayload = {
//       admin_reply: item.admin_reply ?? "",
//       status: item.status as boolean,
//     };
//     try {
//       await reviewApi.adminReply(id, payload);
//       toast.success("Đã cập nhật phản hồi đánh giá!"); // Toast thành công
//       fetchReviews(); // Re-fetch data to update the table
//     } catch (err) {
//       console.error("Lỗi khi cập nhật phản hồi review:", err);
//       toast.error("Cập nhật phản hồi thất bại. Vui lòng thử lại."); // Toast lỗi
//     }
//   };

//   const handleDeleteReview = async (id: number) => {
//     // CrudGeneric đã có xác nhận xóa, nên bạn có thể gọi toast trực tiếp
//     try {
//       await reviewApi.adminDelete(id);
//       toast.success("Đã ẩn đánh giá thành công!"); // Toast thành công
//       fetchReviews(); // Re-fetch data to update the table
//     } catch (err) {
//       console.error("Lỗi khi ẩn review:", err);
//       toast.error("Ẩn đánh giá thất bại. Vui lòng thử lại."); // Toast lỗi
//     }
//   };

  
//   const fields: (keyof Review)[] = ["admin_reply", "status"];
//   const fieldsConfig: Partial<Record<keyof Review, FieldConfig>> = {
//     admin_reply: {
//       label: "Phản hồi Admin",
//       type: "text",
//       placeholder: "Nhập phản hồi của admin...",
//       required: true,
//     },
//     status: {
//       label: "Hiển thị",
//       type: "checkbox",
//     },
//   };

//   return (
//     <div className="p-6">
//       <h1 className="text-2xl font-bold mb-4">Quản lý Reviews (Admin)</h1>
//       <CrudGeneric<Review>
//         title="Reviews"
//         initialData={reviews}
//         columns={[
//           "id",
//           "user_name",
//           "variant_full_name",
//           "message",
//           "rate",
//           "admin_reply",
//           "created_at",
//           "updated_at",
//         ]}
//         headerLabels={{
//           id: "ID",
//           user_name: "Người dùng",
//           variant_full_name: "Sản phẩm",
//           message: "Nội dung",
//           rate: "Đánh giá",
//           admin_reply: "Phản hồi Admin",
//           created_at: "Ngày tạo",
//           updated_at: "Ngày cập nhật",
//         }}
//         renderRow={(item, col) => {
//           if (col === "rate") return <span>{item.rate} ⭐</span>;
//           if (col === "status")
//             return (
//               <Badge variant={item.status ? "default" : "destructive"}>
//                 {item.status ? "Hiển thị" : "Ẩn"}
//               </Badge>
//             );
//           if (col === "created_at" || col === "updated_at") {
//             return item[col] ? new Date(item[col] as string).toLocaleDateString() : "N/A";
//           }
//           return String(item[col] ?? "");
//         }}
//         fields={fields}
//         fieldsConfig={fieldsConfig}
//         onUpdate={handleUpdateReview}
//         onDelete={handleDeleteReview}
//         onToggleStatus= {undefined}
//       />
//     </div>
//   );
// };

// export default ReviewsPage;