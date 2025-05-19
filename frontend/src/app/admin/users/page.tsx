"use client"; // vì dùng useState, effect nếu cần

import React, { useEffect, useState } from "react";
import AdminLayout from "../layout"; // hoặc "@/app/admin/layout" nếu dùng alias
import axios from "axios";

type User = {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  role: string;
  status: boolean;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Thay bằng API thật của bạn
    axios.get<User[]>("/api/admin/users")
    .then((res) => {
        setUsers(res.data);
        setLoading(false);
    })
    .catch(() => {
        setLoading(false);
    });
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-4">Danh sách Users</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border border-gray-300 rounded-md">
          <thead className="bg-gray-200">
            <tr>
              <th className="border px-4 py-2">ID</th>
              <th className="border px-4 py-2">Name</th>
              <th className="border px-4 py-2">Email</th>
              <th className="border px-4 py-2">Phone</th>
              <th className="border px-4 py-2">Role</th>
              <th className="border px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-100">
                <td className="border px-4 py-2">{user.id}</td>
                <td className="border px-4 py-2">{user.name}</td>
                <td className="border px-4 py-2">{user.email}</td>
                <td className="border px-4 py-2">{user.phone_number}</td>
                <td className="border px-4 py-2 capitalize">{user.role}</td>
                <td className="border px-4 py-2">{user.status ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
}
