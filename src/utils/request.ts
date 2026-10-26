import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import {ElMessage} from 'element-plus'

const service = axios.create({
    baseURL: '/api',
    timeout: 6000
})

service.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) config.headers['satoken'] = token
        return config
    },
    (error) => Promise.reject(error)
)

service.interceptors.response.use(
    (response) => response.data,
    async (error) => {
        if (error.response?.status === 401 || error.response?.data?.code === 401) {
            // 1. 清除本地失效的 Token
            localStorage.removeItem('token')

            // 2. 动态引入路由和消息提示
            const { default: router } = await import('@/router')
            ElMessage.error('登录已过期，请重新登录')

            // 3. 跳转登录页，并带上当前所在的路径
            const currentPath = router.currentRoute.value.fullPath
            if (currentPath !== '/login') {
                router.push({
                    path: '/login',
                    query: { redirect: currentPath }
                })
            }
            return Promise.reject(error)
        }
        return Promise.reject(error)
    }
)

export default service as unknown as {
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
}