import request from '@/utils/request'
import type { Result, PageResult } from '@/types/common'
import type {
    UserProductPageQueryDTO,
    UserProductPageResultVO,
    UserProductDetailVO
} from '@/types/product'

export const getUserProductPageApi = (params: UserProductPageQueryDTO) =>
    request.get<Result<PageResult<UserProductPageResultVO>>>('/user/product/page', { params })

export const getUserProductDetailApi = (id: number) =>
    request.get<Result<UserProductDetailVO>>(`/user/product/${id}`)