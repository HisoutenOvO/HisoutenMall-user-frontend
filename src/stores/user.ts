import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { UserInfoVO } from '@/types/auth'
import { getUserInfoApi, logoutApi } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
    const token = ref<string>(localStorage.getItem('token') || '')
    const userInfo = ref<UserInfoVO | null>(null)

    const isLogin = computed(() => !!token.value)

    const setToken = (t: string) => {
        token.value = t
        localStorage.setItem('token', t)
    }

    const fetchUserInfo = async () => {
        const res = await getUserInfoApi()
        if (res.code === 1) {
            userInfo.value = res.data
        }
    }

    const logout = async () => {
        try {
            await logoutApi()
        } catch {}
        token.value = ''
        userInfo.value = null
        localStorage.removeItem('token')
    }

    return { token, userInfo, isLogin, setToken, fetchUserInfo, logout }
})