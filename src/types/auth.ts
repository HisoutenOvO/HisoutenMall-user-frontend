export interface LoginDTO {
    username: string
    password: string
}

export interface RegisterDTO {
    username: string
    password: string
    nickname: string
}

export interface LoginVO {
    userId: number
    username: string
    token: string
    role: number
}

export interface UserInfoVO {
    userId: number
    username: string
    role: number
    nickname?: string
    avatar?: string
}