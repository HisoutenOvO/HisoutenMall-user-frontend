import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import {useUserStore} from "@/stores/user.ts";

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
    { path: '/product/:id', name: 'ProductDetail', component: () => import('@/views/product/detail.vue') },
    {
        path: '/user/home',
        name: 'UserHome',
        component: () => import('@/views/user/home.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/user/favorite',
        name: 'UserFavorite',
        component: () => import('@/views/user/favorite.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/user/history',
        name: 'UserHistory',
        component: () => import('@/views/user/history.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/user/coupon',
        name: 'UserCoupon',
        component: () => import('@/views/user/coupon.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/seckill',
        name: 'Seckill',
        component: () => import('@/views/seckill/index.vue')
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 不需要登录的页面白名单（登录、注册）
const whiteList = ['/login', '/register']

router.beforeEach(async (to) => {
    const userStore = useUserStore()
    const isLogin = !!userStore.token

    // 1. 如果已经登录，去登录/注册页，直接跳回首页
    if (isLogin && whiteList.includes(to.path)) {
        return '/'
    }

    // 2. 如果没登录，且访问的页面不在白名单里 -> 打回登录页
    if (!isLogin && !whiteList.includes(to.path)) {
        // 将当前想去的目的地作为参数带上，登录成功后可以直接跳过去
        return {
            path: '/login',
            query: { redirect: to.fullPath }
        }
    }

    // 3. 已登录且不是去登录页，放行
    return true
})


export default router