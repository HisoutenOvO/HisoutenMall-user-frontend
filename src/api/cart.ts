import request from '@/utils/request'
import type { Result } from '@/types/common'
import type { CartItemVO, CartAddDTO } from '@/types/cart'

// 获取购物车列表
export const getCartListApi = () =>
    request.get<Result<CartItemVO[]>>('/user/cart/list')

// 加入购物车
export const addCartApi = (data: CartAddDTO) =>
    request.post<Result>('/user/cart', data)

// 修改数量
export const updateCartQuantityApi = (cartItemId: number, quantity: number) =>
    request.put<Result>(`/user/cart/${cartItemId}/quantity?quantity=${quantity}`)

// 单条勾选
export const updateCartCheckedApi = (cartItemId: number, checked: number) =>
    request.put<Result>(`/user/cart/${cartItemId}/checked?checked=${checked}`)

// 全选/全不选
export const checkAllCartApi = (checked: number) =>
    request.put<Result>(`/user/cart/check-all?checked=${checked}`)

// 批量删除
export const deleteCartItemsApi = (ids: number[]) =>
    request.delete<Result>('/user/cart', { data: { ids } })

// 获取角标数量
export const getCartCountApi = () =>
    request.get<Result<number>>('/user/cart/count')