import type {PageQuery} from "@/types/common.ts";

export interface CartItemVO {
    id: number
    productId: number
    skuId: number
    productName: string
    skuSpecs: string
    mainImage: string
    skuImage: string
    price: number
    quantity: number
    merchantId: number
    merchantName: string
}

export interface AddressVO {
    id: number
    receiverName: string
    receiverPhone?: string
    province: string
    city: string
    district: string
    detail: string
    isDefault: number
}

export interface UsableCouponVO {
    userCouponId: number
    name: string
    type: number
    value: number
    minAmount: number
    discountAmount: number
    expireTime: string
}

// 商家预计算明细
export interface MerchantPreviewVO {
    merchantId: number
    merchantName: string
    merchantProductAmount: number
    merchantDiscount: number
    merchantPayAmount: number
    items: CartItemVO[]
}

// 预计算总返回
export interface OrderPreviewVO {
    totalProductAmount: number
    totalDiscountAmount: number
    payAmount: number
    merchantList: MerchantPreviewVO[]
}

export interface OrderCreateVO {
    orderNos: string[]
    totalAmount: number
}
export interface OrderItemVO {
    id: number
    productId: number
    skuId: number
    productName: string
    skuSpecs: string
    image: string
    price: number
    quantity: number
}

export interface UserOrderPageResultVO {
    id: number
    orderNo: string
    merchantId: number
    merchantName: string
    payAmount: number
    status: number
    createTime: string
    receiverName: string
    receiverPhone: string
    receiverAddress: string
    items: OrderItemVO[]
    source: number
}

export interface UserOrderPageQueryDTO extends PageQuery {
    keyword?: string
    status?: number
    source?: number
}
export interface OrderCouponVO {
    couponName: string
    type: number
    value: number
}

export interface UserLogisticsVO {
    company: string
    trackingNo: string
    status: number // 0-待发货 1-已发货 2-已签收
    shipTime: string
    updateTime: string
}

export interface UserOrderDetailVO {
    id: number
    orderNo: string
    status: number
    totalAmount: number
    payAmount: number
    discountAmount: number
    logistics: UserLogisticsVO | null
    receiverName: string
    receiverPhone: string
    receiverAddress: string
    createTime: string
    payTime: string | null
    source: number
    merchantId: number
    merchantName: string
    items: OrderItemVO[]
    couponInfo: OrderCouponVO | null
}