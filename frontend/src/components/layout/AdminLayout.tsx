"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  User, Layers, Tag, Package, Sliders, ListChecks,
  Settings, MapPin, FileText, Bell, LogOut, Lock, Info,
  X,
} from "lucide-react";
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/Button";
import { handleLogout } from "@/features/auth/api/logout";
import { axiosRequest } from "@/lib/axiosRequest";
import { NotificationsApi, Notification, ApiResponse } from '@/features/notifications/api/notificationApi'; // Điều chỉnh đường dẫn nếu cần

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("Admin"); // State để lưu tên người dùng
  const [unreadNotifications, setUnreadNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotificationPopover, setShowNotificationPopover] = useState(false);

//   useEffect(() => {
//   async function checkAuth() {
//     try {
//         const res = await axiosRequest("auth/me", "GET");

//     console.log("auth/me response:", res);

//     if (!res || !res.user || !res.user.role) {
//       setIsLoggedIn(false);
//       setIsAdmin(false);
//       router.push("/login");
//       return;
//     }

//     setIsLoggedIn(true);
//     const role = res.user.role.toLowerCase();
//     console.log("User role:", role);

//     if (role === "admin" || role === "ladmin") {
//       setIsAdmin(true);
//     } else {
//       setIsAdmin(false);
//       router.push("/");
//     }
//     } catch (error) {
//       setIsLoggedIn(false);
//       setIsAdmin(false);
//       router.push("/login");
//     } finally {
//       setLoading(false);
//     }
//   }

