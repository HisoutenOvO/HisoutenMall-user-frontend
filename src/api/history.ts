import request from '@/utils/request'
import type { Result, PageResult } from '@/types/common'
import type { UserHistoryPageResultVO } from '@/types/history'

// 获取浏览历史分页
export const getHistoryPageApi = (params: { page: number, pageSize: number }) =>
    request.get<Result<PageResult<UserHistoryPageResultVO>>>('/user/history/page', { params })

// 删除单条历史记录
export const deleteHistoryApi = (productId: number) =>
    request.delete<Result>(`/user/history/${productId}`)

// 清空全部历史记录
export const deleteAllHistoryApi = () =>
    request.delete<Result>('/user/history')

// 记录浏览历史 (在商品详情页调用)
export const addHistoryApi = (productId: number) =>
    request.post<Result>(`/user/history/${productId}`)