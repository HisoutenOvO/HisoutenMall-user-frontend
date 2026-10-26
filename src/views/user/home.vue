<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import { getUserProfileApi } from '@/api/user'
import { getFavoritePageApi } from '@/api/favorite'
import { getOrderPageApi } from '@/api/order'
import { getPendingReviewsApi } from '@/api/review'
import type { UserDetailVO } from '@/types/user'
import type { UserFavoritePageResultVO } from '@/types/favorite'
import UserSideBar from "@/components/UserSideBar.vue"
import { getMyCouponPageApi } from "@/api/coupon"
import { getHistoryPageApi } from "@/api/history"
import type { UserHistoryPageResultVO } from "@/types/history"

const router = useRouter()
const loading = ref(true)
const userInfo = ref<UserDetailVO | null>(null)
const favoriteList = ref<UserFavoritePageResultVO[]>([])
const historyList = ref<UserHistoryPageResultVO[]>([])
const stats = ref({ pendingPayment: 0, pendingReceive: 0, pendingReview: 0, couponCount: 0 })

const loadDashboardData = async () => {
  loading.value = true
  try {
    const [profileRes, favRes, historyRes, orderPayRes, orderReceiveRes, reviewRes, couponRes] = await Promise.all([
      getUserProfileApi(), getFavoritePageApi({ page: 1, pageSize: 4 }), getHistoryPageApi({ page: 1, pageSize: 4 }),
      getOrderPageApi({ page: 1, pageSize: 1, status: 0 }), getOrderPageApi({ page: 1, pageSize: 1, status: 3 }),
      getPendingReviewsApi({ page: 1, pageSize: 1 }), getMyCouponPageApi({ page: 1, pageSize: 1, status: 0 })
    ])
    if (profileRes.code === 1) userInfo.value = profileRes.data
    if (favRes.code === 1) favoriteList.value = favRes.data.records || []
    if (historyRes.code === 1) historyList.value = historyRes.data.records || []
    if (orderPayRes.code === 1) stats.value.pendingPayment = orderPayRes.data.total
    if (orderReceiveRes.code === 1) stats.value.pendingReceive = orderReceiveRes.data.total
    if (reviewRes.code === 1) stats.value.pendingReview = reviewRes.data.total
    if (couponRes.code === 1) stats.value.couponCount = couponRes.data.total
  } catch (e) { ElMessage.error('加载数据失败') } finally { loading.value = false }
}

onMounted(() => loadDashboardData())
</script>

