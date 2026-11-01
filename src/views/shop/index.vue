<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import GoodsCard from '@/components/GoodsCard.vue'
import type { ShopDetailVO, ShopProductPageQueryDTO } from '@/types/shop'
import type { UserProductPageResultVO } from '@/types/product'
import { getShopDetailApi, followShopApi, unfollowShopApi, getShopProductPageApi } from '@/api/shop'

const route = useRoute()
const router = useRouter()
const merchantId = Number(route.params.merchantId)

// --- 店铺信息 ---
const shopInfo = ref<ShopDetailVO | null>(null)
const loadingInfo = ref(true)
const followLoading = ref(false)

// --- 商品列表 ---
const productList = ref<UserProductPageResultVO[]>([])
const page = ref(1)
const pageSize = 20
const loadingList = ref(false)
const hasMore = ref(true)
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

// --- 排序参数（严格对齐你的后端规范）---
// 0-综合 1-销量 2-价格升 3-价格降 4-新品
const sortType = ref<number>(0)

// 获取店铺基础信息
const loadShopInfo = async () => {
  loadingInfo.value = true
  try {
    const res = await getShopDetailApi(merchantId)
    if (res.code === 1) {
      shopInfo.value = res.data
    } else {
      ElMessage.error(res.msg || '获取店铺信息失败')
    }
  } catch (e) {
    console.error('获取店铺信息异常', e)
  } finally {
    loadingInfo.value = false
  }
}

// 加载商品列表
const loadProducts = async () => {
  if (loadingList.value || !hasMore.value) return
  loadingList.value = true
  try {
    const params: ShopProductPageQueryDTO = {
      page: page.value,
      pageSize,
      sortType: sortType.value
    }
    const res = await getShopProductPageApi(merchantId, params)
    if (res.code === 1) {
      const records = res.data.records
      if (records.length < pageSize) hasMore.value = false
      productList.value.push(...records)
      page.value++
    } else {
      hasMore.value = false
    }
  } finally {
    loadingList.value = false
  }
}

// 切换排序
const changeSort = (type: number) => {
  // 价格特殊处理：点击价格按钮时，在 2(升序) 和 3(降序) 之间切换
  if (type === 2) {
    if (sortType.value === 2) {
      sortType.value = 3
    } else if (sortType.value === 3) {
      sortType.value = 2
    } else {
      sortType.value = 2
    }
  } else {
    sortType.value = type
  }

  productList.value = []
  page.value = 1
  hasMore.value = true
  loadProducts()
}

// 处理关注/取关
const toggleFollow = async () => {
  if (!localStorage.getItem('token')) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  if (!shopInfo.value || followLoading.value) return

  followLoading.value = true
  try {
    if (shopInfo.value.isFollowed) {
      await unfollowShopApi(merchantId)
      shopInfo.value.isFollowed = false
      shopInfo.value.followerCount--
      ElMessage.success('已取消关注')
    } else {
      await followShopApi(merchantId)
      shopInfo.value.isFollowed = true
      shopInfo.value.followerCount++
      ElMessage.success('关注成功')
    }
  } catch (e) {
    ElMessage.error('操作失败')
  } finally {
    followLoading.value = false
  }
}

