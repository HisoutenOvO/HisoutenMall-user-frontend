<script setup lang="ts">
import { computed } from 'vue'
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
</script>

<template>
  <div class="top-nav">
    <div class="container inner">
      <div class="left">
        <span class="loc">📍 云南</span>
        <router-link to="/">京东首页</router-link>
      </div>
      <div class="right">
        <template v-if="userStore.isLogin">
          <span class="welcome">你好，{{ displayName }}</span>
          <span class="divider">|</span>
          <a @click="handleLogout">退出</a>
        </template>
        <template v-else>
          <router-link to="/login">登录</router-link>
          <span class="split">/</span>
          <router-link to="/register">注册</router-link>
        </template>
        <span class="divider">|</span>
        <a>我的订单</a>
        <span class="divider">|</span>
        <a>我的京东</a>
        <span class="divider">|</span>
        <a>企业采购</a>
        <span class="divider">|</span>
        <a>客户服务</a>
        <span class="divider">|</span>
        <a>网站导航</a>
        <span class="divider">|</span>
        <a>手机京东</a>
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
</style>