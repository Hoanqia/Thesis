'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui/Spinner'  // import spinner

export default function OAuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const url = new URL(window.location.href)
    const token = url.searchParams.get('access_token')
    const refresh_token = url.searchParams.get('refresh_token')
    const role = url.searchParams.get('role')

    if (token && refresh_token) {
        sessionStorage.setItem('access_token', token);
        sessionStorage.setItem('refresh_token', refresh_token);
    }

    if (role === 'admin') {
      router.replace('/admin')
    } else if(role === 'customer') {
        router.replace('/')
    }
  }, [router])

  return <div className="flex flex-col items-center justify-center h-screen">
      <Spinner />
      <div className="mt-4 text-gray-700">Đang xử lý đăng nhập...</div>
    </div>
}
