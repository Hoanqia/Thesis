"use client";

import React, { ReactNode, useState } from "react";
import {
  User,
  Layers,
  Tag,
  Package,
  Sliders,
  ListChecks,
  Settings,
  MapPin,
  FileText,
} from "lucide-react";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const menuItems = [
    { name: "User", icon: <User size={20} />, href: "/admin/users" },
    { name: "Category", icon: <Layers size={20} />, href: "/admin/categories" },
    { name: "Brand", icon: <Tag size={20} />, href: "/admin/brands" },
    { name: "Product", icon: <Package size={20} />, href: "/admin/products" },
    { name: "Variant", icon: <Sliders size={20} />, href: "/admin/variants" },
    { name: "Specification", icon: <Sliders size={20} />, href: "/admin/specifications" },
    { name: "Spec Option", icon: <ListChecks size={20} />, href: "/admin/spec_options" },
    { name: "Spec Value", icon: <FileText size={20} />, href: "/admin/spec_values" },
    { name: "Review", icon: <FileText size={20} />, href: "/admin/reviews" },
    { name: "User Address", icon: <MapPin size={20} />, href: "/admin/user_addresses" },
    { name: "Setting", icon: <Settings size={20} />, href: "/admin/settings" },
  ];

  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } bg-gray-800 text-gray-100 transition-width duration-300 flex flex-col`}
      >
        <div className="flex items-center justify-center h-16 border-b border-gray-700 font-bold text-xl">
          {sidebarOpen ? "E-Shop Admin" : "ES"}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {menuItems.map(({ name, icon, href }) => (
            <a
              key={name}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-yellow-400 hover:text-black transition-colors"
              title={sidebarOpen ? undefined : name}
            >
              {icon}
              {sidebarOpen && <span className="whitespace-nowrap">{name}</span>}
            </a>
          ))}
        </nav>

        <button
          className="p-2 bg-yellow-400 hover:bg-yellow-500 text-black m-3 rounded-md"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? "<" : ">"}
        </button>
      </aside>

      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