//   checkAuth();
// }, [router]);

   // --- Check Auth & Fetch Notifications Effect ---
  useEffect(() => {
    let notificationInterval: NodeJS.Timeout | null = null; // Biến để lưu ID của interval

    async function checkAuthAndFetchNotifications() {
      try {
        const res = await axiosRequest("auth/me", "GET");
        console.log("auth/me response:", res);

        if (!res || !res.user || !res.user.role) {
          setIsLoggedIn(false);
          setIsAdmin(false);
          router.push("/login");
          return;
        }

        setIsLoggedIn(true);
        setUserName(res.user.name || "Admin"); // Lấy tên người dùng từ response
        const role = res.user.role.toLowerCase();
        console.log("User role:", role);

        if (role === "admin" || role === "ladmin") {
          setIsAdmin(true);
          // Nếu là admin, bắt đầu fetch thông báo
          fetchUserNotifications();
          // Cài đặt polling cho thông báo
          notificationInterval = setInterval(fetchUserNotifications, 30000); // Mỗi 30 giây
        } else {
          setIsAdmin(false);
          router.push("/"); // Chuyển hướng nếu không phải admin
        }
      } catch (error) {
        console.error("Lỗi khi xác thực hoặc gọi /auth/me:", error);
        setIsLoggedIn(false);
        setIsAdmin(false);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    // Hàm riêng để fetch thông báo
    const fetchUserNotifications = async () => {
      try {
        const notificationRes: ApiResponse<Notification[]> = await NotificationsApi.getUnread();
        setUnreadNotifications(notificationRes.data);
        setUnreadCount(notificationRes.unread_count || 0);
      } catch (notificationError) {
        console.error('Lỗi khi tải thông báo chưa đọc:', notificationError);
        setUnreadNotifications([]);
        setUnreadCount(0);
      }
    };

    checkAuthAndFetchNotifications();

    // Cleanup function để xóa interval khi component unmount
    return () => {
      if (notificationInterval) {
        clearInterval(notificationInterval);
      }
    };
  }, [router]); // Dependencies của useEffect

  // --- Notification Handlers ---
  const handleMarkNotificationAsRead = async (notificationId: number) => {
    try {
      await NotificationsApi.markAsRead(notificationId);
      // Re-fetch unread notifications to update the count and list
      const res: ApiResponse<Notification[]> = await NotificationsApi.getUnread();
      setUnreadNotifications(res.data);
      setUnreadCount(res.unread_count || 0);
    } catch (error) {
      console.error('Lỗi khi đánh dấu thông báo đã đọc:', error);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      await NotificationsApi.markAllAsRead();
      // Re-fetch unread notifications to update the count and list
      const res: ApiResponse<Notification[]> = await NotificationsApi.getUnread();
      setUnreadNotifications(res.data);
      setUnreadCount(res.unread_count || 0);
    } catch (error) {
      console.error('Lỗi khi đánh dấu tất cả thông báo đã đọc:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    try {
      await NotificationsApi.delete(notificationId);
      // Re-fetch unread notifications to update the count and list
      const res: ApiResponse<Notification[]> = await NotificationsApi.getUnread();
      setUnreadNotifications(res.data);
      setUnreadCount(res.unread_count || 0);
    } catch (error) {
      console.error('Lỗi khi xóa thông báo:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Spinner />
        <div className="mt-4 text-gray-700">Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn || !isAdmin) {
    // Chưa đăng nhập hoặc không phải admin thì không render gì
    return null;
  }

  const menuItems = [
    { name: "Người dùng", icon: <User size={20} />, href: "/admin/users" },
    { name: "Danh mục", icon: <Layers size={20} />, href: "/admin/categories" },
    { name: "Hãng", icon: <Tag size={20} />, href: "/admin/brands" },
    { name: "Sản phẩm", icon: <Package size={20} />, href: "/admin/products" },
    { name: "Đơn mua hàng", icon: <Sliders size={20} />, href: "/admin/orders" },
    { name: "Nhà cung cấp", icon: <MapPin size={20} />, href: "/admin/suppliers" },
    { name: "Đơn nhập hàng", icon: <Settings size={20} />, href: "/admin/purchase_orders" },

    { name: "Phiếu nhập hàng", icon: <FileText size={20} />, href: "/admin/grns" },
    { name: "Quản lý giá", icon: <Sliders size={20} />, href: "/admin/bulk-price-update" },
    { name: "Lô hàng", icon: <Sliders size={20} />, href: "/admin/stocklots" },

    { name: "Đánh giá", icon: <FileText size={20} />, href: "/admin/reviews" },
    { name: "Voucher", icon: <ListChecks size={20} />, href: "/admin/vouchers" },
    { name: "Gợi ý", icon: <ListChecks size={20} />, href: "/admin/recommender-settings" },

  ];

  

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-gray-100 flex flex-col">
        <div className="flex items-center justify-center h-16 border-b border-gray-700 font-bold text-xl">
         <a href="/admin">DXM</a> 
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {menuItems.map(({ name, icon, href }) => (
            <a
              key={name}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-yellow-400 hover:text-black transition-colors"
            >
              {icon}
              <span>{name}</span>
            </a>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <header className="flex items-center justify-end bg-white h-16 px-6 shadow-md gap-4">
                  {/* Notification Bell with Popover */}
          <Popover open={showNotificationPopover} onOpenChange={setShowNotificationPopover}>
            <PopoverTrigger asChild>
              <button className="relative focus:outline-none">
                <Bell className="text-gray-700" size={22} />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="py-2 px-3 text-sm text-gray-800 font-semibold border-b">
                Thông báo mới
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllNotificationsAsRead}
                    className="ml-2 px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Đánh dấu tất cả đã đọc
                  </button>
                )}
              </div>
              <ul className="max-h-60 overflow-y-auto">
                {unreadNotifications.length === 0 ? (
                  <li className="px-4 py-2 text-sm text-gray-500">Không có thông báo mới.</li>
                ) : (
                  unreadNotifications.map((notif) => (
                    <li key={notif.id} className="border-b last:border-b-0">
                      <div className="flex justify-between items-center px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer">
                        <div className="flex-1">
                          <p className="font-medium">{notif.content}</p>
                          {notif.link && (
                            <a
                              href={notif.link}
                              className="text-blue-600 hover:underline text-xs"
                              onClick={() => {
                                handleMarkNotificationAsRead(notif.id); // Đánh dấu đã đọc khi click vào link
                                setShowNotificationPopover(false); // Đóng popover
                              }}
                            >
                              Xem chi tiết
                            </a>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notif.created_at).toLocaleString('vi-VN')}
                          </p>
                        </div>
                        <div className="flex space-x-1 ml-2">
                          {!notif.is_read && ( // Chỉ hiển thị nút này nếu chưa đọc
                            <button
                              onClick={() => handleMarkNotificationAsRead(notif.id)}
                              className="text-green-500 hover:text-green-700 p-1 rounded-full hover:bg-gray-200"
                              title="Đánh dấu đã đọc"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-8.5"></path><path d="m9 11 3 3L22 4"></path></svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteNotification(notif.id)}
                            className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-gray-200"
                            title="Xóa thông báo"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
              <div className="py-2 px-3 text-sm text-center border-t">
                <a href="/admin/notifications" className="text-blue-600 hover:underline"
                  onClick={() => setShowNotificationPopover(false)} // Đóng popover khi click
                >
                  Xem tất cả thông báo
                </a>
              </div>
            </PopoverContent>
          </Popover>



          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-3 py-1">
                <User size={20} />
                <span>{userName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <a href="/profile" className="flex items-center gap-2">
                  <Info size={16} /> Thông tin cá nhân
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/change-password" className="flex items-center gap-2">
                  <Lock size={16} /> Thay đổi mật khẩu
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <button
                  onClick={async () => {
                    await handleLogout();
                  }}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <LogOut size={16} /> Đăng xuất
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>

      {/* Toast container */}
      <Toaster position="top-right" reverseOrder={false} />
    </div>
  );
}



// "use client";

// import React, { ReactNode } from "react";
// import {
//   User,
//   Layers,
//   Tag,
//   Package,
//   Sliders,
//   ListChecks,
//   Settings,
//   MapPin,
//   FileText,
//   Bell,
//   LogOut,
//   Lock,
//   Info,
// } from "lucide-react";
// import { Menu, Popover, Transition } from "@headlessui/react";
// import { Fragment } from "react";

// type AdminLayoutProps = {
//   children: ReactNode;
// };

// export default function AdminLayout({ children }: AdminLayoutProps) {
//   const menuItems = [
//     { name: "User", icon: <User size={20} />, href: "/admin/users" },
//     { name: "Category", icon: <Layers size={20} />, href: "/admin/categories" },
//     { name: "Brand", icon: <Tag size={20} />, href: "/admin/brands" },
//     { name: "Product", icon: <Package size={20} />, href: "/admin/products" },
//     { name: "Variant", icon: <Sliders size={20} />, href: "/admin/variants" },
//     { name: "Specification", icon: <Sliders size={20} />, href: "/admin/specifications" },
//     { name: "Spec Option", icon: <ListChecks size={20} />, href: "/admin/spec_options" },
//     { name: "Spec Value", icon: <FileText size={20} />, href: "/admin/spec_values" },
//     { name: "Review", icon: <FileText size={20} />, href: "/admin/reviews" },
//     { name: "User Address", icon: <MapPin size={20} />, href: "/admin/user_addresses" },
//     { name: "Setting", icon: <Settings size={20} />, href: "/admin/settings" },
//   ];

//   const unreadNotifications = 5;
//   const userName = "Admin";

//   return (
//     <div className="flex min-h-screen bg-gray-50 text-gray-900">
//       {/* Sidebar */}
//       <aside className="w-64 bg-gray-800 text-gray-100 flex flex-col">
//         <div className="flex items-center justify-center h-16 border-b border-gray-700 font-bold text-xl">
//           E-Shop Admin
//         </div>

//         <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
//           {menuItems.map(({ name, icon, href }) => (
//             <a
//               key={name}
//               href={href}
//               className="flex items-center gap-3 px-3 py-2 rounded hover:bg-yellow-400 hover:text-black transition-colors"
//             >
//               {icon}
//               <span>{name}</span>
//             </a>
//           ))}
//         </nav>
//       </aside>

//       {/* Main layout */}
//       <div className="flex-1 flex flex-col">
//         {/* Navbar */}
//         <header className="flex items-center justify-end bg-white h-16 px-6 shadow-md gap-4">
//           {/* Notification Bell (Popover) */}
//           <Popover className="relative">
//             <Popover.Button className="relative focus:outline-none">
//               <Bell className="text-gray-700" size={22} />
//               {unreadNotifications > 0 && (
//                 <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
//                   {unreadNotifications}
//                 </span>
//               )}
//             </Popover.Button>
//             <Transition
//               as={Fragment}
//               enter="transition ease-out duration-200"
//               enterFrom="opacity-0 translate-y-1"
//               enterTo="opacity-100 translate-y-0"
//               leave="transition ease-in duration-150"
//               leaveFrom="opacity-100 translate-y-0"
//               leaveTo="opacity-0 translate-y-1"
//             >
//               <Popover.Panel className="absolute z-10 right-0 mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg p-4">
//                 <p className="text-sm font-semibold mb-2">Thông báo mới</p>
//                 <ul className="text-sm text-gray-700 space-y-2">
//                   <li>Bạn có 5 đánh giá mới.</li>
//                   <li>1 sản phẩm đang chờ duyệt.</li>
//                 </ul>
//               </Popover.Panel>
//             </Transition>
//           </Popover>

//           {/* User Dropdown (Menu) */}
//           <Menu as="div" className="relative">
//             <Menu.Button className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
//               <User size={20} />
//               <span>{userName}</span>
//             </Menu.Button>
//             <Transition
//               as={Fragment}
//               enter="transition ease-out duration-100"
//               enterFrom="opacity-0 scale-95"
//               enterTo="opacity-100 scale-100"
//               leave="transition ease-in duration-75"
//               leaveFrom="opacity-100 scale-100"
//               leaveTo="opacity-0 scale-95"
//             >
//               <Menu.Items className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg z-10">
//                 <Menu.Item>
//                   {({ active }) => (
//                     <a
//                       href="/profile"
//                       className={`flex items-center gap-2 px-4 py-2 ${
//                         active ? "bg-gray-100" : ""
//                       }`}
//                     >
//                       <Info size={16} /> Thông tin cá nhân
//                     </a>
//                   )}
//                 </Menu.Item>
//                 <Menu.Item>
//                   {({ active }) => (
//                     <a
//                       href="/change-password"
//                       className={`flex items-center gap-2 px-4 py-2 ${
//                         active ? "bg-gray-100" : ""
//                       }`}
//                     >
//                       <Lock size={16} /> Thay đổi mật khẩu
//                     </a>
//                   )}
//                 </Menu.Item>
//                 <Menu.Item>
//                   {({ active }) => (
//                     <button
//                       onClick={() => console.log("Logout")}
//                       className={`flex items-center gap-2 px-4 py-2 w-full text-left ${
//                         active ? "bg-gray-100" : ""
//                       }`}
//                     >
//                       <LogOut size={16} /> Đăng xuất
//                     </button>
//                   )}
//                 </Menu.Item>
//               </Menu.Items>
//             </Transition>
//           </Menu>
//         </header>

//         {/* Page content */}
//         <main className="flex-1 p-6 overflow-auto">{children}</main>
//       </div>
//     </div>
//   );
// }



// // "use client";

// // import React, { ReactNode, useState } from "react";
// // import {
// //   User,
// //   Layers,
// //   Tag,
// //   Package,
// //   Sliders,
// //   ListChecks,
// //   Settings,
// //   MapPin,
// //   FileText,
// // } from "lucide-react";

// // type AdminLayoutProps = {
// //   children: ReactNode;
// // };

// // export default function AdminLayout({ children }: AdminLayoutProps) {
// //   const menuItems = [
// //     { name: "User", icon: <User size={20} />, href: "/admin/users" },
// //     { name: "Category", icon: <Layers size={20} />, href: "/admin/categories" },
// //     { name: "Brand", icon: <Tag size={20} />, href: "/admin/brands" },
// //     { name: "Product", icon: <Package size={20} />, href: "/admin/products" },
// //     { name: "Variant", icon: <Sliders size={20} />, href: "/admin/variants" },
// //     { name: "Specification", icon: <Sliders size={20} />, href: "/admin/specifications" },
// //     { name: "Spec Option", icon: <ListChecks size={20} />, href: "/admin/spec_options" },
// //     { name: "Spec Value", icon: <FileText size={20} />, href: "/admin/spec_values" },
// //     { name: "Review", icon: <FileText size={20} />, href: "/admin/reviews" },
// //     { name: "User Address", icon: <MapPin size={20} />, href: "/admin/user_addresses" },
// //     { name: "Setting", icon: <Settings size={20} />, href: "/admin/settings" },
// //   ];

// //   const [sidebarOpen, setSidebarOpen] = useState(true);

// //   return (
// //     <div className="flex min-h-screen bg-gray-50 text-gray-900">
// //       <aside
// //         className={`${
// //           sidebarOpen ? "w-64" : "w-16"
// //         } bg-gray-800 text-gray-100 transition-width duration-300 flex flex-col`}
// //       >
// //         <div className="flex items-center justify-center h-16 border-b border-gray-700 font-bold text-xl">
// //           {sidebarOpen ? "E-Shop Admin" : "ES"}
// //         </div>

// //         <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
// //           {menuItems.map(({ name, icon, href }) => (
// //             <a
// //               key={name}
// //               href={href}
// //               className="flex items-center gap-3 px-3 py-2 rounded hover:bg-yellow-400 hover:text-black transition-colors"
// //               title={sidebarOpen ? undefined : name}
// //             >
// //               {icon}
// //               {sidebarOpen && <span className="whitespace-nowrap">{name}</span>}
// //             </a>
// //           ))}
// //         </nav>

// //         <button
// //           className="p-2 bg-yellow-400 hover:bg-yellow-500 text-black m-3 rounded-md"
// //           onClick={() => setSidebarOpen(!sidebarOpen)}
// //           aria-label="Toggle sidebar"
// //         >
// //           {sidebarOpen ? "<" : ">"}
// //         </button>
// //       </aside>

// //       <main className="flex-1 p-6 overflow-auto">{children}</main>
// //     </div>
// //   );
// // }
