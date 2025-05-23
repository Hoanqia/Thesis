import { axiosRequest } from '@/lib/axiosRequest'

export type LoginPayload = {
  email: string
  password: string
}

export type LoginResponse = {
  user: {
    id: number
    name: string
    email: string
    role: string
  }
  access_token: string
  refresh_token: string
}

export const login = async (payload: LoginPayload): Promise<LoginResponse> => {
  const response = await axiosRequest<LoginResponse>('/login', 'POST', payload)

  // Lưu token vào sessionStorage
  sessionStorage.setItem('access_token', response.access_token)
  sessionStorage.setItem('refresh_token', response.refresh_token)

  return response
}
