export interface ShopDetailVO {
    merchantId: number
    shopName: string
    shopLogo: string
    shopDescription: string
    followerCount: number
    productCount: number
    isFollowed: boolean
}

export interface ShopProductPageQueryDTO {
    page: number
    pageSize: number
    sortType: number // 1-综合推荐 2-销量降序 3-新品/时间降序 4-价格升序 5-价格降序
}

export interface ShopFollowVO{
    merchantId: number,
    shopName: string,
    shopLogo: string,
    followerCount: number,
    productCount: number,
    followTime: number
}