'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import Footer from './Footer'

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname() ?? ''
  const isAdmin = pathname.startsWith('/admin')

  return (
    <>
      { !isAdmin && <Navbar /> }
      <main className="flex-1 w-full ">{children}</main>
      { !isAdmin && <Footer /> }
    </>
  )
}
