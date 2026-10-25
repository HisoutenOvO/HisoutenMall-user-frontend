export interface AddressListVO {
    id: number
    receiverName: string
    receiverPhone?: string
    province: string
    city: string
    district: string
    detail: string
    isDefault: number
}

// 详情
export interface AddressDetailVO extends AddressListVO {
    receiverPhone: string
    createTime: string
    updateTime: string
}

// 新增/修改入参
export interface AddressAddDTO {
    receiverName: string
    receiverPhone: string
    province: string
    city: string
    district: string
    detail: string
    isDefault: number
}
export type AddressUpdateDTO = AddressAddDTO