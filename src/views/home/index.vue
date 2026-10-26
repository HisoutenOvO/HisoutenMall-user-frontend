<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import CategoryMenu from '@/components/CategoryMenu.vue'
import GoodsCard from '@/components/GoodsCard.vue'
import type { UserProductPageResultVO } from '@/types/product'
import { getUserProductPageApi } from '@/api/product'
import router from "@/router"

const goodsList = ref<UserProductPageResultVO[]>([])
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const hasMore = ref(true)
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const banners = ref<{ id: number, image: string }[]>([])
const currentBanner = ref(0)

const timer = setInterval(() => {
  if (banners.value.length > 0) {
    currentBanner.value = (currentBanner.value + 1) % banners.value.length
  }
}, 3500)
onUnmounted(() => clearInterval(timer))

const loadMore = async () => {
  if (loading.value || !hasMore.value) return
  loading.value = true
  try {
    const res = await getUserProductPageApi({ page: page.value, pageSize })
    if (res.code === 1) {
      const records = res.data.records
      if (page.value === 1 && records.length > 0) {
        banners.value = records.slice(0, 5).map(item => ({
          id: item.id,
          image: item.mainImage
        }))
      }

      if (records.length < pageSize) {
        hasMore.value = false
      }
      goodsList.value.push(...records)
      page.value++
    } else {
      hasMore.value = false
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadMore()

  observer = new IntersectionObserver((entries) => {
    const entry = entries[0]
    if (entry && entry.isIntersecting) {
      loadMore()
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
  <div class="home-wrapper">
    <TopNav />
    <Header />

    <div class="container main-layout">
      <CategoryMenu />

      <div class="banner">
        <template v-if="banners.length > 0">
          <div
              class="banner-track"
              :style="{ transform: `translateX(-${currentBanner * 100}%)` }"
          >
            <img
                v-for="b in banners"
                :key="b.id"
                :src="b.image"
                @click="router.push(`/product/${b.id}`)"
            />
          </div>

          <div class="banner-mask"></div>
          <div class="dots">
            <span
                v-for="(_, i) in banners"
                :key="i"
                :class="{ active: i === currentBanner }"
                @click="currentBanner = i"
            />
          </div>
        </template>
        <div v-else class="banner-placeholder">加载中...</div>
      </div>

      <div class="side-ads">
        <div class="ad ad-1">
          <div class="ad-content">
            <h4>国家补贴</h4>
            <p>惠享正品</p>
          </div>
        </div>
        <div class="ad ad-2">
          <div class="ad-content">
            <h4>精致美妆</h4>
            <p>品质之选</p>
          </div>
        </div>
        <div class="ad ad-3">
          <div class="ad-content">
            <h4>超值百货</h4>
            <p>省心省钱</p>
          </div>
        </div>
        <div class="ad ad-4">
          <div class="ad-content">
            <h4>品质五金</h4>
            <p>超值特惠</p>
          </div>
        </div>
      </div>
    </div>

    <div class="container">
      <div class="seckill-banner" @click="router.push('/seckill')">
        <div class="seckill-left">
          <el-icon class="flash-icon"><Timer /></el-icon>
          <div class="text">
            <h2>HisoutenMall 限时秒杀</h2>
            <p>每日精选好物，限时低价抢购</p>
          </div>
        </div>
        <div class="seckill-right">
          <span class="go-btn">立即前往 <el-icon><ArrowRight /></el-icon></span>
        </div>
      </div>
    </div>

    <div class="container">
      <div class="section-header">
        <h3 class="section-title">
          <el-icon><StarFilled /></el-icon> 为你推荐
        </h3>
      </div>

      <div class="goods-grid">
        <GoodsCard v-for="item in goodsList" :key="item.id" :item="item" />
      </div>

      <div ref="sentinelRef" class="sentinel">
        <div v-if="loading" class="loading">
          <el-icon class="is-loading"><Loading /></el-icon> 加载中...
        </div>
        <div v-else-if="!hasMore" class="no-more">已经到底啦 ~</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-wrapper {
  background: linear-gradient(
      to bottom,
      #e1251b 0%,        /* 顶部大促红 */
      #ff6b6b 180px,     /* 往下缓缓变浅 */
      #ffffff 380px,     /* 较长的过渡区到纯白 */
      #f4f4f4 650px      /* 延伸到底部灰色 */
  ) no-repeat;
  background-color: #f4f4f4;
  min-height: 100vh;
  width: 100%;
}

/* 2. 顶部导航：强制恢复纯灰底，挡住红色，文字恢复深色 */
:deep(.top-nav) {
  background-color: #e3e4e5 !important;
  border-bottom: none !important;
  position: relative;
  z-index: 10;
}

/* 3. Header 搜索区：透明，让红色透出来 */
:deep(.header) {
  background-color: transparent !important;
}

:deep(.header .inner) {
  background-color: transparent !important;
}

/* 4. 解决字看不清的问题：在红底上强制用白字 */
:deep(.header .logo-text),
:deep(.header .logo-sub) {
  color: #ffffff !important;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* 热词和搜索框提示字改为白或浅粉 */
:deep(.header .hots a) {
  color: rgba(255, 255, 255, 0.85) !important;
}

:deep(.header .hots a:hover) {
  color: #ffffff !important;
  text-decoration: underline;
}

/* 以下保留你的基础布局 */
.container {
  width: 1200px;
  margin: 0 auto;
}
.main-layout {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  align-items: stretch; /* 让左右两边高度自动对齐 */
}

/* 中间的轮播图保持原本的 400px 高度 */
.banner {
  position: relative;
  height: 400px;
  flex: 1;
  border-radius: 12px;
  overflow: hidden;
  background: #f8f8f8;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}
/* 右侧广告容器 */
.side-ads {
  width: 190px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%; /* 填满 */
}

.banner-track {
  display: flex;
  height: 100%;
  width: 100%;
  transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
}

.banner-track img {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.4s;
}

.banner:hover .banner-track img {
  transform: scale(1.02);
}

.banner-mask {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 60px;
  background: linear-gradient(to top, rgba(0,0,0,0.4), transparent);
  pointer-events: none;
}

.dots {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 2;
}

.dots span {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.3s;
}

.dots span.active {
  background: #fff;
  width: 24px;
}

.banner-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}


.ad {
  flex: 1;
  border-radius: 12px;
  padding: 10px 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.ad:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
}

.ad-content h4 {
  font-size: 15px;
  margin-bottom: 4px;
  font-weight: 600;
}

.ad-content p {
  font-size: 13px;
  opacity: 0.8;
}

.ad-1 { background: linear-gradient(135deg, #e8f5e8 0%, #d4ebd4 100%); color: #2e7d32; }
.ad-2 { background: linear-gradient(135deg, #f5e8f5 0%, #ebd4eb 100%); color: #7b1fa2; }
.ad-3 { background: linear-gradient(135deg, #e8f0f5 0%, #d4e5eb 100%); color: #0288d1; }
.ad-4 { background: linear-gradient(135deg, #f5f0e8 0%, #ebe5d4 100%); color: #f57c00; }

/* 秒杀横幅 */
.seckill-banner {
  margin-top: 24px;
  background: linear-gradient(90deg, #e1251b 0%, #ff4d4f 100%);
  border-radius: 12px;
  padding: 24px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  color: #fff;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.3s;
  box-shadow: 0 4px 12px rgba(225, 37, 27, 0.15);
}

.seckill-banner::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent);
  transform: skewX(-25deg);
  animation: shine 3s infinite;
}

@keyframes shine {
  0% { left: -100%; }
  50%, 100% { left: 200%; }
}

.seckill-banner:hover {
  box-shadow: 0 12px 24px rgba(225, 37, 27, 0.3);
}

.seckill-left {
  display: flex;
  align-items: center;
  gap: 20px;
  z-index: 1;
}

.flash-icon {
  font-size: 40px;
  animation: pulse 2s infinite ease-in-out;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.seckill-left h2 {
  font-size: 26px;
  font-weight: bold;
  margin-bottom: 6px;
  letter-spacing: 1px;
}

.seckill-left p {
  font-size: 14px;
  opacity: 0.9;
}

.go-btn {
  background: #fff;
  color: #e1251b;
  padding: 10px 24px;
  border-radius: 30px;
  font-weight: bold;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 1;
  transition: all 0.2s;
}

.seckill-banner:hover .go-btn {
  background: #fef5f5;
  transform: scale(1.05);
}

/* 推荐区 */
.section-header {
  margin: 32px 0 16px;
}

.section-title {
  font-size: 24px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
}

.section-title .el-icon {
  color: #e1251b;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.sentinel {
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
  color: #999;
}

.loading {
  color: #e1251b;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.is-loading {
  animation: rotating 2s linear infinite;
}
@keyframes rotating {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
/* 强制把首页的 Logo 和热词变白 */
:deep(.header .logo-text),
:deep(.header .logo-sub) {
  color: #ffffff !important;
}

:deep(.header .hots),
:deep(.header .hots a) {
  color: rgba(255, 255, 255, 0.85) !important;
}

:deep(.header .hots a:hover) {
  color: #ffffff !important;
  text-decoration: underline;
}
</style>