onMounted(() => {
  loadShopInfo()
  loadProducts()

  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) {
      loadProducts()
    }
  }, { rootMargin: '200px' })

  if (sentinelRef.value) {
    observer.observe(sentinelRef.value)
  }
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <TopNav />
  <Header />

  <div class="container shop-page">
    <!-- 顶部：店铺信息卡片 -->
    <!-- 修复：用 v-if/v-else 处理加载状态，防止变成大白块 -->
    <div class="shop-header">
      <template v-if="loadingInfo">
        <div style="width: 100%; text-align: center; color: #999;">加载店铺信息中...</div>
      </template>
      <template v-else-if="shopInfo">
        <div class="shop-info-left">
          <div class="shop-logo-box">
            <img :src="shopInfo.shopLogo || 'https://via.placeholder.com/120'" alt="logo" />
          </div>
          <div class="shop-details">
            <h1 class="shop-name">
              {{ shopInfo.shopName }}
              <span class="self-tag">自营</span>
            </h1>
            <p class="shop-stats">{{ shopInfo.followerCount }} 万人关注</p>
          </div>
        </div>

        <div class="shop-actions">
          <el-button round size="large" plain class="btn-service">
            <el-icon><Service /></el-icon> 店铺客服
          </el-button>
          <el-button
              round
              size="large"
              :type="shopInfo.isFollowed ? 'info' : 'danger'"
              :class="{ 'btn-followed': shopInfo.isFollowed }"
              :loading="followLoading"
              @click="toggleFollow"
          >
            <el-icon v-if="!shopInfo.isFollowed"><Plus /></el-icon>
            {{ shopInfo.isFollowed ? '已关注' : '关注店铺' }}
          </el-button>
        </div>
      </template>
      <template v-else>
        <div style="width: 100%; text-align: center; color: #999;">获取店铺信息失败</div>
      </template>
    </div>

    <!-- 底部：左右分栏布局 -->
    <div class="shop-body">
      <!-- 左侧：店铺菜单 -->
      <div class="shop-sidebar">
        <div class="menu-item active">全部商品</div>
        <div class="menu-item">热销榜单 <el-icon><ArrowDown /></el-icon></div>
        <div class="menu-item">按系列购买 <el-icon><ArrowDown /></el-icon></div>
        <div class="menu-item">按位置购买 <el-icon><ArrowDown /></el-icon></div>
        <div class="menu-item">按需求购买 <el-icon><ArrowDown /></el-icon></div>
        <div class="menu-item">按价格购买 <el-icon><ArrowDown /></el-icon></div>

        <div class="qr-code-box">
          <br><br><br><br><br>
        </div>
      </div>

      <!-- 右侧：商品列表区 -->
      <div class="shop-content">
        <!-- 排序工具栏 -->
        <div class="sort-bar">
          <div class="sort-left">
            <!-- 严格对齐后端的 0-4 规范 -->
            <div class="sort-item" :class="{ active: sortType === 0 }" @click="changeSort(0)">推荐</div>
            <div class="sort-item" :class="{ active: sortType === 1 }" @click="changeSort(1)">销量</div>
            <div class="sort-item" :class="{ active: sortType === 4 }" @click="changeSort(4)">新品</div>

            <div class="sort-item price-sort" :class="{ active: sortType === 2 || sortType === 3 }" @click="changeSort(2)">
              价格
              <div class="price-arrows">
                <i class="arrow up" :class="{ active: sortType === 2 }"></i>
                <i class="arrow down" :class="{ active: sortType === 3 }"></i>
              </div>
            </div>
          </div>
          <div class="sort-right" v-if="shopInfo">
            共 {{ shopInfo.productCount }} 件商品
          </div>
        </div>

        <!-- 商品网格 -->
        <div class="goods-grid" v-if="productList.length > 0">
          <GoodsCard v-for="item in productList" :key="item.id" :item="item" />
        </div>

        <div v-else-if="!loadingList" class="empty">
          该店铺暂无在售商品
        </div>

        <!-- 无限滚动哨兵 -->
        <div ref="sentinelRef" class="sentinel">
          <div v-if="loadingList" class="loading-text">加载中...</div>
          <div v-else-if="!hasMore && productList.length > 0" class="no-more">已经到底啦 ~</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shop-page { padding-bottom: 60px; margin-top: 20px; }
.shop-header { background: #fff; border-radius: 12px; padding: 30px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04); margin-bottom: 20px; min-height: 120px; }
.shop-info-left { display: flex; align-items: center; gap: 20px; }
.shop-logo-box { width: 90px; height: 90px; border-radius: 8px; overflow: hidden; border: 1px solid #eee; }
.shop-logo-box img { width: 100%; height: 100%; object-fit: cover; }
.shop-details { display: flex; flex-direction: column; gap: 10px; }
.shop-name { font-size: 24px; color: #333; font-weight: bold; margin: 0; display: flex; align-items: center; gap: 10px; }
.self-tag { background: #e1251b; color: #fff; font-size: 12px; padding: 2px 6px; border-radius: 4px; font-weight: normal; }
.shop-stats { color: #999; font-size: 13px; margin: 0; }
.shop-actions { display: flex; gap: 15px; }
.btn-service { color: #333; border-color: #ddd; }
.btn-service:hover { border-color: #e1251b; color: #e1251b; background: #fef5f5; }
.btn-followed { background: #f5f5f5 !important; border-color: #ddd !important; color: #666 !important; }
.shop-body { display: flex; gap: 20px; align-items: flex-start; }
.shop-sidebar { width: 200px; background: #fff; border-radius: 12px; padding: 20px 0; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04); flex-shrink: 0; }
.menu-item { padding: 15px 24px; font-size: 14px; color: #333; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; }
.menu-item:hover { color: #e1251b; background: #fafafa; }
.menu-item.active { background: #fef5f5; color: #e1251b; font-weight: bold; border-left: 3px solid #e1251b; padding-left: 21px; }
.menu-item .el-icon { color: #ccc; font-size: 12px; }
.qr-code-box { margin: 30px auto 0; width: 140px; text-align: center; }
.qr-placeholder { width: 120px; height: 120px; background: #f4f4f4; border: 1px dashed #ccc; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 13px; }
.shop-content { flex: 1; min-width: 0; }
.sort-bar { background: #fff; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; margin-bottom: 20px; height: 56px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04); }
.sort-left { display: flex; height: 100%; }
.sort-item { padding: 0 24px; height: 100%; display: flex; align-items: center; font-size: 15px; color: #333; cursor: pointer; transition: color 0.2s; }
.sort-item:hover { color: #e1251b; }
.sort-item.active { color: #e1251b; font-weight: bold; }
.price-sort { gap: 4px; }
.price-arrows { display: flex; flex-direction: column; gap: 2px; }
.arrow { display: inline-block; width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; }
.arrow.up { border-bottom: 5px solid #ccc; }
.arrow.down { border-top: 5px solid #ccc; }
.price-sort.active .arrow.up.active { border-bottom-color: #e1251b; }
.price-sort.active .arrow.down.active { border-top-color: #e1251b; }
.sort-right { font-size: 13px; color: #999; }
.goods-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.empty { text-align: center; padding: 100px 0; background: #fff; border-radius: 12px; color: #999; font-size: 15px; }
.sentinel { text-align: center; padding: 30px 0; font-size: 14px; color: #999; }
.loading-text { color: #e1251b; }
</style>