<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import { addCartApi } from '@/api/cart'
import { ElMessage } from 'element-plus'
import type { UserProductDetailVO } from '@/types/product'
import { getUserProductDetailApi } from '@/api/product'
import { useCartStore } from '@/stores/cart'
import type { UserReviewVO } from '@/types/review'
import { getProductReviewPageApi } from '@/api/review'
import { formatSkuSpecs } from '@/utils/specs'
import { getAddressListApi } from '@/api/address'
import type { AddressListVO } from "@/types/address"
import { addHistoryApi } from "@/api/history"
import { addFavoriteApi, cancelFavoriteApi, checkFavoriteApi } from "@/api/favorite"

const addressList = ref<AddressListVO[]>([])
const selectedAddress = ref<AddressListVO | null>(null)
const addressPopoverVisible = ref(false)

const handleSelectAddress = (addr: AddressListVO) => {
  selectedAddress.value = addr
  addressPopoverVisible.value = false
}

const cartStore = useCartStore()
const route = useRoute()
const router = useRouter()

const detail = ref<UserProductDetailVO | null>(null)
const loading = ref(true)
const selectedSkuId = ref<number | null>(null)
const quantity = ref(1)
const currentImage = ref('')

const activeTab = ref('detail')
const reviewList = ref<UserReviewVO[]>([])
const reviewTotal = ref(0)
const reviewPage = ref(1)
const reviewPageSize = 5
const reviewLoading = ref(false)

const loadingMore = ref(false)
const hasMore = ref(true)
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const loadReviews = async (isLoadMore = false) => {
  if (!detail.value) return
  if (isLoadMore && (!hasMore.value || loadingMore.value)) return
  if (!isLoadMore && reviewLoading.value) return

  if (isLoadMore) {
    loadingMore.value = true
  } else {
    reviewLoading.value = true
    reviewPage.value = 1
    hasMore.value = true
  }

  try {
    const res = await getProductReviewPageApi({
      productId: detail.value.id,
      page: reviewPage.value,
      pageSize: reviewPageSize
    })
    if (res.code === 1) {
      const records = res.data.records || []
      reviewTotal.value = res.data.total
      if (isLoadMore) {
        reviewList.value.push(...records)
      } else {
        reviewList.value = records
      }
      if (reviewList.value.length >= reviewTotal.value || records.length < reviewPageSize) {
        hasMore.value = false
      } else {
        reviewPage.value++
      }
    }
  } finally {
    reviewLoading.value = false
    loadingMore.value = false
  }
}

const setupObserver = () => {
  if (observer) observer.disconnect()
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && activeTab.value === 'review') {
      loadReviews(true)
    }
  }, { rootMargin: '100px' })

  if (sentinelRef.value) {
    observer.observe(sentinelRef.value)
  }
}

watch(activeTab, async (newVal) => {
  if (newVal === 'review') {
    await nextTick()
    setupObserver()
  }
})

const selectedSku = computed(() => {
  if (!detail.value || !selectedSkuId.value) return null
  return detail.value.skuList.find(s => s.id === selectedSkuId.value) || null
})

const displayPrice = computed(() => {
  if (selectedSku.value) return selectedSku.value.price
  if (detail.value && detail.value.skuList.length) {
    return Math.min(...detail.value.skuList.map(s => s.price))
  }
  return 0
})

const addToCart = async () => {
  if (!isLogin.value) {
    router.push('/login')
    return
  }
  if (!selectedSku.value) {
    ElMessage.warning('请先选择商品规格')
    return
  }
  if (selectedSku.value.stock < quantity.value) {
    ElMessage.warning('库存不足')
    return
  }

  const res = await addCartApi({
    skuId: selectedSku.value.id,
    quantity: quantity.value
  })

  if (res.code === 1) {
    ElMessage.success('已成功加入购物车')
    await cartStore.fetchCartCount()
  } else {
    ElMessage.error(res.msg)
  }
}

const currentStock = computed(() => selectedSku.value?.stock ?? 0)
const isLogin = computed(() => !!localStorage.getItem('token'))

