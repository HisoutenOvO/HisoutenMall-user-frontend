import request from '@/utils/request'
import type { Result, PageResult } from '@/types/common'
import type {ShopDetailVO, ShopFollowVO, ShopProductPageQueryDTO} from '@/types/shop'
import type { UserProductPageResultVO } from '@/types/product'

// 获取店铺详情
export const getShopDetailApi = (merchantId: number) =>
    request.get<Result<ShopDetailVO>>(`/user/shop/${merchantId}`)

// 关注店铺
export const followShopApi = (merchantId: number) =>
    request.post<Result>(`/user/shop/${merchantId}/follow`)

// 取消关注
export const unfollowShopApi = (merchantId: number) =>
    request.delete<Result>(`/user/shop/${merchantId}/follow`)

// 获取店铺商品列表
export const getShopProductPageApi = (merchantId: number, params: ShopProductPageQueryDTO) =>
    request.get<Result<PageResult<UserProductPageResultVO>>>(`/user/shop/${merchantId}/product/page`, { params })

// 检查是否已关注店铺
export const checkFollowShopApi = (merchantId: number) =>
    request.get<Result<boolean>>(`/user/shop/${merchantId}/check-follow`)

export const getFollowShopPageApi = (params: { page: number, pageSize: number }) =>
    request.get<Result<PageResult<ShopFollowVO>>>('/user/shop/follow/page', { params })