<template>
  <div class="home-page">
    <TopNav />
    <Header />
    <div class="container layout-wrapper" v-loading="loading">
      <div class="sidebar-sticky">
        <UserSideBar />
      </div>
      <div class="right-content">
        <div class="user-header-card">
          <div class="avatar-box">
            <el-avatar :size="80" :src="userInfo?.avatar">{{ userInfo?.nickname?.charAt(0) || '用户' }}</el-avatar>
          </div>
          <div class="user-info">
            <h2>{{ userInfo?.nickname || userInfo?.username }}</h2>
            <p class="phone">{{ userInfo?.phone ? userInfo.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '未绑定手机' }}</p>
          </div>
          <div class="wallet-stats">
            <div class="stat-item"><span class="num">{{ stats.couponCount }}</span><span class="label">优惠券</span></div>
            <div class="stat-item"><span class="num">0</span><span class="label">京豆</span></div>
            <div class="stat-item"><span class="num">0.00</span><span class="label">余额</span></div>
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-header">
            <h3>我的订单</h3>
            <span class="more" @click="router.push('/order/list')">查看全部订单 ></span>
          </div>
          <div class="order-shortcuts">
            <div class="shortcut-item" @click="router.push('/order/list')">
              <el-icon class="icon"><CreditCard /></el-icon><span class="label">待付款</span>
              <span class="badge" v-if="stats.pendingPayment > 0">{{ stats.pendingPayment }}</span>
            </div>
            <div class="shortcut-item" @click="router.push('/order/list')">
              <el-icon class="icon"><Van /></el-icon><span class="label">待收货</span>
              <span class="badge" v-if="stats.pendingReceive > 0">{{ stats.pendingReceive }}</span>
            </div>
            <div class="shortcut-item" @click="router.push('/user/review')">
              <el-icon class="icon"><ChatDotRound /></el-icon><span class="label">待评价</span>
              <span class="badge" v-if="stats.pendingReview > 0">{{ stats.pendingReview }}</span>
            </div>
            <div class="shortcut-item">
              <el-icon class="icon"><Tools /></el-icon><span class="label">退款/售后</span>
            </div>
          </div>
        </div>

        <div class="three-col-layout">
          <div class="col-card">
            <div class="col-header"><h3>我的收藏</h3><span class="more" @click="router.push('/user/favorite')">查看更多 ></span></div>
            <div class="fav-grid">
              <div class="fav-item" v-for="item in favoriteList" :key="item.id" @click="router.push(`/product/${item.productId}`)">
                <img :src="item.mainImage" alt="商品" /><p class="name">{{ item.productName }}</p><p class="price">￥{{ item.minPrice }}</p>
              </div>
              <div class="empty-fav" v-if="favoriteList.length === 0">暂无收藏</div>
            </div>
          </div>
          <div class="col-card">
            <div class="col-header"><h3>我的足迹</h3><span class="more" @click="router.push('/user/history')">查看更多 ></span></div>
            <div class="fav-grid">
              <div class="fav-item" v-for="item in historyList" :key="item.id" @click="router.push(`/product/${item.productId}`)">
                <img :src="item.mainImage" alt="商品" /><p class="name">{{ item.productName }}</p><p class="price">￥{{ item.minPrice }}</p>
              </div>
              <div class="empty-fav" v-if="historyList.length === 0">暂无足迹</div>
            </div>
          </div>
          <div class="col-card">
            <div class="col-header"><h3>关注店铺</h3><span class="more">查看更多 ></span></div>
            <div class="empty-state">功能暂时关闭</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page { background: #f4f4f4; min-height: 100vh; padding-bottom: 50px; }
.layout-wrapper { display: flex; gap: 24px; margin-top: 20px; align-items: flex-start; }
.sidebar-sticky { position: sticky; top: 20px; flex-shrink: 0; height: fit-content; }
.right-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 15px; }
.panel-card, .user-header-card, .col-card { background: #fff; border-radius: 8px; padding: 20px; }
.user-header-card { display: flex; align-items: center; gap: 20px; }
.user-info h2 { font-size: 20px; color: #333; margin-bottom: 5px; }
.user-info .phone { font-size: 13px; color: #999; }
.wallet-stats { margin-left: auto; display: flex; gap: 40px; padding-right: 20px; }
.stat-item { text-align: center; cursor: pointer; }
.stat-item .num { font-size: 20px; font-weight: bold; color: #333; display: block; }
.stat-item .label { font-size: 13px; color: #999; }
.panel-header, .col-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #f8f8f8; padding-bottom: 10px; }
.panel-header h3, .col-header h3 { font-size: 16px; color: #333; font-weight: bold; }
.more { font-size: 13px; color: #999; cursor: pointer; }
.more:hover { color: #e1251b; }
.order-shortcuts { display: flex; justify-content: space-around; }
.shortcut-item { display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; position: relative; }
.shortcut-item:hover .label { color: #e1251b; }
.shortcut-item .icon { font-size: 28px; color: #666; }
.shortcut-item .label { font-size: 14px; color: #333; transition: color 0.2s; }
.badge { position: absolute; top: -5px; right: -10px; background: #e1251b; color: #fff; font-size: 12px; padding: 0 5px; border-radius: 10px; line-height: 16px; }
.three-col-layout { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
.fav-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.fav-item { cursor: pointer; }
.fav-item img { width: 100%; height: 100px; object-fit: cover; border-radius: 4px; border: 1px solid #eee; }
.fav-item .name { font-size: 12px; color: #333; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fav-item .price { font-size: 14px; color: #e1251b; font-weight: bold; margin-top: 3px; }
.empty-fav, .empty-state { display: flex; justify-content: center; align-items: center; height: 100px; color: #999; font-size: 13px; }
</style>