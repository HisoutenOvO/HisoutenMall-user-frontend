import request from '@/utils/request'
import type { Result } from '@/types/common'
import type { AddressListVO, AddressDetailVO, AddressAddDTO, AddressUpdateDTO } from '@/types/address'

// 获取列表
export const getAddressListApi = () =>
    request.get<Result<AddressListVO[]>>('/user/address/list')

// 获取详情
export const getAddressDetailApi = (id: number) =>
    request.get<Result<AddressDetailVO>>(`/user/address/${id}`)

// 新增
export const addAddressApi = (data: AddressAddDTO) =>
    request.post<Result>('/user/address', data)

// 修改
export const updateAddressApi = (id: number, data: AddressUpdateDTO) =>
    request.put<Result>(`/user/address/${id}`, data)

// 设为默认
export const setDefaultAddressApi = (id: number) =>
    request.put<Result>(`/user/address/${id}/default`)

// 删除
export const deleteAddressApi = (id: number) =>
    request.delete<Result>(`/user/address/${id}`)