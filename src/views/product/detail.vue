<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import type { UserProductDetailVO } from '@/types/product'
import { getUserProductDetailApi } from '@/api/product'

const route = useRoute()
const router = useRouter()

const detail = ref<UserProductDetailVO | null>(null)
const loading = ref(true)

// 当前选中的 SKU
const selectedSkuId = ref<number | null>(null)
// 当前数量
const quantity = ref(1)
// 当前展示的主图
const currentImage = ref('')

// 当前选中的 SKU 对象
const selectedSku = computed(() => {
  if (!detail.value || !selectedSkuId.value) return null
  return detail.value.skuList.find(s => s.id === selectedSkuId.value) || null
})

// 展示的价格：优先选中 SKU 的价格，否则取最低价
const displayPrice = computed(() => {
  if (selectedSku.value) return selectedSku.value.price
  if (detail.value && detail.value.skuList.length) {
    return Math.min(...detail.value.skuList.map(s => s.price))
  }
  return 0
})

// 当前库存
const currentStock = computed(() => selectedSku.value?.stock ?? 0)

// 是否已登录
const isLogin = computed(() => !!localStorage.getItem('token'))

onMounted(async () => {
  const id = Number(route.params.id)
  if (!id) {
    router.replace('/')
    return
  }

  const res = await getUserProductDetailApi(id)
  if (res.code === 1) {
    detail.value = res.data
    currentImage.value = res.data.mainImage
    // 默认选中第一个有库存的 SKU
    if (res.data.skuList && res.data.skuList.length) {
      const skuList = res.data.skuList
      if (skuList && skuList.length) {
        const firstInStock = skuList.find(s => s.stock > 0)
        selectedSkuId.value = firstInStock ? firstInStock.id : skuList[0]!.id
      }
    }
  } else {
    alert(res.msg)
    router.replace('/')
  }
  loading.value = false
})
// 把 specs JSON 转成可读文本
const formatSpecs = (specs: string): string => {
  if (!specs) return '默认'
  try {
    const obj = JSON.parse(specs)
    if (typeof obj === 'object' && obj !== null) {
      return Object.entries(obj)
          .map(([k, v]) => `${k}: ${v}`)
          .join('  /  ')
    }
    return String(obj)
  } catch {
    // 不是 JSON，直接返回原文（兼容商家直接填的 "红色 64G"）
    return specs
  }
}
const changeImage = (img: string) => {
  currentImage.value = img
}

const decrease = () => {
  if (quantity.value > 1) quantity.value--
}
const increase = () => {
  if (quantity.value < currentStock.value) quantity.value++
}
const onQuantityInput = () => {
  let v = Number(quantity.value)
  if (isNaN(v) || v < 1) v = 1
  if (v > currentStock.value) v = currentStock.value
  quantity.value = v
}

// 加购 / 立即购买
const requireLogin = (): boolean => {
  if (!isLogin.value) {
    router.push('/login')
    return false
  }
  return true
}

const addCart = () => {
  if (!requireLogin()) return
  if (!selectedSku.value) {
    alert('请选择规格')
    return
  }
  if (selectedSku.value.stock < quantity.value) {
    alert('库存不足')
    return
  }
  // TODO: 调加购接口
  alert(`已加入购物车：SKU=${selectedSku.value.specs}，数量=${quantity.value}`)
}

const buyNow = () => {
  if (!requireLogin()) return
  if (!selectedSku.value) {
    alert('请选择规格')
    return
  }
  // TODO: 跳订单确认
  alert(`立即购买：SKU=${selectedSku.value.specs}，数量=${quantity.value}`)
}
</script>

