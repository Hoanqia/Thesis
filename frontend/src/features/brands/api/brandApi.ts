// frontend\src\features\brands\api\brandApi.ts
import { axiosRequest } from "@/lib/axiosRequest";

export interface Brand {
  id: number;
  name: string;
  slug: string;
  status: number; // backend trả 0 hoặc 1
}

// Dữ liệu gửi khi tạo mới brand
export interface CreateBrandDTO {
  name: string;           // Bắt buộc
  status?: number;        // Không bắt buộc
}

// Dữ liệu gửi khi cập nhật brand (PATCH) - tất cả đều không bắt buộc
export interface UpdateBrandDTO {
  name?: string;          // Không bắt buộc
  status?: number;        // Không bắt buộc
}

// Lấy danh sách brand, trả về Brand[]
export async function fetchBrands(): Promise<Brand[]> {
  return axiosRequest<{ data: Brand[] }>("admin/brands", "GET")
    .then(res => res.data);
}

// Tạo mới brand, bắt buộc có name, status không bắt buộc
export async function createBrand(data: CreateBrandDTO): Promise<Brand> {
  return axiosRequest<{ data: Brand }>("admin/brands", "POST", data)
    .then(res => res.data);
}

// Cập nhật brand theo slug, dữ liệu có thể có hoặc không có name/status
export async function updateBrand(
  slug: string,
  data: UpdateBrandDTO
): Promise<Brand> {
  return axiosRequest<{ data: Brand }>(`admin/brands/${slug}`, "PATCH", data)
    .then(res => res.data);
}

// Xóa brand theo slug, trả về void
export async function deleteBrand(slug: string): Promise<void> {
  return axiosRequest<{ message: string }>(`admin/brands/${slug}`, "DELETE")
    .then(() => {});
}

// Toggle trạng thái brand (đổi 0 thành 1 hoặc ngược lại)
export async function toggleBrandStatus(slug: string, currentData: Brand): Promise<Brand> {
  const newStatus = currentData.status === 1 ? 0 : 1;
  return axiosRequest<{ data: Brand }>(`admin/brands/${slug}`, "PATCH", {
    status: newStatus,
  }).then(res => res.data);
}
