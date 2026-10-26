import type { PageQuery } from './common'

export interface UserProductPageQueryDTO extends PageQuery {
    keyword?: string
    categoryId?: number
    sortType?: number // 0-综合(默认) 1-销量 2-价格升序 3-价格降序 4-新品
}

export interface UserProductPageResultVO {
    id: number
    merchantId: number
    categoryId: number
    brandId: number
    name: string
    merchantName: string
    categoryName: string
    brandName: string
    mainImage: string
    minPrice: number
    totalStock: number
}

export interface UserProductDetailVO {
    id: number
    name: string
    subtitle: string
    categoryId: number
    merchantId: number
    merchantName: string
    brandId: number
    categoryName: string
    brandName: string
    mainImage: string
    detail: string
    skuList: UserProductSkuVO[]
}

export interface UserProductSkuVO {
    id: number
    specs: string
    price: number
    stock: number
    image: string
    createTime: string
    updateTime: string
}