onMounted(async () => {
  const id = Number(route.params.id)
  if (!id) {
    router.replace('/')
    return
  }

  loading.value = true
  try {
    const res = await getUserProductDetailApi(id)
    if (res.code === 1 && res.data) {
      detail.value = res.data
      currentImage.value = res.data.mainImage

      if (res.data.skuList && res.data.skuList.length) {
        const skuList = res.data.skuList
        const firstInStock = skuList.find(s => s.stock > 0)
        selectedSkuId.value = firstInStock ? firstInStock.id : skuList[0]!.id
      }

      loadReviews(false)
      checkFavoriteStatus(id)

      if (isLogin.value) {
        addHistoryApi(id).catch(() => {})
      }
    } else {
      ElMessage.error(res.msg || '商品不存在或已下架')
      router.replace('/')
    }
  } catch (error) {
    ElMessage.error('获取详情失败')
    router.replace('/')
  } finally {
    loading.value = false
  }

  if (isLogin.value) {
    const addressRes = await getAddressListApi()
    if (addressRes.code === 1 && addressRes.data.length > 0) {
      addressList.value = addressRes.data
      const found = addressRes.data.find((a: AddressListVO) => a.isDefault === 1)
      selectedAddress.value = found || addressRes.data[0] || null
    }
  }
})

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

const requireLogin = (): boolean => {
  if (!isLogin.value) {
    router.push('/login')
    return false
  }
  return true
}
const buyNow = () => {
  if (!requireLogin()) return
  if (!selectedSku.value) {
    ElMessage.warning('请选择商品规格')
    return
  }
  router.push({
    path: '/order/confirm',
    query: {
      skuId: selectedSku.value.id,
      quantity: quantity.value
    }
  })
}

const isFavorite = ref(false)

const checkFavoriteStatus = async (productId: number) => {
  if (!localStorage.getItem('token')) return
  try {
    const res = await checkFavoriteApi(productId)
    if (res.code === 1) {
      isFavorite.value = res.data
    }
  } catch (e) {}
}

