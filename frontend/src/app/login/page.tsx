'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { login } from '@/features/auth/api/login'

const GoogleMultiColorIcon = () => (
  <svg
    className="w-5 h-5 mr-2"
    viewBox="0 0 533.5 544.3"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* ... các path ở đây ... */}
  </svg>
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    setLoading(true)
    try {
      const res = await login({ email, password })

      // Lưu token vào sessionStorage
      sessionStorage.setItem('access_token', res.access_token)
      sessionStorage.setItem('refresh_token', res.refresh_token)

      if (res.user.role === 'admin' || res.user.role === 'ladmin') {
        router.push('/ladmin')
      } else {
        router.push('/')
      }
    } catch (error: any) {
      alert(error.message || 'Đăng nhập thất bại!')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterRedirect = () => {
    router.push('/register')
  }

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:8000/auth/google'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Đăng nhập</h1>

        <Input
          label="Email"
          type="email"
          value={email}
          placeholder="you@example.com"
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Mật khẩu"
          type="password"
          value={password}
          placeholder="••••••••"
          onChange={(e) => setPassword(e.target.value)}
          className="mt-4"
        />

        <Button
          onClick={handleLogin}
          disabled={loading}
          className="mt-6 w-full"
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>

        <Button
          variant="outline"
          onClick={handleGoogleLogin}
          className="mt-4 w-full flex items-center justify-center"
        >
          <GoogleMultiColorIcon />
          Đăng nhập bằng Google
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRegisterRedirect}
          className="mt-6 mx-auto block"
        >
          Đăng ký
        </Button>
      </div>
    </div>
  )
}
