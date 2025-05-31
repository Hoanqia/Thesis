// features/categories/api/categoryApi.ts

import { axiosRequest } from '@/lib/axiosRequest'; // chỉnh lại đường dẫn cho đúng

export interface Category {
  id: number;
  name: string;
  slug: string;
  status: boolean;
  id_parent?: number | null;  // Thêm id_parent nếu có thể null hoặc undefined

}

export interface CategoryCreateDto {
  name: string;
  slug: string;
  status: boolean;
  id_parent?: number | null;
}

export interface CategoryUpdateDto {
  name: string;
  slug: string;
  status: boolean;
  id_parent?: number | null;
}

/**
 * Lấy danh sách categories
 */
export function fetchCategories(): Promise<Category[]> {
  return axiosRequest<{ data: Category[] }>('/categories', 'GET')
    .then(res => res.data);
}


/**
 * Tạo mới category
 */
export function createCategory(data: CategoryCreateDto): Promise<Category> {
  return axiosRequest<Category>('/admin/categories', 'POST', data);
}

/**
 * Cập nhật category theo slug
 */
export function updateCategory(slug: string, data: CategoryUpdateDto): Promise<Category> {
  return axiosRequest<Category>(`/admin/categories/${slug}`, 'PATCH', data);
}

/**
 * Xóa category theo slug
 */
export function deleteCategory(slug: string): Promise<void> {
  return axiosRequest<void>(`/admin/categories/${slug}`, 'DELETE');
}

/**
 * Chuyển đổi trạng thái (toggle status) của category theo slug
 * Giả sử API endpoint có hỗ trợ hoặc ta sẽ gọi PATCH với status mới
 */
export function toggleCategoryStatus(slug: string, newStatus: boolean): Promise<Category> {
  return axiosRequest<Category>(`/admin/categories/${slug}`, 'PATCH', { status: newStatus });
}

/**
 * Lấy danh sách category con theo id của category cha
 * @param parentId id của category cha (id_parent)
 */
export function fetchChildCategories(parentId: number): Promise<Category[]> {
  return axiosRequest<{ data: Category[] }>(`/admin/categories-child/${parentId}`, 'GET')
    .then(res => res.data);
}

export function fetchParentCategories(): Promise<Category[]> {
  return axiosRequest<{ data: Category[] }>('/admin/categories-parents', 'GET')
    .then(res => res.data);
}