<template>
  <TopNav />
  <Header />

  <div class="container breadcrumb">
    <a @click="router.push('/')">首页</a> &gt;
    <span>{{ detail?.categoryName || '商品' }}</span> &gt;
    <span>{{ detail?.name || '' }}</span>
  </div>

  <div v-if="loading" class="container loading">加载中...</div>

  <div v-else-if="detail" class="container detail-main">
    <!-- 左侧 -->
    <div class="left">
      <!-- 图片区 -->
      <div class="gallery">
        <div class="thumb-list">
          <div
              class="thumb"
              :class="{ active: currentImage === detail.mainImage }"
              @mouseenter="changeImage(detail.mainImage)"
          >
            <img :src="detail.mainImage" />
          </div>
          <div
              v-for="sku in detail.skuList"
              :key="sku.id"
              v-show="sku.image"
              class="thumb"
              :class="{ active: currentImage === sku.image }"
              @mouseenter="changeImage(sku.image)"
          >
            <img :src="sku.image" />
          </div>
        </div>
        <div class="main-image">
          <img :src="currentImage" />
        </div>
      </div>

      <!-- 店铺信息 -->
      <div class="shop-info">
        <div class="shop-name">{{ detail.merchantName }}</div>
        <div class="shop-desc">精选店铺好物，快来逛逛</div>
      </div>

      <!-- 详情 tab -->
      <div class="detail-tabs">
        <div class="tab active">商品详情</div>
      </div>
      <div class="detail-content">
        <div class="detail-text">{{ detail.detail || '暂无详情' }}</div>
      </div>
    </div>

    <!-- 右侧 -->
    <div class="right">
      <h1 class="name">{{ detail.name }}</h1>
      <div class="subtitle" v-if="detail.subtitle">{{ detail.subtitle }}</div>

      <div class="price-block">
        <span class="symbol">￥</span>
        <span class="price-num">{{ displayPrice }}</span>
      </div>

      <div class="promo-row">
        <span class="label">已享</span>
        <span class="promo-tag">分期免息</span>
        <span class="promo-tag">包邮</span>
      </div>

      <div class="delivery">
        <span class="label">送至</span>
        <span v-if="!isLogin" class="placeholder">
          <a @click="router.push('/login')">请登录后查看收货地址</a>
        </span>
        <span v-else class="placeholder">云南昆明市…（地址管理待做）</span>
      </div>

      <div class="sku-section" v-if="detail.skuList && detail.skuList.length">
        <div class="label">选择规格</div>
        <div class="sku-options">
          <div
              v-for="sku in detail.skuList"
              :key="sku.id"
              class="sku-item"
              :class="{
              active: selectedSkuId === sku.id,
              disabled: sku.stock === 0
            }"
              @click="sku.stock > 0 && (selectedSkuId = sku.id)"
          >
            {{ formatSpecs(sku.specs) }}
          </div>
        </div>
      </div>

      <div class="quantity-section">
        <div class="label">数量</div>
        <div class="quantity">
          <button @click="decrease" :disabled="quantity <= 1">-</button>
          <input
              v-model.number="quantity"
              type="number"
              @blur="onQuantityInput"
          />
          <button @click="increase" :disabled="quantity >= currentStock">+</button>
        </div>
        <span class="stock-tip" v-if="selectedSku">
          库存 {{ currentStock }} 件
        </span>
      </div>

      <div class="actions">
        <button class="btn-cart" @click="addCart">加入购物车</button>
        <button class="btn-buy" @click="buyNow">立即购买</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading {
  text-align: center;
  padding: 80px 0;
  color: #999;
}

.breadcrumb {
  padding: 15px 0;
  font-size: 13px;
  color: #666;
}
.breadcrumb a {
  cursor: pointer;
  color: #666;
}
.breadcrumb a:hover {
  color: #e1251b;
}
.breadcrumb span {
  margin-left: 5px;
}

.detail-main {
  display: flex;
  gap: 30px;
  padding-bottom: 50px;
}

/* 左侧 */
.left {
  flex: 1;
  min-width: 0;
}

.gallery {
  display: flex;
  gap: 15px;
  background: #fff;
  padding: 20px;
  border-radius: 8px;
}
.thumb-list {
  width: 70px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.thumb {
  width: 70px;
  height: 70px;
  border: 2px solid transparent;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  background: #f8f8f8;
}
.thumb.active {
  border-color: #e1251b;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.main-image {
  flex: 1;
  aspect-ratio: 1 / 1;
  background: #f8f8f8;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.main-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.shop-info {
  margin-top: 15px;
  background: #fff;
  padding: 20px;
  border-radius: 8px;
}
.shop-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}
.shop-desc {
  margin-top: 5px;
  font-size: 13px;
  color: #999;
}

