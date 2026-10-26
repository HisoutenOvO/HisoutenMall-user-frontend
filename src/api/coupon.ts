import request from '@/utils/request'
import type {PageResult, Result} from '@/types/common'
import type { UsableCouponVO } from '@/types/order'
import type {UserCouponVO} from "@/types/coupon.ts";

export const getUsableCouponsApi = (merchantId: number, orderAmount: number) =>
    request.get<Result<UsableCouponVO[]>>(`/user/coupon/usable?merchantId=${merchantId}&orderAmount=${orderAmount}`)

// 获取我的优惠券列表
export const getMyCouponPageApi = (params: { page: number, pageSize: number, status?: number }) =>
    request.get<Result<PageResult<UserCouponVO>>>('/user/coupon/page', { params })