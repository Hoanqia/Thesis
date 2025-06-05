import { axiosRequest } from '@/lib/axiosRequest';

export interface UserAdresss{
    id: number
    user_id: number
    province: string
    district: string
    ward: string
    street_address: string
    phone: string
    is_default: number
    province_name: string
    district_name: string
    ward_name: string
}

export interface createAddressPayload{
    province: string
    district: string
    ward: string
    street_address: string
    phone: string
    is_default: number
    province_name: string
    district_name: string
    ward_name: string
}
const baseUrl = "/customer"

export type UpdateAddressPayload = Partial<createAddressPayload>;
export const addressApi = {
    fetchAll: (): Promise<UserAdresss[]> => 
        axiosRequest<{ message: string; status: string; data: UserAdresss[] }>(`${baseUrl}/addresses`,"GET")
        .then(res => res.data),
    
    fetchById: (id: number): Promise<UserAdresss> => 
        axiosRequest<{ message: string; status: string; data: UserAdresss }>(`${baseUrl}/addresses/${id}`,"GET")
        .then(res => res.data),
    create: (payload: createAddressPayload): Promise<UserAdresss> => 
        axiosRequest<{ message: string; status: string; data: UserAdresss }>(`${baseUrl}/addresses`,"POST",payload)
    .then(res => res.data),
    update: (id: number, payload: UpdateAddressPayload): Promise<UserAdresss> =>
        axiosRequest<{ message: string; status: string; data: UserAdresss }>(
          `${baseUrl}/addresses/${id}`,
          'PATCH',
          payload
        ).then(res => res.data),
    remove: (id: number): Promise<void> =>
        axiosRequest<{ message: string; status: string }>(
        `${baseUrl}/addresses/${id}`,
        'DELETE'
        ).then(() => {}),
    }