import { axiosRequest } from '@/lib/axiosRequest'

export interface User {
  id: number
  name: string
  dob: Date
  phone_number: string
  email: string
  password: string
  image?: string
  role: string
  status: number
  google_id: string
}

export interface Product {
  id: number
  name: string
}

export interface Variant {
  id: number
  product: Product
  price: number
}

export interface CartItem {
  id: number
  cart_id: number
  variant_id: number
  quantity: number
  price_at_time: number
  expires_at: string
  variant: Variant
}

export interface Cart {
  id: number
  user_id: number
  cart_items: CartItem[]
}

interface GetCartResponse {
  cart: Cart
  total_price: number
}

const baseCustomerUrl = '/customer'

export const customerApi = {
  getCart: (): Promise<GetCartResponse> =>
    axiosRequest<{ message: string; status: string; data: Cart; total_price: number }>(
      `${baseCustomerUrl}/cart`, 'GET'
    ).then(res => ({
      cart: res.data,
      total_price: res.total_price,
    })),

  addToCart: (data: { variant_id: number; quantity: number }): Promise<string> =>
    axiosRequest<{ message: string; status: string }>(
      `${baseCustomerUrl}/cart`, 'POST', data
    ).then(res => res.message),

  updateItem: (itemId: number, data: { quantity: number }): Promise<string> =>
    axiosRequest<{ message: string; status: string }>(
      `${baseCustomerUrl}/cart/${itemId}`, 'PATCH', data
    ).then(res => res.message),

  removeItem: (itemId: number): Promise<string> =>
    axiosRequest<{ message: string; status: string }>(
      `${baseCustomerUrl}/cart/${itemId}`, 'DELETE'
    ).then(res => res.message),

  clearCart: (): Promise<string> =>
    axiosRequest<{ message: string; status: string }>(
      `${baseCustomerUrl}/cart`, 'DELETE'
    ).then(res => res.message),
}

const baseAdminUrl = '/admin'

export const AdminApi = {
  getAllUsers: (): Promise<User[]> =>
    axiosRequest<{ message: string; status: string; data: User[] }>(`${baseAdminUrl}/users`, 'GET')
      .then(res => res.data),

  changeStatusUser: (id: number, status: number): Promise<boolean> =>
    axiosRequest<{ message: string; status: string; data: boolean }>(
      `${baseAdminUrl}/users/${id}`,
      'PATCH',
      { status }
    ).then(res => res.status === "success")
}
