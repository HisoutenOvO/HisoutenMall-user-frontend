export interface UserSeckillActivityListVO {
    id: number
    name: string
    merchantName: string
    startTime: string
    endTime: string
    status: number // 0-未开始 1-进行中 2-已结束
    productCount: number
}

export interface UserSeckillProductVO {
    skuId: number
    productId: number
    productName: string
    skuSpecs: string
    image: string
    originalPrice: number
    seckillPrice: number
    seckillStock: number
    limitPerUser: number
}

export interface UserSeckillActivityDetailVO {
    id: number
    name: string
    startTime: string
    endTime: string
    status: number
    remainSeconds: number // 距开始或结束剩余秒数
    products: UserSeckillProductVO[]
}

export interface SeckillExecuteDTO {
    activityId: number
    skuId: number
}