export interface CartItemVO {
    id: number
    productId: number
    skuId: number
    merchantId: number
    merchantName: string
    productName: string
    skuSpecs: string
    image: string
    price: number
    quantity: number
    stock: number
    checked: number
    invalid: boolean
    invalidReason?: string
}

export interface CartAddDTO {
    skuId: number
    quantity: number
}