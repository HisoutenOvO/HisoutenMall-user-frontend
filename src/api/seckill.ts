import request from '@/utils/request'
import type { Result } from '@/types/common'
import type {
    UserSeckillActivityListVO,
    UserSeckillActivityDetailVO,
    SeckillExecuteDTO
} from '@/types/seckill'

// 获取秒杀活动列表
export const getSeckillActivityListApi = () =>
    request.get<Result<UserSeckillActivityListVO[]>>('/user/seckill/activity')

// 获取秒杀活动详情（含商品）
export const getSeckillActivityDetailApi = (activityId: number) =>
    request.get<Result<UserSeckillActivityDetailVO>>(`/user/seckill/activity/${activityId}`)

// 执行秒杀
export const executeSeckillApi = (data: SeckillExecuteDTO) =>
    request.post<Result<string>>('/user/seckill/execute', data)