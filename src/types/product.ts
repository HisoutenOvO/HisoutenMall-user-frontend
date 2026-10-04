import type { PageQuery } from './common'

export interface UserProductPageQueryDTO extends PageQuery {
    keyword?: string
    categoryId?: number
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