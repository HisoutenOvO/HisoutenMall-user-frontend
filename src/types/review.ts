import type { PageQuery } from '@/types/common'

// 待评价列表项
export interface PendingReviewVO {
    orderItemId: number
    orderNo: string
    productId: number
    productName: string
    productImage: string
    skuSpecs: string
    finishTime: string
}

// 发布评价入参
export interface ReviewAddDTO {
    orderItemId: number
    rating: number
    content: string
    images?: string
}

// 评价列表项 (我的评价)
export interface SelfReviewVO {
    id: number
    rating: number
    content: string
    images: string[]
    skuSpecs: string
    createTime: string
}
export interface ReviewDetailVO {
    id: number
    merchantName?: string
    nickname: string
    avatar: string
    rating: number
    content: string
    images: string[]
    createTime: string
    productName: string
    productImage: string
    skuSpecs: string
    orderNo: string
}
// 商品详情页的评价列表项
export interface UserReviewVO {
    id: number
    nickname: string
    avatar: string
    rating: number
    content: string
    images: string[]
    skuSpecs: string
    createTime: string
}