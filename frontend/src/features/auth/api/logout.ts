// features/auth/auth.ts

import { axiosRequest } from '@/lib/axiosRequest'  // Đường dẫn thay đổi tùy theo dự án của bạn

export const handleLogout = async () => {
  try {
    const res = await axiosRequest('/auth/logout', 'POST')
    alert(res.message || 'Đăng xuất thành công')

    // Xóa token trong sessionStorage
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')

    // Điều hướng về trang đăng nhập
    window.location.href = '/login'
  } catch (error: any) {
    alert(error.message || 'Lỗi khi đăng xuất')
  }
}
