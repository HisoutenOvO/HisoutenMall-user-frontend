<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const menuGroups = [
  {
    title: '订单中心',
    items: [
      { name: '我的订单', path: '/order/list' },
      { name: '评价晒单', path: '/user/review' },
    ]
  },
  {
    title: '我的钱包',
    items: [
      { name: '优惠券', path: '/user/coupon' },
    ]
  },
  {
    title: '我的足迹',
    items: [
      { name: '浏览历史', path: '/user/history' }
    ]
  },
  {
    title: '账户设置',
    items: [
      { name: '收货地址', path: '/user/address' },
    ]
  }
]

const goTo = (path: string) => {
  router.push(path)
}

const isActive = (path: string) => {
  return route.path === path
}
</script>

<template>
  <div class="left-sidebar">
    <div class="user-info">
      <div class="avatar">👤</div>
      <div class="name">Hi, 欢迎回来</div>
    </div>

    <div class="menu-group" v-for="(group, index) in menuGroups" :key="index">
      <div class="menu-title">{{ group.title }}</div>
      <div
          v-for="item in group.items"
          :key="item.path"
          class="menu-item"
          :class="{ active: isActive(item.path) }"
          @click="goTo(item.path)"
      >
        {{ item.name }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.left-sidebar {
  width: 200px;
  background: #fff;
  border-radius: 8px;
  padding: 20px 0;
  height: fit-content;
  flex-shrink: 0;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px 20px;
  border-bottom: 1px solid #eee;
}
.user-info .avatar {
  width: 40px;
  height: 40px;
  background: #ddd;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.user-info .name {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}
.menu-group {
  margin-top: 15px;
}
.menu-title {
  font-weight: bold;
  color: #333;
  padding: 0 20px;
  margin-bottom: 10px;
  font-size: 14px;
}
.menu-item {
  padding: 10px 20px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  border-right: 3px solid transparent;
}
.menu-item:hover {
  color: #e1251b;
  background: #fafafa;
}
.menu-item.active {
  color: #e1251b;
  background: #fef5f5;
  border-right: 3px solid #e1251b;
  font-weight: bold;
}
</style>