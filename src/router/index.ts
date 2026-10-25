import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
    { path: '/', name: 'Home', component: () => import('@/views/home/index.vue') },
    { path: '/login', name: 'Login', component: () => import('@/views/login/index.vue') },
    { path: '/register', name: 'Register', component: () => import('@/views/register/index.vue') },
    {
        path: '/product/list',
        name: 'ProductList',
        component: () => import('@/views/product/list.vue')
    },
    {
        path: '/cart',
        name: 'Cart',
        component: () => import('@/views/cart/index.vue')
    },
    {
        path: '/order/confirm',
        name: 'OrderConfirm',
        component: () => import('@/views/order/confirm.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/order/list',
        name: 'OrderList',
        component: () => import('@/views/order/list.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/order/detail/:orderNo',
        name: 'OrderDetail',
        component: () => import('@/views/order/detail.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/user/review',
        name: 'UserReview',
        component: () => import('@/views/user/review.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/user/address',
        name: 'UserAddress',
        component: () => import('@/views/user/address.vue'),
    },
    { path: '/product/:id', name: 'ProductDetail', component: () => import('@/views/product/detail.vue') }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 路由守卫
router.beforeEach(async (to) => {
    const { useUserStore } = await import('@/stores/user')
    const userStore = useUserStore()
    // 已登录用户访问登录/注册页 → 跳首页
    if ((to.path === '/login' || to.path === '/register') && userStore.isLogin) {
        return '/'
    }
})



export default router