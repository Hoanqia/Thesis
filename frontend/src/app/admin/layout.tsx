// import type { ReactNode } from "react";
// import AdminLayout from "@/components/layout/AdminLayout"; // dấu @ trỏ về src/

// export default function AdminRootLayout({ children }: { children: ReactNode }) {
//   return <AdminLayout>{children}</AdminLayout>;
// }

// app/admin/layout.tsx
import type { ReactNode } from "react";
import AdminLayout from "@/components/layout/AdminLayout";

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
