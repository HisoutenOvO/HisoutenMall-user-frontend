import request from '@/utils/request'
import type { Result } from '@/types/common'
import type { BrandListVO } from '@/types/brand'

export const getBrandListApi = () => {
    return request.get<Result<BrandListVO[]>>('/user/brand/list')
}