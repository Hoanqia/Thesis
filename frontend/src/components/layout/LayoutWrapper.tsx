'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import Footer from './Footer'

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const excludedPrefixes = ['/admin', '/register', '/login']
  const showLayout = !excludedPrefixes.some(prefix => pathname.startsWith(prefix))

  return (
    <>
      {showLayout && <Navbar />}
      <main className="flex-1 w-full">{children}</main>
      {showLayout && <Footer />}
    </>
  )
}
