import request from '@/utils/request'
import type { Result, PageResult } from '@/types/common'
import type {PendingReviewVO, ReviewAddDTO, ReviewDetailVO, SelfReviewVO, UserReviewVO} from '@/types/review'

// 获取待评价列表
export const getPendingReviewsApi = (params: any) =>
    request.get<Result<PageResult<PendingReviewVO>>>('/user/review/pending', { params })

// 获取我的已评价列表
export const getSelfReviewsApi = (params: any) =>
    request.get<Result<PageResult<SelfReviewVO>>>('/user/review/self/page', { params })

// 发布评价
export const addReviewApi = (data: ReviewAddDTO) =>
    request.post<Result>('/user/review', data)

// 文件上传 (复用你的通用接口)
export const uploadFileApi = (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request.post<Result<string>>('/file/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
}
// 获取评价详情
export const getReviewDetailApi = (reviewId: number) =>
    request.get<Result<ReviewDetailVO>>(`/user/review/${reviewId}`)

// 删除评价
export const deleteReviewApi = (reviewId: number) =>
    request.delete<Result>(`/user/review/${reviewId}`)

// 分页查询商品评价
export const getProductReviewPageApi = (params: { productId: number; page: number; pageSize: number; rating?: number }) =>
    request.get<Result<PageResult<UserReviewVO>>>('/user/review/page', { params })