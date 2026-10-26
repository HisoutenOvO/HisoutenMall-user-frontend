import request from '@/utils/request'
import type { Result, PageResult } from '@/types/common'
import type { UserFavoritePageResultVO } from '@/types/favorite'

// 获取收藏分页
export const getFavoritePageApi = (params: { page: number, pageSize: number }) =>
    request.get<Result<PageResult<UserFavoritePageResultVO>>>('/user/favorite/page', { params })

// 取消收藏 (注意你后端是 /user/favorite/{productId})
export const cancelFavoriteApi = (productId: number) =>
    request.delete<Result>(`/user/favorite/${productId}`)

// 检查是否收藏
export const checkFavoriteApi = (productId: number) =>
    request.get<Result<boolean>>(`/user/favorite/check/${productId}`)