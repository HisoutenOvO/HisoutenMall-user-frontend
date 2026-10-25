import request from '@/utils/request'
import type { Result } from '@/types/common'
import type { UsableCouponVO } from '@/types/order'

export const getUsableCouponsApi = (merchantId: number, orderAmount: number) =>
    request.get<Result<UsableCouponVO[]>>(`/user/coupon/usable?merchantId=${merchantId}&orderAmount=${orderAmount}`)