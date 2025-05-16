import axios from '@/libs/axios'

export type LoginPayload = {
  email: string
  password: string
}

export type LoginResponse = {
  user: {
    id: number
    name: string
    email: string
  }
}

export const login = async (payload: LoginPayload): Promise<LoginResponse> => {
  const response = await axios.post<LoginResponse>('/login', payload, {
    withCredentials: true, // đảm bảo gửi cookie trong request login
  })
  return response.data
}
