import request from '@/utils/request'
import type { Result } from '@/types/common'
import type { LoginDTO, LoginVO, RegisterDTO, UserInfoVO } from '@/types/auth'

export const loginApi = (data: LoginDTO) =>
    request.post<Result<LoginVO>>('/user/login', data)

export const registerApi = (data: RegisterDTO) =>
    request.post<Result>('/user/register', data)

export const logoutApi = () =>
    request.post<Result>('/user/logout')

export const getUserInfoApi = () =>
    request.get<Result<UserInfoVO>>('/user/profile')