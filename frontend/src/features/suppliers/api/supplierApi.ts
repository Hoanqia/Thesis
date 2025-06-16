// src/api/supplierApi.ts

import { axiosRequest } from '@/lib/axiosRequest';
import type { Method } from 'axios';

export interface Supplier {
  id: number;
  name: string;
  phone: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

interface ApiResponse<T> {
  message: string;
  status: 'success' | 'error';
  data?: T;
}

const RESOURCE = 'admin/suppliers';

export const supplierApi = {
  getAll: async (): Promise<Supplier[]> => {
    const res = await axiosRequest<ApiResponse<Supplier[]>>(RESOURCE, 'GET');
    return res.data || [];
  },

  getById: async (id: number): Promise<Supplier> => {
    const res = await axiosRequest<ApiResponse<Supplier>>(`${RESOURCE}/${id}`, 'GET');
    if (!res.data) throw new Error(res.message);
    return res.data;
  },

  create: async (
    payload: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Supplier> => {
    const res = await axiosRequest<ApiResponse<Supplier>>(RESOURCE, 'POST', payload as any);
    if (!res.data) throw new Error(res.message);
    return res.data;
  },

  update: async (
    id: number,
    payload: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Supplier> => {
    const res = await axiosRequest<ApiResponse<Supplier>>(
      `${RESOURCE}/${id}`,
      'PUT',
      payload as any
    );
    if (!res.data) throw new Error(res.message);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosRequest<void>(`${RESOURCE}/${id}`, 'DELETE');
  }
};

export default supplierApi;
