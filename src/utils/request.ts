import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'

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
            localStorage.removeItem('token')
            const { default: router } = await import('@/router')
            router.push('/login')
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