<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'

const router = useRouter()
const cartStore = useCartStore()

onMounted(() => {
  // 页面加载时拉取一次角标数量
  cartStore.fetchCartCount()
})

const goTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div class="right-sidebar">
    <div class="sidebar-item" @click="goTo('/')">
      <el-icon class="icon"><HomeFilled /></el-icon>
      <span>首页</span>
    </div>

    <!-- 购物车带角标 -->
    <div class="sidebar-item" @click="goTo('/cart')">
      <el-badge :value="cartStore.cartCount" :hidden="cartStore.cartCount === 0" :max="99" class="cart-badge">
        <el-icon class="icon"><ShoppingCart /></el-icon>
      </el-badge>
      <span>购物车</span>
    </div>

    <div class="sidebar-item" @click="goTo('/user/home')">
      <el-icon class="icon"><User /></el-icon>
      <span>我的</span>
    </div>

    <div class="sidebar-item" @click="goTo('/user/address')">
      <el-icon class="icon"><Location /></el-icon>
      <span>地址</span>
    </div>
  </div>
</template>

<style scoped>
.right-sidebar {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 60px;
  background: #fff;
  border-radius: 8px 0 0 8px;
  box-shadow: -2px 0 10px rgba(0,0,0,0.05);
  z-index: 999;
  display: flex;
  flex-direction: column;
  padding: 10px 0;
}

.sidebar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
  cursor: pointer;
  color: #666;
  font-size: 12px;
  border-bottom: 1px solid #f4f4f4;
  transition: all 0.2s;
}

.sidebar-item:last-child {
  border-bottom: none;
}

.sidebar-item:hover {
  color: #e1251b;
  background: #fafafa;
}
/* 调整 element-plus badge 的样式，让角标刚好飘在图标右上角 */
.cart-badge {
  display: flex;
  align-items: center;
  justify-content: center;
}
:deep(.el-badge__content) {
  transform: translateY(-5px) translateX(5px);
  background-color: #e1251b;
  border: none;
}
.icon {
  font-size: 20px;
  margin-bottom: 5px;
  color: #666; /* 给个默认颜色 */
}
.sidebar-item:hover .icon {
  color: #e1251b; /* 悬浮变红 */
}
</style>