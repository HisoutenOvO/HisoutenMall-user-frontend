<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {ElMessage} from 'element-plus'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import GoodsCard from '@/components/GoodsCard.vue'
import type { UserProductPageResultVO, UserProductPageQueryDTO } from '@/types/product'
import { getUserProductPageApi } from '@/api/product'
import {getCategoryListApi} from "@/api/category.ts";
import type {BrandListVO} from "@/types/brand.ts";
import {getBrandListApi} from "@/api/brand.ts";

const route = useRoute()

const list = ref<UserProductPageResultVO[]>([])
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const hasMore = ref(true)
const total = ref(0)
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
// 查询条件参数
const brandIdQuery = ref<number | undefined>(undefined)
const minPriceQuery = ref<number | undefined>(undefined)
const maxPriceQuery = ref<number | undefined>(undefined)

// 搜索条件
const keyword = ref('')
const categoryId = ref<number | undefined>(undefined)
// 新增：排序类型（0-综合 1-销量 2-价格升 3-价格降 4-新品）
const sortType = ref<number>(0)

const reset = () => {
  list.value = []
  page.value = 1
  hasMore.value = true
  total.value = 0
}
// 筛选状态
const brandList = ref<BrandListVO[]>([])
const categoryList = ref<any[]>([])
const showAllBrands = ref(false) // 控制品牌是否展开
const customPriceVisible = ref(false) // 控制自定义价格弹窗
const customMinPrice = ref<number | undefined>()
const customMaxPrice = ref<number | undefined>()

// 价格预设区间
const priceRanges = [
  { label: '0-200', min: 0, max: 200 },
  { label: '200-600', min: 200, max: 600 },
  { label: '600-1600', min: 600, max: 1600 },
  { label: '1600-5100', min: 1600, max: 5100 },
  { label: '5100-17500', min: 5100, max: 17500 },
  { label: '17500以上', min: 17500, max: undefined }
]

// 初始化加载品牌和分类
const loadFilters = async () => {
  try {
    const [brandRes, cateRes] = await Promise.all([
      getBrandListApi(), // 记得替换成你实际的接口
      getCategoryListApi()
    ])
    if (brandRes.code === 1) brandList.value = brandRes.data
    if (cateRes.code === 1) categoryList.value = cateRes.data.filter(c => c.level === 2) // 一般展示二级分类
  } catch (e) {}
}

// 选择排序
const handleSort = (type: number) => {
  if (sortType.value === type) return
  sortType.value = type
  reset() // 你的重置分页方法
  loadMore()
}

// 选择品牌 (单选)
const handleBrand = (brandId?: number) => {
  brandIdQuery.value = brandIdQuery.value === brandId ? undefined : brandId // 再次点击取消
  reset()
  loadMore()
}

// 选择预设价格
const handlePrice = (min?: number, max?: number) => {
  minPriceQuery.value = min
  maxPriceQuery.value = max
  reset()
  loadMore()
}

// 确认自定义价格
const confirmCustomPrice = () => {
  if (customMinPrice.value !== undefined && customMaxPrice.value !== undefined) {
    if (customMinPrice.value > customMaxPrice.value) return ElMessage.warning('最低价不能大于最高价')
  }
  minPriceQuery.value = customMinPrice.value
  maxPriceQuery.value = customMaxPrice.value
  customPriceVisible.value = false
  reset()
  loadMore()
}

