// specificationApi.ts 
import { axiosRequest } from '@/lib/axiosRequest';
export type ValidDataType = "int" | "decimal" | "text" | "option";

export interface SpecOption {
  id: number;
  value: string;
}

export interface Specification {
  id: number;
  name: string;
  category_id: number;
  data_type: ValidDataType;
  unit?: string;
  description?: string;
  spec_options?: SpecOption[]; // thêm dòng này
}

export interface CreateSpecDto {
  name: string;
  category_id: number;
  data_type?: string;
  unit?: string;
  description?: string;
  options?: string[];
}

export interface UpdateSpecDto {
  name?: string;
  category_id?: number;
  data_type?: string;
  unit?: string;
  description?: string;
  options?: string[];
}

// Lấy danh sách specifications theo category_id
// fetchSpecificationsByBrandSlug.ts


export async function fetchSpecValueSuggestions(
  specId: number,
  query: string = ''
): Promise<string[]> {
  // Tạo URL với query params
  const url = `admin/products/specifications/spec-value-suggestions?spec_id=${specId}&query=${encodeURIComponent(query)}`;

  // Gọi API, backend trả về { success: boolean, suggestions: string[] }
  return axiosRequest<{ data: string[] }>(url, 'GET')
    .then(res => res.data);
}

export async function fetchSpecificationsByCategoryId(id: number): Promise<Specification[]> {
  return axiosRequest<{ data: Specification[] }>(`admin/categories/${id}/specifications`, 'GET')
    .then(res => res.data);
}

export async function fetchSpecificationsByProductId(id: number): Promise<Specification[]> {
  return axiosRequest<{ data: Specification[] }>(`admin/product/specifications/${id}`, 'GET')
    .then(res => res.data);
}


// Tạo mới specification
export async function createSpecification(data: CreateSpecDto): Promise<Specification> {
  return await axiosRequest<Specification>('admin/specifications', 'POST', data);
}

// Lấy chi tiết 1 specification
export async function getSpecification(id: number): Promise<Specification> {
  return await axiosRequest<Specification>(`admin/specifications/${id}`, 'GET');
}

// Cập nhật specification (PATCH hoặc PUT, backend bạn đang dùng PUT)
export async function updateSpecification(id: number, data: UpdateSpecDto): Promise<Specification> {
  return await axiosRequest<Specification>(`admin/specifications/${id}`, 'PATCH', data);
}

// Xoá specification
export async function deleteSpecification(id: number): Promise<void> {
  await axiosRequest<void>(`admin/specifications/${id}`, 'DELETE');
}

// Tìm kiếm specification theo keyword (và category_id nếu có)
export async function searchSpecifications(keyword: string, categoryId?: number): Promise<Specification[]> {
  const body: Record<string, any> = { keyword };
  if (categoryId) {
    body.category_id = categoryId;
  }
  return await axiosRequest<Specification[]>('admin/specifications/search', 'POST', body);
}
