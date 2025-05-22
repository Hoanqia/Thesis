'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

import {login} from '@/features/auth/api/login'
// Icon Google đa màu (4 màu chuẩn Google)
const GoogleMultiColorIcon = () => (
  <svg
    className="w-5 h-5 mr-2"
    viewBox="0 0 533.5 544.3"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M533.5 278.4c0-18.7-1.5-37-4.4-54.6H272v103.3h146.9c-6.3 33.9-25.1 62.6-53.6 81.9v67h86.6c50.7-46.7 79.6-115.5 79.6-197.6z"
      fill="#4285F4"
    />
    <path
      d="M272 544.3c72.6 0 133.6-24 178.2-65.1l-86.6-67c-24.1 16.1-55 25.7-91.6 25.7-70.5 0-130.3-47.7-151.7-111.5H32.9v69.9c44.3 87.4 134.7 147 239.1 147z"
      fill="#34A853"
    />
    <path
      d="M120.3 323.4c-10.7-31.7-10.7-65.9 0-97.6v-69.9H32.9c-39.6 77.2-39.6 169.1 0 246.3l87.4-69.8z"
      fill="#FBBC05"
    />
    <path
      d="M272 107.7c39.6 0 75.1 13.6 103.1 40.3l77.2-77.2C398.8 24.6 338 0 272 0 167.7 0 77.3 59.6 32.9 147l87.4 69.9c21.4-63.8 81.2-111.2 151.7-111.2z"
      fill="#EA4335"
    />
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
    const { user } = await login({ email, password })
    if (user.role === 'admin' || user.role === 'ladmin') {
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
  window.location.href = 'http://localhost:8000/auth/google';
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
