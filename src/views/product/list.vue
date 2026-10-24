<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import GoodsCard from '@/components/GoodsCard.vue'
import type { UserProductPageResultVO, UserProductPageQueryDTO } from '@/types/product'
import { getUserProductPageApi } from '@/api/product'

const route = useRoute()
const router = useRouter()

const list = ref<UserProductPageResultVO[]>([])
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const hasMore = ref(true)
const total = ref(0)
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

// 搜索条件
const keyword = ref('')
const categoryId = ref<number | undefined>(undefined)

const reset = () => {
  list.value = []
  page.value = 1
  hasMore.value = true
  total.value = 0
}

const loadMore = async () => {
  if (loading.value || !hasMore.value) return
  loading.value = true
  try {
    const params: UserProductPageQueryDTO = {
      page: page.value,
      pageSize,
      keyword: keyword.value || undefined,
      categoryId: categoryId.value
    }
    const res = await getUserProductPageApi(params)
    if (res.code === 1) {
      const records = res.data.records
      total.value = res.data.total
      if (records.length < pageSize) hasMore.value = false
      list.value.push(...records)
      page.value++
    } else {
      hasMore.value = false
    }
  } finally {
    loading.value = false
  }
}

// 从 URL query 同步条件，然后重新加载
const syncFromQueryAndLoad = async () => {
  keyword.value = (route.query.keyword as string) || ''
  const cid = route.query.categoryId
  categoryId.value = cid ? Number(cid) : undefined
  reset()
  await loadMore()
}

onMounted(async () => {
  await syncFromQueryAndLoad()

  observer = new IntersectionObserver((entries) => {
    const entry = entries[0]
    if (entry && entry.isIntersecting) {
      loadMore()
    }  }, { rootMargin: '200px' })

  if (sentinelRef.value) observer.observe(sentinelRef.value)
})

onUnmounted(() => observer?.disconnect())

// 路由参数变化时重新加载（同一页面切换搜索词/分类）
watch(() => route.query, () => {
  syncFromQueryAndLoad()
})
</script>

<template>
  <TopNav />
  <Header />

  <div class="container">
    <div class="result-header">
      <div class="result-title">
        <span v-if="keyword">搜索 "{{ keyword }}"</span>
        <span v-else-if="categoryId">分类商品</span>
        <span v-else>全部商品</span>
        <span class="total-tip" v-if="total">共 {{ total }} 件商品</span>
      </div>
      <div class="result-filters">
        <span class="filter active">综合</span>
        <span class="filter">销量</span>
        <span class="filter">价格</span>
        <span class="filter">新品</span>
      </div>
    </div>

    <div class="goods-grid" v-if="list.length">
      <GoodsCard v-for="item in list" :key="item.id" :item="item" />
    </div>

    <div v-else-if="!loading" class="empty">
      没有找到相关商品
    </div>

    <div ref="sentinelRef" class="sentinel">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="!hasMore && list.length" class="no-more">已经到底啦 ~</div>
    </div>
  </div>
</template>

<style scoped>
.result-header {
  margin-top: 20px;
  padding: 15px 20px;
  background: #fff;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.result-title {
  font-size: 16px;
  color: #333;
  font-weight: bold;
}
.total-tip {
  margin-left: 10px;
  font-size: 13px;
  color: #999;
  font-weight: normal;
}
.result-filters {
  display: flex;
  gap: 10px;
}
.filter {
  padding: 5px 14px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  color: #666;
}
.filter:hover {
  color: #e1251b;
  border-color: #e1251b;
}
.filter.active {
  color: #e1251b;
  border-color: #e1251b;
  background: #fef5f5;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-top: 10px;
}

.empty {
  text-align: center;
  padding: 80px 0;
  color: #999;
  font-size: 14px;
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