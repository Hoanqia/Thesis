"use client";

import Link from "next/link";
import { useState, useEffect , useMemo} from "react";
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

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Category , fetchCategories} from "@/features/categories/api/categoryApi";



export default function Navbar() {
  
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


  const logoutHandler = async () => {
  try {
    await handleLogout();
    setIsLoggedIn(false); // cập nhật trạng thái sau khi logout
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

  useEffect(() => {

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
  }, []);
  


  return (
    <header className="bg-white shadow-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link href="/" className="text-xl font-bold text-blue-600">E-Shop</Link>
        </div>

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

          <Link href="/cart" className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-blue-500">
            <ShoppingCart className="w-5 h-5" />
          </Link>

          {/* Notification Bell with Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="ml-4 text-gray-700 hover:text-blue-500 relative"
                aria-haspopup="true"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                  3
                </span>
              </button>
            </PopoverTrigger>

            <PopoverContent className="w-72 p-0">
              <div className="py-2 px-3 text-sm text-gray-800 font-semibold border-b">Thông báo</div>
              <ul className="max-h-60 overflow-y-auto">
                <li className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer">Đơn hàng #1234 đã được xác nhận.</li>
                <li className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer">Bạn có mã giảm giá mới.</li>
                <li className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer">Sản phẩm bạn yêu thích đã giảm giá.</li>
              </ul>
            </PopoverContent>
          </Popover>

          {/* User dropdown or Login button */}
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-4 flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <img src="/avatar-default.png" alt="User Avatar" className="h-8 w-8 rounded-full" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-40">
                <DropdownMenuItem asChild>
                  <Link href="/profile" onClick={() => {}}>
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" onClick={() => {}}>
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={async () => {
                    await handleLogout();
                  }}>
                    Logout
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

