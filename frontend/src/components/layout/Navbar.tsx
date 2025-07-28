"use client";
import { useRouter } from "next/navigation";

import Link from "next/link";
import { useState, useEffect , useMemo, FormEvent } from "react";
import Cookies from "js-cookie";
import { Menu, X, ShoppingCart, Bell, ChevronDown } from "lucide-react";
import { axiosRequest } from '@/lib/axiosRequest';
import { handleLogout } from "@/features/auth/api/logout";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { Product, searchProduct , fetchSearchSuggestions} from "@/features/products/api/productApi";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Category , fetchCategories} from "@/features/categories/api/categoryApi";
import { useCartStore } from "@/store/cartStore";
import { cartApi } from "@/features/cart/api/cartApi";
import { NotificationsApi, Notification, ApiResponse } from '@/features/notifications/api/notificationApi'; // Điều chỉnh đường dẫn nếu cần

export default function Navbar() {

  const [q, setQ] = useState<string>("");
  //  const [searchResults, setSearchResults] = useState<Product[]>([]);
  // const [showSearchResults, setShowSearchResults] = useState(false); // State để điều khiển hiển thị popover
    const [showSuggestionsPopover, setShowSuggestionsPopover] = useState(false);

  const [suggestionList, setSuggestionList] = useState<string[]>([]);

  const router = useRouter();

   const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    setShowSuggestionsPopover(false); // Ẩn gợi ý khi thực hiện tìm kiếm chính
  };

  const totalItems = useCartStore((state) => state.getTotalItems());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [categories, setCategories] = useState<Category[]>([])
 const parentCategories = useMemo(() => categories.filter(cat => cat.id_parent === null), [categories]);

    const childrenMap = useMemo(() => {
      const map: Record<number, Category[]> = {};
      categories.forEach(cat => {
        if (typeof cat.id_parent === 'number') {
          if (!map[cat.id_parent]) {
            map[cat.id_parent] = [];
          }
          map[cat.id_parent].push(cat);
        }
      });
      return map;
    }, [categories]);
  const [unreadNotifications, setUnreadNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotificationPopover, setShowNotificationPopover] = useState(false); // State để kiểm soát Popover thông báo

  const logoutHandler = async () => {
  try {
    await handleLogout();
    setIsLoggedIn(false); // cập nhật trạng thái sau khi logout
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

  useEffect(() => {

      if (isLoggedIn) {
      useCartStore.getState().fetchCart();
  }
    fetchCategories()
      .then((data) => {
        setCategories(data)
      })
      .catch((err) => {
        console.error('Lỗi khi load categories:', err)
      });

    const checkAuth = async () => {
      try {
        const { user } = await axiosRequest('auth/me', 'GET');
        if (user) {
          console.log('User is logged in:', user);
          setIsLoggedIn(true);
        } else {
          console.log('No user data, not logged in');
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error('Error when calling /auth/me:', error);
        setIsLoggedIn(false);
      }
    };

    checkAuth();
  }, [isLoggedIn]);

  // --- useEffect for debounced search suggestions API call ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      // Only fetch suggestions if query length is greater than 2 characters
      if (q.length > 2) {
        try {
          const suggestions = await fetchSearchSuggestions(q);
          setSuggestionList(suggestions); // Store the suggestions
          // Show popover if there are any suggestions
          setShowSuggestionsPopover(suggestions.length > 0);
        } catch (error) {
          console.error("Lỗi khi lấy gợi ý tìm kiếm:", error);
          setSuggestionList([]);
          setShowSuggestionsPopover(false);
        }
      } else {
        setSuggestionList([]); // Clear suggestions if query is too short or empty
        setShowSuggestionsPopover(false); // Hide popover
      }
    }, 300); // Debounce for 300ms

    // Cleanup function to clear the timeout when component unmounts or q changes
    return () => clearTimeout(delayDebounceFn);
  }, [q]); // Rerun effect when q changes


  // --- Fetch Notifications when logged in ---
  useEffect(() => {
    let notificationInterval: NodeJS.Timeout | null = null;

    const fetchUserNotifications = async () => {
      if (isLoggedIn) {
        try {
          const res: ApiResponse<Notification[]> = await NotificationsApi.getUnread();
          setUnreadNotifications(res.data);
          setUnreadCount(res.unread_count || 0);
        } catch (error) {
          console.error('Lỗi khi tải thông báo chưa đọc:', error);
          // Có thể đặt unreadCount về 0 hoặc hiển thị thông báo lỗi trên UI
          setUnreadNotifications([]);
          setUnreadCount(0);
        }
      } else {
        setUnreadNotifications([]); // Clear notifications if not logged in
        setUnreadCount(0);
      }
    };

    fetchUserNotifications(); // Fetch immediately on login status change

    // Optional: Poll for new notifications
    if (isLoggedIn) {
      notificationInterval = setInterval(fetchUserNotifications, 30000); // Poll every 30 seconds
    }

    return () => {
      if (notificationInterval) {
        clearInterval(notificationInterval); // Clear interval on component unmount or logout
      }
    };
  }, [isLoggedIn]); // Re-run when isLoggedIn status changes
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

  return (
    <header className="bg-white shadow-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link href="/" className="text-xl font-bold text-blue-600">E-Shop</Link>
        </div>
    {/* --- Search Form (desktop) --- */}
      <div className="hidden lg:flex flex-1 justify-center px-4 relative">
        <form
          onSubmit={onSearch}
          className="flex w-full max-w-md" // Giữ max-w-md cho form để kiểm soát chiều rộng tổng thể
        >
          {/* Popover chỉ bao quanh input để định vị chính xác */}
          <Popover open={showSuggestionsPopover} onOpenChange={setShowSuggestionsPopover} >
            <PopoverTrigger asChild>
              {/* Vẫn giữ flex-1 cho input để nó tự chiếm không gian còn lại */}
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm sản phẩm..."
                // Đảm bảo input không có các thuộc tính gây lệch như margin/padding không mong muốn
                className="flex-1 border rounded-l-md px-3 py-2 focus:outline-none"
              />
            </PopoverTrigger>

            {/* PopoverContent hiển thị gợi ý tìm kiếm */}
            {suggestionList.length > 0 && (
              <PopoverContent
                // THAY ĐỔI LỚN Ở ĐÂY: Thêm 'sideOffset={0}' và loại bỏ 'left-0' trong className
                // 'align="start"' trên Popover cũng giúp căn chỉnh từ đầu
                sideOffset={0} // Đảm bảo không có khoảng cách offset theo chiều dọc mặc định
                align="start" // Căn chỉnh popover content với điểm bắt đầu của trigger
                className="absolute z-10 p-0 bg-white shadow-lg rounded-md border
                           data-[state=open]:animate-in data-[state=closed]:animate-out
                           data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
                           data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
                           data-[side=bottom]:slide-in-from-top-2
                           w-[var(--radix-popover-trigger-width)]" // Giữ chiều rộng bằng trigger
              >
                <ul>
                  {suggestionList.map((suggestion, index) => (
                    <li key={index} className="border-b last:border-b-0">
                      <button
                        type="button"
                        onClick={() => {
                          setQ(suggestion);
                          setSuggestionList([]);
                          setShowSuggestionsPopover(false); // Ẩn popover sau khi chọn gợi ý
                          router.push(`/search?q=${encodeURIComponent(suggestion)}`);
                        }}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-800"
                      >
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            )}
          </Popover>
          <button
            type="submit"
            className="bg-blue-600 text-white rounded-r-md px-4 py-2 hover:bg-blue-700"
          >
            Tìm
          </button>
        </form>
      </div>
      {/* --- end Search Form --- */}
        {/* Hamburger (mobile) */}
        <div className="flex lg:hidden">
          <button onClick={() => setMobileMenuOpen(true)} className="text-gray-700 hover:text-gray-900">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex lg:gap-x-6 items-center">


            <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center text-sm font-semibold text-gray-700 hover:text-blue-500 focus:outline-none" aria-haspopup="true">
          Sản phẩm
          <ChevronDown className="ml-1 w-4 h-4" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56">
        {parentCategories.map(parent => 
          childrenMap[parent.id] ? (
            <DropdownMenuSub key={parent.id}>
              <DropdownMenuSubTrigger>{parent.name}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {childrenMap[parent.id].map(child => (
                  <DropdownMenuItem asChild key={child.slug}>
                    <Link href={`/products/${child.slug}`}>{child.name}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : (
            <DropdownMenuItem asChild key={parent.slug}>
              <Link href={`/products/${parent.slug}`}>{parent.name}</Link>
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  
           <Link href="/contact" className="text-sm font-semibold text-gray-700 hover:text-blue-500">Liên hệ</Link>

          <Link
        href="/cart"
        className="relative flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-blue-500"
      >
        <ShoppingCart className="w-5 h-5" />
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
            {totalItems}
          </span>
        )}
</Link>

 {/* Notification Bell with Popover (Conditional Rendering based on isLoggedIn) */}
          {isLoggedIn && (
            <Popover open={showNotificationPopover} onOpenChange={setShowNotificationPopover}>
              <PopoverTrigger asChild>
                <button
                  className="ml-4 text-gray-700 hover:text-blue-500 relative"
                  aria-haspopup="true"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>

              <PopoverContent className="w-72 p-0">
                <div className="py-2 px-3 text-sm text-gray-800 font-semibold border-b">
                  Thông báo của bạn
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllNotificationsAsRead}
                      className="ml-2 px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Đọc tất cả
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
                              <Link
                                href={notif.link}
                                className="text-blue-600 hover:underline text-xs"
                                onClick={() => {
                                  handleMarkNotificationAsRead(notif.id); // Đánh dấu đã đọc khi click vào link
                                  setShowNotificationPopover(false); // Đóng popover
                                }}
                              >
                                Xem chi tiết
                              </Link>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(notif.created_at).toLocaleString('vi-VN')}
                            </p>
                          </div>
                          <div className="flex space-x-1 ml-2">
                            {!notif.is_read && (
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
                  <Link href="/notifications" className="text-blue-600 hover:underline"
                    onClick={() => setShowNotificationPopover(false)} // Đóng popover khi click
                  >
                    Xem tất cả thông báo
                  </Link>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* User dropdown or Login button */}
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-4 flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <img src="/avatar-default.png" alt="User Avatar" className="h-8 w-8 rounded-full" loading="lazy" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-40">
                <DropdownMenuItem asChild>
                  <Link href="/orders" onClick={() => {}}>
                    Đơn mua
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/wishlists" onClick={() => {}}>
                    Yêu thích
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={async () => {
                    await handleLogout();
                  }}>
                    Đăng xuất
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Đăng nhập
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white px-6 py-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="text-xl font-bold text-blue-600">E-Shop</Link>
            <button onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-gray-900">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="space-y-4">
            <Link href="/products" onClick={() => setMobileMenuOpen(false)} className="block text-base font-semibold text-gray-900 hover:text-blue-600">Sản phẩm</Link>
            <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="block text-base font-semibold text-gray-900 hover:text-blue-600">Liên hệ</Link>
            <Link href="/cart" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-1 block text-base font-semibold text-gray-900 hover:text-blue-600">
              <ShoppingCart className="w-5 h-5" />
              Giỏ hàng
            </Link>
            {isLoggedIn ? (
              <>
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="block text-base font-semibold text-gray-900 hover:text-blue-600">Profile</Link>
                <Link href="/settings" onClick={() => setMobileMenuOpen(false)} className="block text-base font-semibold text-gray-900 hover:text-blue-600">Settings</Link>
                <button
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await handleLogout(); // Gọi hàm logout
                  }}
                  className="w-full text-left block text-base font-semibold text-gray-900 hover:text-blue-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block rounded-md bg-blue-600 px-4 py-2 text-base font-semibold text-white hover:bg-blue-700">
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

