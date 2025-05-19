import { Facebook, Instagram, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-700 text-gray-300 py-10">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
        
        {/* Logo & Brand */}
        <div className="text-white font-bold text-2xl mb-4 md:mb-0">
          E-Shop
        </div>
        
        {/* Links */}
        <nav className="flex flex-col space-y-2 text-sm">
          <a href="/" className="hover:text-yellow-400">Trang chủ</a>
          <a href="/about" className="hover:text-yellow-400">Giới thiệu</a>
          <a href="/contact" className="hover:text-yellow-400">Liên hệ</a>
          <a href="/policy" className="hover:text-yellow-400">Chính sách</a>
        </nav>
        
        {/* Contact */}
        <div className="text-sm space-y-1">
          <p>Địa chỉ: 123 Đường ABC, Quận 1, TP.HCM</p>
          <p>Điện thoại: 0123 456 789</p>
          <p>Email: support@eshop.com</p>
        </div>
        
        {/* Social */}
        <div className="flex space-x-4">
          <a href="https://facebook.com" aria-label="Facebook" className="hover:text-yellow-400">
            <Facebook size={24} />
          </a>
          <a href="https://instagram.com" aria-label="Instagram" className="hover:text-yellow-400">
            <Instagram size={24} />
          </a>
          <a href="https://twitter.com" aria-label="Twitter" className="hover:text-yellow-400">
            <Twitter size={24} />
          </a>
        </div>
      </div>

      <div className="mt-8 text-center text-gray-500 text-xs">
        © 2025 E-Shop. All rights reserved.
      </div>
    </footer>
  );
}
