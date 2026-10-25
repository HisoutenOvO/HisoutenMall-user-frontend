import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCartCountApi } from '@/api/cart'

export const useCartStore = defineStore('cart', () => {
    const cartCount = ref(0)

    // 刷新角标数量
    const fetchCartCount = async () => {
        const res = await getCartCountApi()
        if (res.code === 1) {
            cartCount.value = res.data || 0
        }
    }

    return { cartCount, fetchCartCount }
})