.detail-tabs {
  margin-top: 20px;
  background: #fff;
  border-radius: 8px 8px 0 0;
  display: flex;
  border-bottom: 1px solid #eee;
}
.tab {
  padding: 15px 30px;
  font-size: 15px;
  cursor: pointer;
  color: #333;
}
.tab.active {
  color: #e1251b;
  border-bottom: 2px solid #e1251b;
}
.detail-content {
  background: #fff;
  border-radius: 0 0 8px 8px;
  padding: 30px;
  min-height: 300px;
}
.detail-text {
  font-size: 14px;
  color: #666;
  line-height: 1.8;
  white-space: pre-wrap;
}

/* 右侧 */
.right {
  width: 480px;
  background: #fff;
  padding: 25px;
  border-radius: 8px;
  height: fit-content;
  position: sticky;
  top: 20px;
}

.name {
  font-size: 20px;
  font-weight: normal;
  color: #333;
  line-height: 1.4;
}
.subtitle {
  margin-top: 8px;
  font-size: 14px;
  color: #e1251b;
}

.price-block {
  margin-top: 20px;
  padding: 15px 0;
  background: #fef5f5;
  border-radius: 4px;
  padding-left: 20px;
}
.price-block .symbol {
  color: #e1251b;
  font-size: 18px;
}
.price-block .price-num {
  color: #e1251b;
  font-size: 36px;
  font-weight: bold;
}

.promo-row {
  margin-top: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.promo-row .label {
  color: #999;
  font-size: 13px;
}
.promo-tag {
  font-size: 12px;
  color: #e1251b;
  border: 1px solid #e1251b;
  border-radius: 3px;
  padding: 0 6px;
  line-height: 18px;
}

.delivery {
  margin-top: 20px;
  display: flex;
  gap: 15px;
  font-size: 14px;
}
.delivery .label {
  color: #999;
}
.delivery .placeholder {
  color: #333;
}
.delivery a {
  color: #e1251b;
  cursor: pointer;
}

.sku-section {
  margin-top: 25px;
}
.sku-section .label {
  font-size: 14px;
  color: #999;
  margin-bottom: 10px;
}
.sku-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.sku-item {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  background: #fff;
  transition: all 0.2s;
}
.sku-item:hover {
  border-color: #e1251b;
  color: #e1251b;
}
.sku-item.active {
  border-color: #e1251b;
  color: #e1251b;
  background: #fef5f5;
}
.sku-item.disabled {
  color: #ccc;
  border-color: #eee;
  cursor: not-allowed;
  background: #f8f8f8;
}

.quantity-section {
  margin-top: 25px;
  display: flex;
  align-items: center;
  gap: 15px;
}
.quantity-section .label {
  font-size: 14px;
  color: #999;
}
.quantity {
  display: flex;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}
.quantity button {
  width: 35px;
  height: 35px;
  background: #f8f8f8;
  border: none;
  cursor: pointer;
  font-size: 16px;
}
.quantity button:disabled {
  color: #ccc;
  cursor: not-allowed;
}
.quantity input {
  width: 60px;
  height: 35px;
  border: none;
  text-align: center;
  font-size: 14px;
  outline: none;
}
/* 隐藏 number input 的上下箭头 */
.quantity input::-webkit-outer-spin-button,
.quantity input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.stock-tip {
  font-size: 13px;
  color: #999;
}

.actions {
  margin-top: 30px;
  display: flex;
  gap: 15px;
}
.actions button {
  flex: 1;
  height: 50px;
  border: none;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  color: #fff;
}
.btn-cart {
  background: #ff9500;
}
.btn-cart:hover {
  background: #e08600;
}
.btn-buy {
  background: #e1251b;
}
.btn-buy:hover {
  background: #c91e15;
}
</style>