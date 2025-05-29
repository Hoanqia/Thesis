"use client";

import React, { useEffect, useState } from "react";
import CrudGeneric, { FieldConfig, CrudItem } from "@/components/ui/CrudGeneric";
import { AdminApi } from "@/features/users/api/userApi";
import toast from "react-hot-toast";

interface User extends CrudItem {
  name: string;
  email: string;
  role: string;
  status: number; // dùng 0 | 1 thay vì boolean
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  
  useEffect(() => {
    AdminApi.getAllUsers()
      .then((res) => {
        const mappedUsers = res.map((u) => ({
          ...u,
          status: u.status ? 1 : 0, // giữ kiểu 0 | 1
        }));
        setUsers(mappedUsers);
      })
      .catch((err) => console.error("Lỗi khi tải user:", err));
  }, []);

  const fields: (keyof User)[] = ["name", "email", "role", "status"];
  const columns: (keyof User)[] = ["id", "name", "email", "role", "status"];

  const fieldsConfig: Partial<Record<keyof User, FieldConfig>> = {
    name: {
      label: "Họ tên",
      type: "text",
      required: true,
    },
    email: {
      label: "Email",
      type: "text",
      required: true,
    },
    role: {
      label: "Vai trò",
      type: "select",
      options: [
        { label: "Admin", value: "admin" },
        { label: "User", value: "user" },
      ],
    },
    status: {
      label: "Trạng thái",
      type: "select",
      options: [
        { label: "Hoạt động", value: 1 },
        { label: "Tạm khóa", value: 0 },
      ],
    },
  };

 const handleToggleStatus = async (id: number) => {
  const user = users.find(u => u.id === id);
  if (!user) {
    toast.error(`Người dùng với id ${id} không tồn tại`);
    return;
  }
  try {
    const newStatus = user.status === 1 ? 0 : 1;
    const success = await AdminApi.changeStatusUser(id, newStatus);

    if (success) {
      setUsers(prev =>
        prev.map(u => (u.id === id ? { ...u, status: newStatus } : u))
      );
      toast.success(`Đã ${newStatus === 1 ? "kích hoạt" : "khóa"} tài khoản của ${user.name}`);
    } else {
      toast.error("Không thể thay đổi trạng thái");
    }
  } catch {
    toast.error("Chuyển trạng thái thất bại");
  }
};


  return (
    <CrudGeneric<User>
      title="Quản lý người dùng"
      initialData={users}
      columns={columns}
      fields={fields}
      fieldsConfig={fieldsConfig}
      onCreate={(item) => console.log("Tạo:", item)}
      onUpdate={(id, item) => console.log("Cập nhật:", id, item)}
      onDelete={(id) => console.log("Xoá:", id)}
      onToggleStatus={handleToggleStatus}
      onChange={(updated) => setUsers(updated)}
    />
  );
}
