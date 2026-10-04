import request from '@/utils/request'
import type { Result } from '@/types/common'
import type { CategoryListVO } from '@/types/category'

export const getCategoryListApi = () =>
    request.get<Result<CategoryListVO[]>>('/user/category/list')