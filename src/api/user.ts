import request from '@/utils/request'
import type { Result } from '@/types/common'
import type {UserDetailVO, UserUpdateDTO} from '@/types/user'

export const getUserProfileApi = () =>
    request.get<Result<UserDetailVO>>('/user/profile')

// 修改个人信息
export const updateUserProfileApi = (data: UserUpdateDTO) =>
    request.put<Result>('/user/profile', data)