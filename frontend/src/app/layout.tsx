// app/layout.tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import LayoutWrapper from '@/components/layout/LayoutWrapper'
import { Toaster } from 'react-hot-toast';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'E-Commerce Website',
  description: 'Trang web bán hàng được tạo bằng Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
                <Toaster position="top-right" />

        {/* Đây là client wrapper để show/hide Navbar/Footer */}
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  )
}


// import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
// import Navbar from "@/components/layout/Navbar";
// import Footer from "@/components/layout/Footer";
// import "./globals.css";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// export const metadata: Metadata = {
//   title: "E-Commerce Website",
//   description: "Trang web bán hàng được tạo bằng Next.js",
// };

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <html lang="en">
//       <body
//         className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
//       >
//        <Navbar />
//         <main className="flex-1 w-full px-4">{children}</main>
//         <Footer />
//       </body>
//     </html>
//   );
// }
