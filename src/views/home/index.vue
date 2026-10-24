<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import CategoryMenu from '@/components/CategoryMenu.vue'
import GoodsCard from '@/components/GoodsCard.vue'
import type { UserProductPageResultVO } from '@/types/product'
import { getUserProductPageApi } from '@/api/product'

const goodsList = ref<UserProductPageResultVO[]>([])
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const hasMore = ref(true)          // 是否还有更多
const sentinelRef = ref<HTMLElement | null>(null)  // 哨兵元素
let observer: IntersectionObserver | null = null

const banners = [
  'https://picsum.photos/900/400?random=1',
  'https://picsum.photos/900/400?random=2',
  'https://picsum.photos/900/400?random=3'
]
const currentBanner = ref(0)
const timer = setInterval(() => {
  currentBanner.value = (currentBanner.value + 1) % banners.length
}, 3000)
onUnmounted(() => clearInterval(timer))

// 加载一页数据
const loadMore = async () => {
  if (loading.value || !hasMore.value) return
  loading.value = true
  try {
    const res = await getUserProductPageApi({ page: page.value, pageSize })
    if (res.code === 1) {
      const records = res.data.records
      if (records.length < pageSize) {
        hasMore.value = false   // 返回不足一页，说明是最后一页
      }
      goodsList.value.push(...records)   // 追加，不是替换
      page.value++
    } else {
      hasMore.value = false
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadMore()   // 首次加载

  // 设置哨兵监听
  observer = new IntersectionObserver((entries) => {
    observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry && entry.isIntersecting) {
        loadMore()
      }
    }, { rootMargin: '200px' })
  }, { rootMargin: '200px' })   // 提前 200px 触发，避免用户看到"加载中"卡顿

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
  <div class="container main">
    <CategoryMenu />
    <div class="banner">
      <img
          v-for="(b, i) in banners"
          :key="i"
          :src="b"
          v-show="i === currentBanner"
      />
      <div class="dots">
        <span
            v-for="(_, i) in banners"
            :key="i"
            :class="{ active: i === currentBanner }"
            @click="currentBanner = i"
        />
      </div>
    </div>
    <div class="side-ads">
      <div class="ad ad-1">国家补贴<br />惠享正品</div>
      <div class="ad ad-2">精致美妆<br />品质之选</div>
      <div class="ad ad-3">超值百货<br />省心省钱</div>
      <div class="ad ad-4">品质五金<br />超值特惠</div>
    </div>
  </div>

  <div class="container">
    <h3 class="section-title">为你推荐</h3>
    <div class="goods-grid">
      <GoodsCard v-for="item in goodsList" :key="item.id" :item="item" />
    </div>

    <!-- 哨兵：滚到这里就触发加载 -->
    <div ref="sentinelRef" class="sentinel">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="!hasMore" class="no-more">已经到底啦 ~</div>
    </div>
  </div>
</template>

<style scoped>
.container {
  width: 1200px;
  margin: 0 auto;
}

.main {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.banner {
  position: relative;
  height: 400px;
  flex: 1;
  border-radius: 8px;
  overflow: hidden;
}
.banner img {
  width: 100%;
  height: 400px;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
}
.dots {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 2;
}
.dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
}
.dots span.active {
  background: #fff;
  width: 20px;
  border-radius: 4px;
}

.side-ads {
  width: 190px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ad {
  flex: 1;
  border-radius: 8px;
  padding: 15px;
  font-size: 14px;
  color: #333;
  line-height: 1.6;
}
.ad-1 { background: #e8f5e8; }
.ad-2 { background: #f5e8f5; }
.ad-3 { background: #e8f0f5; }
.ad-4 { background: #f5f0e8; }

.section-title {
  margin: 30px 0 15px;
  font-size: 22px;
  color: #333;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.sentinel {
  text-align: center;
  padding: 30px 0;
  font-size: 14px;
  color: #999;
}
.loading {
  color: #e1251b;
}
.no-more {
  color: #ccc;
}
</style>