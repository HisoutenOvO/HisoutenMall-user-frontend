import request from '@/utils/request'
import type { Result } from '@/types/common'
import type { UserDetailVO } from '@/types/user'

export const getUserProfileApi = () =>
    request.get<Result<UserDetailVO>>('/user/profile')