const toggleFavorite = async () => {
  if (!localStorage.getItem('token')) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  if (!detail.value) return

  try {
    if (isFavorite.value) {
      const res = await cancelFavoriteApi(detail.value.id)
      if (res.code === 1) {
        isFavorite.value = false
        ElMessage.success('已取消收藏')
      }
    } else {
      const res = await addFavoriteApi(detail.value.id)
      if (res.code === 1) {
        isFavorite.value = true
        ElMessage.success('收藏成功')
      }
    }
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<template>
  <TopNav />
  <Header />

  <div class="container breadcrumb">
    <a @click="router.push('/')">首页</a>
    <el-icon><ArrowRight /></el-icon>
    <span>{{ detail?.categoryName || '商品' }}</span>
    <el-icon><ArrowRight /></el-icon>
    <span class="current">{{ detail?.name || '' }}</span>
  </div>

  <div v-if="loading" class="container loading">
    <el-skeleton :rows="10" animated />
  </div>

  <div v-else-if="detail" class="container detail-main">
    <!-- 左侧 -->
    <div class="left">
      <div class="gallery-wrapper">
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
        <div class="shop-left">
          <div class="shop-logo">
            <el-icon><Shop /></el-icon>
          </div>
          <div class="shop-text">
            <div class="shop-name">{{ detail.merchantName }}</div>
            <div class="shop-desc">精选店铺好物，快来逛逛</div>
          </div>
        </div>
        <div class="shop-actions">
          <el-button round size="small">
            <el-icon><Plus /></el-icon>关注店铺
          </el-button>
          <el-button round size="small">
            <el-icon><Service /></el-icon>联系客服
          </el-button>
        </div>
      </div>

      <!-- 详情 与 评价 Tabs -->
      <div class="detail-tabs-wrapper">
        <div class="detail-tabs">
          <div class="tab" :class="{ active: activeTab === 'detail' }" @click="activeTab = 'detail'">
            商品详情
          </div>
          <div class="tab" :class="{ active: activeTab === 'review' }" @click="activeTab = 'review'">
            用户评价 ({{ reviewTotal }})
          </div>
        </div>

        <transition name="tab-fade" mode="out-in">
          <div v-if="activeTab === 'detail'" class="detail-content" key="detail">
            <div class="detail-text">{{ detail.detail || '暂无详情' }}</div>
          </div>

          <div v-else class="detail-content review-content" v-loading="reviewLoading" key="review">
            <div class="review-list" v-if="reviewList.length > 0">
              <div class="review-item" v-for="item in reviewList" :key="item.id">
                <div class="user-info">
                  <el-avatar :src="item.avatar" :size="36" class="avatar">
                    {{ item.nickname?.charAt(0) }}
                  </el-avatar>
                  <div class="meta">
                    <span class="nickname">{{ item.nickname }}</span>
                    <el-rate v-model="item.rating" disabled size="small" class="rate-star" />
                  </div>
                </div>

                <p class="review-text">{{ item.content }}</p>

                <div class="review-images" v-if="item.images && item.images.length">
                  <el-image
                      v-for="(img, index) in item.images"
                      :key="index"
                      :src="img"
                      :preview-src-list="item.images"
                      fit="cover"
                      class="review-img"
                      preview-teleported
                  />
                </div>

                <div class="review-footer">
                  <span class="specs">规格：{{ formatSkuSpecs(item.skuSpecs) }}</span>
                  <span class="time">{{ item.createTime?.replace('T', ' ') }}</span>
                </div>
              </div>
            </div>

            <div class="empty-review" v-else-if="!reviewLoading">
              <el-empty description="暂无评价~" :image-size="80" />
            </div>

            <div ref="sentinelRef" class="sentinel"></div>
            <div class="load-more-status">
              <span v-if="loadingMore">加载更多评价中...</span>
              <span v-else-if="!hasMore && reviewList.length > 0">已经到底啦 ~</span>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- 右侧 -->
    <div class="right">
      <div class="title-row">
        <h1 class="name">{{ detail.name }}</h1>
        <div class="fav-btn" @click="toggleFavorite">
          <el-icon :class="{ active: isFavorite }"><StarFilled v-if="isFavorite" /><Star v-else /></el-icon>
          <span class="text">{{ isFavorite ? '已收藏' : '收藏' }}</span>
        </div>
      </div>
      <div class="subtitle" v-if="detail.subtitle">{{ detail.subtitle }}</div>

      <div class="price-box">
        <div class="price-left">
          <div class="price-label">京东价</div>
          <div class="price-num-box">
            <span class="symbol">￥</span>
            <span class="price-num">{{ displayPrice }}</span>
          </div>
        </div>
        <div class="price-right">
          <span class="tip-item">累计评价 {{ reviewTotal }}+</span>
        </div>
      </div>

      <div class="promo-row">
        <span class="label">已享</span>
        <div class="tags">
          <span class="promo-tag">分期免息</span>
          <span class="promo-tag">包邮</span>
        </div>
      </div>

      <div class="delivery">
        <span class="label">送至</span>
        <el-popover
            v-model:visible="addressPopoverVisible"
            placement="bottom-start"
            :width="420"
            trigger="click"
            popper-class="address-popover"
        >
          <template #reference>
            <div v-if="!isLogin" class="placeholder">
              <a @click="router.push('/login')">请登录后查看收货地址</a>
            </div>
            <div v-else-if="selectedAddress" class="placeholder clickable">
              {{ selectedAddress.province }}{{ selectedAddress.city }}{{ selectedAddress.district }}（{{ selectedAddress.receiverName }} 收）
              <el-icon class="arrow-down"><ArrowDown /></el-icon>
            </div>
            <div v-else class="placeholder">
              <a @click="router.push('/user/address')">请添加收货地址</a>
            </div>
          </template>

          <div class="addr-popover-content">
            <div class="popover-header">
              <div class="tabs">
                <span class="tab active">常用地址</span>
                <span class="tab" @click="router.push('/user/address')">选择新地址</span>
              </div>
              <el-icon class="close-icon" @click="addressPopoverVisible = false">
                <Close />
              </el-icon>
            </div>

            <div class="addr-list">
              <div
                  v-for="addr in addressList"
                  :key="addr.id"
                  class="addr-item"
                  :class="{ active: selectedAddress?.id === addr.id }"
                  @click="handleSelectAddress(addr)"
              >
                <div class="addr-name">
                  <strong>{{ addr.receiverName }}</strong>
                  <span class="phone">{{ addr.receiverPhone || '无手机号' }}</span>
                </div>
                <div class="addr-detail">
                  {{ addr.province }}{{ addr.city }}{{ addr.district }}{{ addr.detail }}
                </div>
                <div class="default-tag" v-if="addr.isDefault === 1">默认</div>
              </div>
            </div>

            <div class="popover-footer">
              <el-button type="primary" plain size="small" @click="router.push('/user/address')">管理我的收货地址</el-button>
            </div>
          </div>
        </el-popover>
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
            {{ formatSkuSpecs(sku.specs) }}
          </div>
        </div>
      </div>

      <div class="quantity-section">
        <div class="label">数量</div>
        <div class="quantity">
          <button @click="decrease" :disabled="quantity <= 1">-</button>
          <input v-model.number="quantity" type="number" @blur="onQuantityInput" />
          <button @click="increase" :disabled="quantity >= currentStock">+</button>
        </div>
        <span class="stock-tip" v-if="selectedSku">
          库存 {{ currentStock }} 件
        </span>
      </div>

      <div class="actions">
        <button class="btn-cart" @click="addToCart">
          <el-icon><ShoppingCart /></el-icon> 加入购物车
        </button>
        <button class="btn-buy" @click="buyNow">立即购买</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========== 基础结构 ========== */
.loading {
  padding: 80px 0;
}

.breadcrumb {
  padding: 16px 0;
  font-size: 13px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 8px;
}
.breadcrumb a {
  cursor: pointer;
  color: #666;
  transition: color 0.2s;
}
.breadcrumb a:hover {
  color: #e1251b;
}
.breadcrumb .current {
  color: #333;
  font-weight: bold;
}

.detail-main {
  display: flex;
  gap: 24px;
  padding-bottom: 60px;
  align-items: flex-start;
}

/* ========== 左侧：画廊与店铺 ========== */
.left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.gallery-wrapper {
  display: flex;
  gap: 16px;
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}

.thumb-list {
  width: 72px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.thumb {
  width: 72px;
  height: 72px;
  border: 2px solid transparent;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  background: #f8f8f8;
  transition: all 0.2s;
}
.thumb:hover {
  border-color: #fce4e4;
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
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-in;
}
.main-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.3s ease;
}
.main-image:hover img {
  transform: scale(1.05);
}

.shop-info {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.shop-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.shop-logo {
  width: 48px;
  height: 48px;
  background: #fef5f5;
  color: #e1251b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
.shop-text .shop-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}
.shop-text .shop-desc {
  font-size: 13px;
  color: #999;
}
.shop-actions {
  display: flex;
  gap: 10px;
}

/* ========== 左侧：详情与评价区 ========== */
.detail-tabs-wrapper {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  overflow: hidden;
}

.detail-tabs {
  display: flex;
  border-bottom: 1px solid #eee;
  background: #fafafa;
}
.tab {
  padding: 16px 32px;
  font-size: 15px;
  cursor: pointer;
  color: #666;
  position: relative;
  transition: all 0.2s;
}
.tab:hover {
  color: #e1251b;
}
.tab.active {
  color: #e1251b;
  font-weight: bold;
  background: #fff;
}
.tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background: #e1251b;
}

.detail-content {
  padding: 30px;
  min-height: 300px;
}
.detail-text {
  font-size: 14px;
  color: #333;
  line-height: 1.8;
  white-space: pre-wrap;
}

.review-content {
  padding: 20px 30px 40px;
}

.review-list {
  display: flex;
  flex-direction: column;
}

.review-item {
  border-bottom: 1px dashed #eee;
  padding: 24px 0;
}
.review-item:first-child {
  padding-top: 10px;
}
.review-item:last-child {
  border-bottom: none;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.user-info .avatar {
  border: 1px solid #eee;
}
.user-info .meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.user-info .nickname {
  font-size: 14px;
  color: #666;
}
.rate-star {
  --el-rate-icon-margin: 0;
  height: 16px;
}

.review-text {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  margin-bottom: 16px;
  word-break: break-all;
}

.review-images {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.review-img {
  width: 90px;
  height: 90px;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.2s;
}
.review-img:hover {
  transform: scale(1.05);
}

.review-footer {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
}

.empty-review {
  padding: 40px 0;
}

.sentinel {
  height: 1px;
  width: 100%;
}
.load-more-status {
  text-align: center;
  padding: 20px 0;
  font-size: 13px;
  color: #999;
}

/* ========== 右侧购买区 ========== */
.right {
  width: 480px;
  background: #fff;
  padding: 24px 30px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  height: fit-content;
  position: sticky;
  top: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 15px;
  margin-bottom: -10px;
}

.name {
  font-size: 22px;
  color: #333;
  line-height: 1.4;
  font-weight: 600;
  flex: 1;
}
.subtitle {
  font-size: 14px;
  color: #e1251b;
  font-weight: 500;
}

.fav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #999;
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 20px;
  background: #f8f8f8;
  transition: all 0.2s;
  white-space: nowrap;
}
.fav-btn:hover {
  background: #fce4e4;
  color: #e1251b;
}
.fav-btn .el-icon {
  font-size: 16px;
}
.fav-btn .el-icon.active {
  color: #e1251b;
}

.price-box {
  background: linear-gradient(135deg, #fef5f5 0%, #fff0f0 100%);
  border-radius: 8px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  width: 100%;
}
.price-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.price-label {
  font-size: 13px;
  color: #999;
}
.price-num-box {
  color: #e1251b;
  display: flex;
  align-items: baseline;
}
.price-num-box .symbol {
  font-size: 20px;
  font-weight: bold;
}
.price-num-box .price-num {
  font-size: 40px;
  font-weight: bold;
  font-family: Arial, sans-serif;
  letter-spacing: -1px;
}
.price-right {
  font-size: 13px;
  color: #999;
  padding-bottom: 6px;
}

.promo-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}
.promo-row .label {
  color: #999;
}
.promo-tag {
  font-size: 12px;
  color: #e1251b;
  background: #fef5f5;
  border: 1px solid #fce4e4;
  border-radius: 4px;
  padding: 2px 8px;
}

.delivery {
  display: flex;
  gap: 20px;
  font-size: 14px;
  align-items: center;
}
.delivery .label {
  color: #999;
}
.delivery .placeholder {
  color: #333;
}
.delivery .placeholder a {
  color: #e1251b;
  cursor: pointer;
}
.delivery .placeholder.clickable {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #f8f8f8;
  border-radius: 4px;
  transition: all 0.2s;
}
.delivery .placeholder.clickable:hover {
  background: #fce4e4;
  color: #e1251b;
}
.delivery .arrow-down {
  font-size: 12px;
  transition: transform 0.2s;
}
.delivery .placeholder.clickable:hover .arrow-down {
  transform: translateY(2px);
}

.sku-section .label, .quantity-section .label {
  font-size: 14px;
  color: #999;
  margin-bottom: 12px;
  display: block;
}
.sku-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.sku-item {
  padding: 10px 20px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  background: #fcfcfc;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}
.sku-item:hover {
  border-color: #e1251b;
  color: #e1251b;
}
.sku-item.active {
  border-color: #e1251b;
  color: #e1251b;
  background: #fef5f5;
  font-weight: bold;
}
.sku-item.disabled {
  color: #ccc;
  border-color: #eee;
  cursor: not-allowed;
  background: #f8f8f8;
  text-decoration: line-through;
}

.quantity-section {
  display: flex;
  align-items: center;
  gap: 20px;
}
.quantity {
  display: flex;
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}
.quantity button {
  width: 38px;
  height: 38px;
  background: #f8f8f8;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #333;
  transition: background 0.2s;
}
.quantity button:hover:not(:disabled) {
  background: #eee;
}
.quantity button:disabled {
  color: #ccc;
  cursor: not-allowed;
}
.quantity input {
  width: 60px;
  height: 38px;
  border: none;
  border-left: 1px solid #ddd;
  border-right: 1px solid #ddd;
  text-align: center;
  font-size: 14px;
  font-weight: bold;
  outline: none;
}
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
  display: flex;
  gap: 16px;
  margin-top: 10px;
}
.actions button {
  flex: 1;
  height: 54px;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}
.actions button:active {
  transform: scale(0.98);
}
.btn-cart {
  background: linear-gradient(90deg, #ff9500 0%, #ff6a00 100%);
}
.btn-cart:hover {
  box-shadow: 0 6px 16px rgba(255, 149, 0, 0.4);
}
.btn-buy {
  background: linear-gradient(90deg, #e1251b 0%, #c91e15 100%);
}
.btn-buy:hover {
  box-shadow: 0 6px 16px rgba(225, 37, 27, 0.4);
}

/* ========== 地址弹窗内部样式 ========== */
.addr-popover-content {
  padding: 5px;
}
.popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding-bottom: 12px;
  margin-bottom: 12px;
}
.popover-header .tabs {
  display: flex;
  gap: 20px;
}
.popover-header .tab {
  font-size: 15px;
  color: #666;
  cursor: pointer;
  transition: color 0.2s;
}
.popover-header .tab.active {
  color: #e1251b;
  font-weight: bold;
}
.close-icon {
  cursor: pointer;
  color: #999;
  font-size: 16px;
  transition: color 0.2s;
}
.close-icon:hover {
  color: #e1251b;
}
.addr-list {
  max-height: 300px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding-right: 5px;
}
.addr-list::-webkit-scrollbar {
  width: 6px;
}
.addr-list::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 3px;
}
.addr-item {
  border: 1px solid #eee;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}
.addr-item:hover {
  border-color: #e1251b;
}
.addr-item.active {
  border-color: #e1251b;
  background: #fef5f5;
  box-shadow: 0 2px 8px rgba(225,37,27,0.1);
}
.addr-item .addr-name {
  font-size: 14px;
  color: #333;
  margin-bottom: 6px;
}
.addr-item .addr-name .phone {
  color: #999;
  margin-left: 8px;
  font-weight: normal;
}
.addr-item .addr-detail {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.addr-item .default-tag {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 11px;
  color: #e1251b;
  border: 1px solid #e1251b;
  padding: 0 4px;
  border-radius: 2px;
  transform: scale(0.9);
  transform-origin: top right;
}
.popover-footer {
  text-align: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed #eee;
}

/* Tab 内容切换动画 */
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: all 0.25s ease;
}

.tab-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>