const loadMore = async () => {
  if (loading.value || !hasMore.value) return
  loading.value = true
  try {
    const params: UserProductPageQueryDTO = {
      page: page.value,
      pageSize,
      keyword: keyword.value || undefined,
      categoryId: categoryId.value,
      sortType: sortType.value,
      brandId: brandIdQuery.value, // 新增
      minPrice: minPriceQuery.value, // 新增
      maxPrice: maxPriceQuery.value, // 新增
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

// 新增：点击排序按钮
const changeSort = async (type: number) => {
  if (type === 2) {
    // 价格特殊处理：如果已经是升序(2)点它变降序(3)，否则变升序(2)
    sortType.value = sortType.value === 2 ? 3 : 2
  } else {
    sortType.value = type
  }

  // 重置分页状态并重新请求
  reset()
  await loadMore()
  // 切换排序后滚回顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 从 URL query 同步条件，然后重新加载
const syncFromQueryAndLoad = async () => {
  keyword.value = (route.query.keyword as string) || ''
  const cid = route.query.categoryId
  categoryId.value = cid ? Number(cid) : undefined

  // 清空筛选
  brandIdQuery.value = undefined
  minPriceQuery.value = undefined
  maxPriceQuery.value = undefined
  sortType.value = 0

  // 加载品牌列表（只在第一次或者切换分类时调）
  if (brandList.value.length === 0) {
    loadFilters()
  }

  reset()
  await loadMore()
}

onMounted(async () => {
  await syncFromQueryAndLoad()

  observer = new IntersectionObserver((entries) => {
    const entry = entries[0]
    if (entry && entry.isIntersecting) {
      loadMore()
    }
  }, { rootMargin: '200px' })

  if (sentinelRef.value) observer.observe(sentinelRef.value)
})

onUnmounted(() => observer?.disconnect())

// 路由参数变化时重新加载
watch(() => route.query, () => {
  syncFromQueryAndLoad()
})
</script>

<template>
  <TopNav />
  <Header />

  <div class="container">
    <!-- 1. 顶部搜索结果统计 (独立一条) -->
    <div class="search-summary">
      <span v-if="keyword">搜索 "<span class="highlight-word">{{ keyword }}</span>"</span>
      <span v-else-if="categoryId">分类商品</span>
      <span v-else>全部商品</span>
      <span class="total-tip" v-if="total">共 {{ total }} 件商品</span>
    </div>

    <!-- 2. 筛选与排序主面板 -->
    <div class="filter-main-card">
      <!-- 排序栏 -->
      <div class="sort-bar">
        <div class="sort-item" :class="{ active: sortType === 0 }" @click="handleSort(0)">综合</div>
        <div class="sort-item" :class="{ active: sortType === 1 }" @click="handleSort(1)">销量</div>
        <div class="sort-item" :class="{ active: sortType === 2 || sortType === 3 }" @click="handleSort(sortType === 2 ? 3 : 2)">
          价格
          <span class="sort-icon">
            <i :class="{ up: sortType === 2 }"></i>
            <i :class="{ down: sortType === 3 }"></i>
          </span>
        </div>
        <div class="sort-item" :class="{ active: sortType === 4 }" @click="handleSort(4)">新品</div>
        <div class="sort-item filter-toggle">筛选 <i class="el-icon-arrow-down"></i></div>
      </div>

      <!-- 筛选条件区 -->
      <div class="filter-panel">
        <!-- 品牌筛选 -->
        <div class="filter-row">
          <div class="filter-label">品牌：</div>
          <div class="filter-content">
            <span class="filter-item" :class="{ active: !brandIdQuery }" @click="handleBrand(undefined)">全部</span>
            <span
                class="filter-item"
                v-for="b in (showAllBrands ? brandList : brandList.slice(0, 8))"
                :key="b.id"
                :class="{ active: brandIdQuery === b.id }"
                @click="handleBrand(b.id)"
            >
              {{ b.name }}
            </span>
            <span class="filter-more" v-if="brandList.length > 8" @click="showAllBrands = !showAllBrands">
              {{ showAllBrands ? '收起' : '更多' }} <i :class="showAllBrands ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
            </span>
          </div>
        </div>

        <!-- 价格筛选 -->
        <div class="filter-row">
          <div class="filter-label">价格：</div>
          <div class="filter-content">
            <span class="filter-item" :class="{ active: !minPriceQuery && !maxPriceQuery }" @click="handlePrice(undefined, undefined)">全部</span>
            <span
                class="filter-item"
                v-for="(p, index) in priceRanges"
                :key="index"
                :class="{ active: minPriceQuery === p.min && maxPriceQuery === p.max }"
                @click="handlePrice(p.min, p.max)"
            >
              {{ p.label }}
            </span>

            <!-- 自定义价格弹窗 -->
            <el-popover v-model:visible="customPriceVisible" placement="bottom-start" :width="240" trigger="click">
              <template #reference>
                <span class="filter-item custom-price-btn" :class="{ active: customPriceVisible }">价格区间 <i class="el-icon-arrow-down"></i></span>
              </template>
              <div class="custom-price-box">
                <div class="price-inputs">
                  <el-input-number v-model="customMinPrice" placeholder="最低价" :controls="false" size="small" style="width: 80px"/>
                  <span class="line">-</span>
                  <el-input-number v-model="customMaxPrice" placeholder="最高价" :controls="false" size="small" style="width: 80px"/>
                </div>
                <div class="price-actions">
                  <el-button type="danger" size="small" @click="confirmCustomPrice">确定</el-button>
                  <el-button size="small" @click="customPriceVisible = false">取消</el-button>
                </div>
              </div>
            </el-popover>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. 商品列表 -->
    <div class="goods-grid" v-if="list.length">
      <GoodsCard v-for="item in list" :key="item.id" :item="item" />
    </div>
    <div v-else-if="!loading" class="empty">没有找到相关商品</div>

    <div ref="sentinelRef" class="sentinel">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="!hasMore && list.length" class="no-more">已经到底啦 ~</div>
    </div>
  </div>
</template>

<style scoped>
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
/* 顶部搜索结果统计 */
.search-summary {
  margin-top: 20px;
  padding: 15px 20px;
  background: #fff;
  border-radius: 8px 8px 0 0;
  font-size: 16px;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
}
.highlight-word {
  color: #e1251b;
  font-weight: bold;
}
.total-tip {
  margin-left: 10px;
  font-size: 13px;
  color: #999;
}

/* 筛选主面板（包含排序和条件） */
.filter-main-card {
  background: #fff;
  border-radius: 0 0 8px 8px;
  margin-bottom: 15px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

/* 排序栏 */
.sort-bar {
  background: #f8f8f8;
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid #eee;
}
.sort-item {
  padding: 0 20px;
  height: 100%;
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  border-right: 1px solid transparent;
}
.sort-item:hover {
  color: #e1251b;
}
.sort-item.active {
  color: #e1251b;
  font-weight: bold;
  background: #fff;
  border-top: 2px solid #e1251b;
  border-right: 1px solid #eee;
  border-left: 1px solid #eee;
}
.sort-icon {
  display: inline-flex;
  flex-direction: column;
  margin-left: 4px;
}
.sort-icon i {
  width: 0; height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
}
.sort-icon i.up { border-bottom: 5px solid #ccc; margin-bottom: 1px;}
.sort-icon i.down { border-top: 5px solid #ccc; }
.sort-item.active .sort-icon i.up { border-bottom-color: #e1251b; }
.sort-item.active .sort-icon i.down { border-top-color: #e1251b; }
.filter-toggle {
  margin-left: auto;
  border-right: none;
}

/* 筛选条件区 */
.filter-panel {
  padding: 15px 20px;
}
.filter-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 10px;
  border-bottom: 1px dashed #f0f0f0;
  padding-bottom: 10px;
}
.filter-row:last-child {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}
.filter-label {
  width: 60px;
  color: #999;
  font-size: 13px;
  line-height: 28px;
  flex-shrink: 0;
}
.filter-content {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.filter-item {
  font-size: 13px;
  padding: 4px 12px;
  color: #333;
  cursor: pointer;
  border-radius: 2px;
  line-height: 20px;
  border: 1px solid transparent;
}
.filter-item:hover {
  color: #e1251b;
}
.filter-item.active {
  background: #e1251b;
  color: #fff;
}
.filter-more {
  font-size: 13px;
  color: #999;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 12px;
}
.filter-more:hover {
  color: #e1251b;
}
.custom-price-btn {
  border: 1px dashed #ccc;
  background: #fcfcfc;
  display: flex;
  align-items: center;
  gap: 4px;
}
.custom-price-btn:hover, .custom-price-btn.active {
  border-color: #e1251b;
}

/* 自定义价格弹窗内部 */
.custom-price-box { padding: 5px; }
.price-inputs { display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; }
.price-inputs .line { color: #999; margin: 0 5px; }
.price-actions { display: flex; justify-content: center; gap: 10px; }

</style>