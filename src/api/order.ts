import request from '@/utils/request'
import type { Result, PageResult } from '@/types/common'
import type {
    OrderCreateVO,
    OrderPreviewVO,
    UserOrderPageResultVO,
    UserOrderPageQueryDTO,
    UserOrderDetailVO
} from '@/types/order'

// 结算页预计算
export const getOrderPreviewApi = (data: { addressId: number; userCouponIds?: number[] }) => {
    return request.post<Result<OrderPreviewVO>>('/user/order/preview', data)
}

// 创建订单 (从购物车)
export const createOrderFromCartApi = (data: { addressId: number; userCouponIds: number[] }) =>
    request.post<Result<OrderCreateVO>>('/user/order/create-from-cart', data)

// 立即购买预计算
export const getOrderPreviewDirectApi = (data: { skuId: number; quantity: number; userCouponId?: number }) => {
    return request.post<Result<OrderPreviewVO>>('/user/order/preview-direct', data)
}

// 直接下单
export const createOrderDirectApi = (data: { addressId: number; skuId: number; quantity: number; userCouponId?: number }) =>
    request.post<Result<OrderCreateVO>>('/user/order/create-direct', data)


// 订单分页查询
export const getOrderPageApi = (params: UserOrderPageQueryDTO) =>
    request.get<Result<PageResult<UserOrderPageResultVO>>>('/user/order/page', { params })

// 取消订单
export const cancelOrderApi = (orderNo: string) =>
    request.put<Result>(`/user/order/${orderNo}/cancel`)

// 获取订单详情
export const getOrderDetailApi = (orderNo: string) =>
    request.get<Result<UserOrderDetailVO>>(`/user/order/${orderNo}`)

// 确认收货
export const receiveOrderApi = (orderNo: string) =>
    request.put<Result>(`/user/order/${orderNo}/receive`)