<script setup lang="ts">
import {computed, onMounted} from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const displayName = computed(() => {
  return userStore.userInfo?.nickname || userStore.userInfo?.username || ''
})

const handleLogout = async () => {
  await userStore.logout()
  router.push('/')
}

onMounted(() => {
  // 如果本地有 token，但 Pinia 里没有用户信息，就重新请求一次
  if (localStorage.getItem('token') && !userStore.userInfo) {
    userStore.fetchUserInfo() // 确保你的 store 里有这个方法
  }
})
</script>

<template>
  <div class="top-nav">
    <div class="container inner">
      <div class="left">
        <span class="loc">📍 云南</span>
        <router-link to="/">HisoutenMall首页</router-link>
      </div>
      <div class="right">
        <!-- 登录状态 -->
        <template v-if="userStore.isLogin">
          <span class="welcome">你好，{{ displayName }}</span>
          <span class="divider">|</span>
          <a @click="handleLogout">退出</a>
        </template>
        <!-- 未登录状态 -->
        <template v-else>
          <router-link to="/login">登录</router-link>
          <span class="split">/</span>
          <router-link to="/register">注册</router-link>
        </template>

        <span class="divider">|</span>
        <span class="nav-item" @click="router.push('/order/list')">我的订单</span>
        <span class="divider">|</span>
        <span class="nav-item" @click="router.push('/user/home')">我的京东</span>
        <span class="divider">|</span>
        <span class="nav-item" @click="router.push('/user/favorite')">我的收藏</span>
        <span class="divider">|</span>
        <span class="nav-item" @click="router.push('/user/coupon')">优惠券</span>
        <span class="divider">|</span>
        <span class="nav-item" @click="router.push('/cart')">购物车</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.top-nav {
  background: #f4f4f4;
  border-bottom: 1px solid #e8e8e8;
  height: 30px;
  line-height: 30px;
  font-size: 12px;
  color: #666;
}
.inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.left {
  display: flex;
  align-items: center;
  gap: 20px;
}
.right {
  display: flex;
  align-items: center;
  gap: 6px;
}
.right a,
.left a {
  color: #666;
  cursor: pointer;
  text-decoration: none;
}
.right a:hover,
.left a:hover {
  color: #e1251b;
}
.welcome {
  color: #e1251b;
}
.divider {
  color: #ddd;
}
.split {
  color: #ddd;
}
.loc {
  color: #999;
}
.right a,
.left a,
.nav-item {
  color: #666;
  cursor: pointer;
  text-decoration: none;
}
.right a:hover,
.left a:hover,
.nav-item:hover {
  color: #e1251b;
}
</style>