<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import type { CartItemVO } from '@/types/cart'
import {
  getCartListApi,
  updateCartQuantityApi,
  updateCartCheckedApi,
  checkAllCartApi,
  deleteCartItemsApi,
  addCartApi
} from '@/api/cart'
import { getHistoryPageApi } from '@/api/history'
import { getFavoritePageApi } from '@/api/favorite'
import { getOrderPageApi } from '@/api/order'
import type { UserHistoryPageResultVO } from '@/types/history'
import type { UserFavoritePageResultVO } from '@/types/favorite'
import { useCartStore } from '@/stores/cart'
import { formatSkuSpecs } from '@/utils/specs'
import { getUserProductDetailApi } from '@/api/product'
import {addFavoriteApi} from "@/api/favorite.ts";

const router = useRouter()
const cartStore = useCartStore()
const cartList = ref<CartItemVO[]>([])
const loading = ref(false)
const skuOptions = ref<Record<number, any[]>>({})

const loadCart = async () => {
  loading.value = true
  try {
    const res = await getCartListApi()
    if (res.code === 1) cartList.value = res.data || []
  } finally {
    loading.value = false
  }
}

// ====== 刚看过/刚收藏/刚买过 悬浮面板逻辑 ======
const popoverVisible = ref(false)
const activeHoverTab = ref<'history' | 'favorite' | 'bought'>('history')
const hoverLoading = ref(false)

// 数据缓存
const historyList = ref<UserHistoryPageResultVO[]>([])
const favoriteList = ref<UserFavoritePageResultVO[]>([])
const boughtList = ref<any[]>([]) // 刚买过直接用订单里的商品项

// 加载数据的方法
const loadHoverData = async (type: 'history' | 'favorite' | 'bought') => {
  // 如果已经有数据了就不重复请求
  if (type === 'history' && historyList.value.length) return
  if (type === 'favorite' && favoriteList.value.length) return
  if (type === 'bought' && boughtList.value.length) return

  hoverLoading.value = true
  try {
    if (type === 'history') {
      const res = await getHistoryPageApi({ page: 1, pageSize: 6 })
      if (res.code === 1) historyList.value = res.data.records
    } else if (type === 'favorite') {
      const res = await getFavoritePageApi({ page: 1, pageSize: 6 })
      if (res.code === 1) favoriteList.value = res.data.records
    } else if (type === 'bought') {
      // 刚买过，取已完成或待收货订单里的商品
      const res = await getOrderPageApi({ page: 1, pageSize: 5 })
      if (res.code === 1) {
        const items: any[] = []
        res.data.records.forEach(order => {
          // 把订单里的商品提取出来，最多取6个
          if (order.items) items.push(...order.items)
        })
        boughtList.value = items.slice(0, 6)
      }
    }
  } finally {
    hoverLoading.value = false
  }
}

// 鼠标悬浮触发
const handleMouseEnter = (type: 'history' | 'favorite' | 'bought') => {
  activeHoverTab.value = type
  popoverVisible.value = true
  loadHoverData(type)
}

// 悬浮框内的 Tab 切换
const handleTabChange = (tab: any) => {
  activeHoverTab.value = tab.paneName
  loadHoverData(tab.paneName)
}

const groupedCartList = computed(() => {
  const groups: Record<number, { merchantId: number; merchantName: string; items: CartItemVO[] }> = {}
  cartList.value.forEach(item => {
    const mId = item.merchantId || 0
    if (!groups[mId]) {
      groups[mId] = { merchantId: mId, merchantName: item.merchantName || '未知店铺', items: [] }
    }
    groups[mId].items.push(item)
  })
  return Object.values(groups)
})

const validItems = computed(() => cartList.value.filter(item => !item.invalid))
const isCheckAll = computed(() => validItems.value.length > 0 && validItems.value.every(item => Number(item.checked) === 1))
const checkedItems = computed(() => validItems.value.filter(item => Number(item.checked) === 1))
const totalQuantity = computed(() => checkedItems.value.reduce((sum, item) => sum + item.quantity, 0))
const totalPrice = computed(() => checkedItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2))

const handleCheckAll = async () => {
  const newChecked = isCheckAll.value ? 0 : 1
  const res = await checkAllCartApi(newChecked)
  if (res.code === 1) cartList.value.forEach(item => { if (!item.invalid) item.checked = newChecked })
}

const handleCheckShop = async (group: any, val: any) => {
  const isChecked = val ? 1 : 0
  const itemsToChange = group.items.filter((i: CartItemVO) => !i.invalid && Number(i.checked) !== isChecked)
  if (itemsToChange.length === 0) return
  for (const item of itemsToChange) {
    await updateCartCheckedApi(item.id, isChecked)
    item.checked = isChecked
  }
}

const isShopChecked = (group: any) => {
  const valid = group.items.filter((i: CartItemVO) => !i.invalid)
  return valid.length > 0 && valid.every((i: CartItemVO) => Number(i.checked) === 1)
}

const handleCheckItem = async (item: CartItemVO) => {
  if (item.invalid) return
  const newChecked = Number(item.checked) === 1 ? 0 : 1
  const res = await updateCartCheckedApi(item.id, newChecked)
  if (res.code === 1) item.checked = newChecked
}

const handleQuantityChange = async (item: CartItemVO, delta: number) => {
  if (item.invalid) return
  const newQty = item.quantity + delta
  if (newQty < 1) return handleDelete([item.id])
  if (newQty > item.stock) return ElMessage.warning('不能超过库存数量')

  const oldQty = item.quantity
  item.quantity = newQty
  const res = await updateCartQuantityApi(item.id, newQty)
  if (res.code !== 1) item.quantity = oldQty
  else await cartStore.fetchCartCount()
}

const handleInputBlur = async (item: CartItemVO) => {
  if (item.invalid) return
  if (item.quantity < 1) item.quantity = 1
  if (item.quantity > item.stock) {
    item.quantity = item.stock
    ElMessage.warning('已调整至最大库存')
  }
  await updateCartQuantityApi(item.id, item.quantity)
}

const handleDelete = async (ids: number[]) => {
  if (ids.length === 0) return
  try {
    await ElMessageBox.confirm('确定要删除选中的商品吗？', '提示', { type: 'warning' })
    const res = await deleteCartItemsApi(ids)
    if (res.code === 1) {
      ElMessage.success('删除成功')
      await loadCart()
      await cartStore.fetchCartCount()
    }
  } catch {}
}

// 移入收藏
const moveToFavorite = async (cartItemIds: number[]) => {
  if (cartItemIds.length === 0) return

  // 1. 增加确认弹框
  try {
    await ElMessageBox.confirm(
        '商品移动后，将不在购物车中展示',
        '已选商品移入收藏夹？',
        {
          confirmButtonText: '确认',
          cancelButtonText: '取消',
          type: 'warning',
          confirmButtonClass: 'el-button--danger' // 让确认按钮变成红色（可选）
        }
    )
  } catch {
    return // 用户点击了取消
  }

  // 2. 用户确认后，执行移动逻辑
  try {
    loading.value = true
    // 找出要移动的购物车项
    const itemsToMove = cartList.value.filter(item => cartItemIds.includes(item.id))

    // 循环调用收藏接口
    for (const item of itemsToMove) {
      await addFavoriteApi(item.productId)
    }

    // 3. 收藏成功后，从购物车里删掉这些项
    const res = await deleteCartItemsApi(cartItemIds)
    if (res.code === 1) {
      ElMessage.success('已移入收藏夹')
      await loadCart()
      await cartStore.fetchCartCount()
    }
  } catch (e) {
    ElMessage.error('移入收藏失败')
  } finally {
    loading.value = false
  }
}

const handleSpecsVisibleChange = async (visible: boolean, item: CartItemVO) => {
  if (visible && !skuOptions.value[item.productId]) {
    const res = await getUserProductDetailApi(item.productId)
    if (res.code === 1) skuOptions.value[item.productId] = res.data.skuList || []
  }
}

const changeSpecs = async (item: CartItemVO, newSku: any) => {
  if (item.skuId === newSku.id) return
  try {
    await addCartApi({ skuId: newSku.id, quantity: item.quantity })
    await deleteCartItemsApi([item.id])
    ElMessage.success('规格切换成功')
    await loadCart()
  } catch (e) {
    ElMessage.error('切换规格失败')
  }
}

const goToCheckout = () => {
  if (checkedItems.value.length === 0) return ElMessage.warning('请先勾选要结算的商品')
  router.push('/order/confirm')
}

onMounted(() => {
  loadCart()
  cartStore.fetchCartCount()
})
</script>

<template>
  <div class="cart-page">
    <TopNav />
    <Header />

    <div class="container main-content">
      <div class="cart-header">
        <h2>我的购物车</h2>
        <span class="cart-tip">温馨提示：购买前请确认商品规格及收货地址</span>
      </div>

      <!-- 工具栏 -->
      <div class="tool-bar">
        <div class="tool-left">
          <el-checkbox v-model="isCheckAll" @change="handleCheckAll" class="check-all">
            <span class="font-bold">全选</span>
          </el-checkbox>
          <span class="tool-btn" @click="handleDelete(checkedItems.map(i => i.id))" v-if="checkedItems.length">删除选中</span>
          <span class="tool-btn" @click="moveToFavorite(checkedItems.map(i => i.id))" v-if="checkedItems.length">移入收藏</span>
        </div>
        <div class="tool-right">
          <el-popover
              v-model:visible="popoverVisible"
              placement="bottom-end"
              :width="400"
              trigger="hover"
              :show-arrow="false"
              popper-class="jd-hover-popover"
              :popper-options="{
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [22, 10] // 第一个是横向向右偏移，第二个是纵向向下偏移
                    }
                  }
                ]
              }"
          >
            <!-- 触发区域 -->
            <template #reference>
              <div class="hover-links">
                <span class="tool-link" @mouseenter="handleMouseEnter('history')">
                  <el-icon><Clock /></el-icon> 刚看过
                </span>
                <span class="divider">|</span>
                <span class="tool-link" @mouseenter="handleMouseEnter('favorite')">
                  <el-icon><Star /></el-icon> 刚收藏
                </span>
                <span class="divider">|</span>
                <span class="tool-link" @mouseenter="handleMouseEnter('bought')">
                  <el-icon><ShoppingBag /></el-icon> 刚买过
                </span>
              </div>
            </template>

            <!-- 悬浮面板内容 -->
            <div class="hover-panel" v-loading="hoverLoading">
              <el-tabs v-model="activeHoverTab" @tab-change="handleTabChange">
                <!-- 刚看过 -->
                <el-tab-pane label="刚看过" name="history">
                  <div class="mini-goods-grid" v-if="historyList.length">
                    <div class="mini-goods" v-for="item in historyList" :key="item.id" @click="router.push(`/product/${item.productId}`)">
                      <img :src="item.mainImage" />
                      <div class="price">￥{{ item.minPrice }}</div>
                      <div class="name">{{ item.productName }}</div>
                    </div>
                  </div>
                  <div class="empty-tip" v-else>暂无浏览记录</div>
                </el-tab-pane>

                <!-- 刚收藏 -->
                <el-tab-pane label="刚收藏" name="favorite">
                  <div class="mini-goods-grid" v-if="favoriteList.length">
                    <div class="mini-goods" v-for="item in favoriteList" :key="item.id" @click="router.push(`/product/${item.productId}`)">
                      <img :src="item.mainImage" />
                      <div class="price">￥{{ item.minPrice }}</div>
                      <div class="name">{{ item.productName }}</div>
                    </div>
                  </div>
                  <div class="empty-tip" v-else>暂无收藏记录</div>
                </el-tab-pane>

                <!-- 刚买过 -->
                <el-tab-pane label="刚买过" name="bought">
                  <div class="mini-goods-grid" v-if="boughtList.length">
                    <div class="mini-goods" v-for="item in boughtList" :key="item.id" @click="router.push(`/product/${item.productId}`)">
                      <img :src="item.image" />
                      <div class="price">￥{{ item.price }}</div>
                      <div class="name">{{ item.productName }}</div>
                    </div>
                  </div>
                  <div class="empty-tip" v-else>暂无购买记录</div>
                </el-tab-pane>
              </el-tabs>
            </div>
          </el-popover>
        </div>
      </div>

      <!-- 商品列表（按商家分组） -->
      <div class="cart-groups" v-loading="loading">
        <div class="group-card" v-for="group in groupedCartList" :key="group.merchantId">

          <div class="group-header">
            <el-checkbox
                :model-value="isShopChecked(group)"
                @change="(val: any) => handleCheckShop(group, val)"
                class="check-shop"
            >
              <span class="shop-name">{{ group.merchantName }}</span>
              <span class="tag">自营</span>
            </el-checkbox>
            <span class="shop-tip">ⓘ 还差12.5元免运费 去凑单 ></span>
          </div>

          <!-- 商品行 -->
          <div class="cart-item" v-for="item in group.items" :key="item.id" :class="{ 'is-invalid': item.invalid }">
            <div class="col-check">
              <el-checkbox
                  :model-value="Number(item.checked) === 1"
                  :disabled="item.invalid"
                  @change="handleCheckItem(item)"
              />
            </div>

            <!-- 1. 商品名称和图片区域（限制宽度） -->
            <div class="col-goods">
              <img :src="item.image" alt="商品" class="product-img" @click="router.push(`/product/${item.productId}`)" />              <div class="goods-info">
                <h4 class="title" @click="router.push(`/product/${item.productId}`)">{{ item.productName }}</h4>
                <!-- 失效提示放在这里 -->
                <p class="invalid-reason" v-if="item.invalid">该商品已失效：{{ item.invalidReason }}</p>
              </div>
            </div>

            <!-- 2. 规格与服务区域（吃掉中间的留白） -->
            <div class="col-specs">
              <div class="specs-line" v-if="!item.invalid">
                <span class="label">商品</span>
                <el-popover
                    placement="bottom-start"
                    :width="300"
                    trigger="click"
                    @show="handleSpecsVisibleChange(true, item)"
                >
                  <template #reference>
                    <span class="specs-val">
                      {{ formatSkuSpecs(item.skuSpecs) }} <i class="arrow-down"></i>
                    </span>
                  </template>
                  <div class="sku-popover">
                    <p class="popover-title">选择规格</p>
                    <div class="sku-options">
                      <span
                          v-for="sku in skuOptions[item.productId]"
                          :key="sku.id"
                          class="sku-tag"
                          :class="{ active: sku.id === item.skuId }"
                          @click="changeSpecs(item, sku)"
                      >
                        {{ formatSkuSpecs(sku.specs) }}
                      </span>
                    </div>
                  </div>
                </el-popover>
              </div>

              <div class="service-line" v-if="!item.invalid">
                <span class="label">服务</span>
                <span class="service-val">可选择增值服务 <i class="arrow-down"></i></span>
              </div>
            </div>

            <!-- 3. 单价 -->
            <div class="col-price">
              <div class="price-current">￥{{ item.price }}</div>
              <div class="price-original" v-if="!item.invalid">￥{{ (item.price * 1.1).toFixed(2) }}</div>
            </div>

            <!-- 4. 数量 -->
            <div class="col-qty">
              <div class="qty-box" v-if="!item.invalid">
                <button @click="handleQuantityChange(item, -1)" :disabled="item.quantity <= 1">-</button>
                <input type="text" v-model.number="item.quantity" @blur="handleInputBlur(item)" />
                <button @click="handleQuantityChange(item, 1)" :disabled="item.quantity >= item.stock">+</button>
              </div>
              <span v-else class="text-gray-400">无货</span>
            </div>

            <!-- 5. 小计 -->
            <div class="col-total">
              <div class="total-price">￥{{ (item.price * item.quantity).toFixed(2) }}</div>
            </div>

            <!-- 6. 操作 -->
            <div class="col-action">
              <span class="btn-text" @click="handleDelete([item.id])">删除</span>
              <span class="btn-text mt-2" @click="moveToFavorite([item.id])">移入收藏</span>
            </div>
          </div>
        </div>

        <div class="empty-cart" v-if="cartList.length === 0 && !loading">
          购物车空空如也，去 <span class="link" @click="router.push('/')">首页</span> 逛逛吧~
        </div>
      </div>
    </div>

    <!-- 底部结算栏 -->
    <div class="settle-bar" v-if="cartList.length > 0">
      <div class="container settle-inner">
        <div class="settle-left">
          <el-checkbox v-model="isCheckAll" @change="handleCheckAll">
            <span class="font-bold">全选</span>
          </el-checkbox>
          <span class="btn-text ml-4" @click="handleDelete(checkedItems.map(i => i.id))">删除选中</span>
        </div>

        <div class="settle-right">
          <div class="thumb-stack" v-if="checkedItems.length">
            <img v-for="i in checkedItems.slice(0, 4)" :key="i.id" :src="i.image" alt="选" />
            <span class="arrow">></span>
          </div>
          <div class="price-summary">
            <div class="total-text">
              已选 <span class="highlight">{{ totalQuantity }}</span> 件商品，合计：
            </div>
            <div class="total-price">
              <span class="price-symbol">￥</span><span class="price-num">{{ totalPrice }}</span>
            </div>
          </div>
          <button class="btn-checkout" @click="goToCheckout" :class="{ 'is-disabled': checkedItems.length === 0 }">去结算</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cart-page {
  background: #f4f4f4;
  min-height: 100vh;
  padding-bottom: 80px;
}

/* 头部 & 工具栏 (保持不变) */
.cart-header { padding: 20px 0; display: flex; align-items: baseline; gap: 15px; }
.cart-header h2 { font-size: 24px; color: #333; font-weight: normal; }
.cart-tip { font-size: 12px; color: #999; }
.tool-bar { background: #fff; border-radius: 8px 8px 0 0; height: 50px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid #eee; }
.tool-left { display: flex; align-items: center; gap: 20px; }
.font-bold { font-weight: bold; color: #333; }
.tool-btn { font-size: 14px; color: #666; cursor: pointer; }
.tool-btn:hover { color: #e1251b; }
.tool-right { display: flex; align-items: center; gap: 10px; color: #999; font-size: 13px;}
.tool-link { cursor: pointer; }
.tool-link:hover { color: #e1251b; display: inline-flex; align-items: center; gap: 3px;}
.divider { color: #eee; }

/* 分组卡片 */
.cart-groups { display: flex; flex-direction: column; padding-top: 15px;}
.group-card { background: #fff; margin-bottom: 15px; }
.group-header { padding: 15px 20px; border-bottom: 1px solid #f8f8f8; display: flex; justify-content: space-between; align-items: center;}
.check-shop { display: flex; align-items: center; }
.shop-name { font-size: 15px; font-weight: bold; color: #333; margin-right: 8px;}
.tag { background: #e1251b; color: #fff; font-size: 12px; padding: 1px 4px; border-radius: 2px; }
.shop-tip { font-size: 12px; color: #999; }

/* 商品行 */
.cart-item {
  display: flex;
  align-items: center; /* 垂直居中 */
  padding: 20px;
  border-bottom: 1px solid #f8f8f8;
}
.cart-item:last-child { border-bottom: none; }
.cart-item.is-invalid { opacity: 0.6; }
.col-check { width: 40px; display: flex; justify-content: flex-start;}

/* 1. 固定左侧商品信息宽度 */
.col-goods { width: 320px; display: flex; gap: 15px; }
.product-img { width: 80px; height: 80px; object-fit: cover; border: 1px solid #eee; cursor: pointer;}
.goods-info { flex: 1; display: flex; flex-direction: column; justify-content: flex-start;}
.info-text .title, .goods-info .title { font-size: 14px; color: #333; cursor: pointer; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;}
.goods-info .title:hover { color: #e1251b; }
.invalid-reason { color: #e1251b; font-size: 12px; margin-top: 5px; }

/* 2. 核心：中间自由伸展的规格与服务列 */
.col-specs { flex: 1; display: flex; flex-direction: column; gap: 8px; padding-left: 20px;}
.specs-line, .service-line { display: flex; align-items: center; font-size: 12px; color: #666; }
.label { color: #999; margin-right: 8px; width: 30px;}
.specs-val {
  cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
}
.specs-val:hover { color: #e1251b; }
.service-val { cursor: pointer; display: inline-flex; align-items: center; gap: 4px;}
.service-val:hover { color: #e1251b; }

.arrow-down {
  display: inline-block; width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 4px solid #999;
}

/* Popover 样式 */
.sku-popover { padding: 10px; }
.popover-title { font-size: 14px; color: #333; margin-bottom: 10px; font-weight: bold; }
.sku-options { display: flex; flex-wrap: wrap; gap: 10px; }
.sku-tag { padding: 6px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; cursor: pointer; transition: all 0.2s; }
.sku-tag:hover { border-color: #e1251b; color: #e1251b; }
.sku-tag.active { border-color: #e1251b; color: #e1251b; background: #fef5f5; }

/* 3. 价格、数量、小计、操作（固定宽度） */
.col-price { width: 120px; text-align: center; }
.price-current { color: #e1251b; font-weight: bold; font-size: 14px;}
.price-original { color: #999; text-decoration: line-through; font-size: 12px; margin-top: 2px;}

.col-qty { width: 120px; text-align: center; }
.qty-box { display: inline-flex; border: 1px solid #ddd; border-radius: 2px; height: 28px; overflow: hidden; background: #fff;}
.qty-box button { width: 28px; background: #f8f8f8; border: none; cursor: pointer; font-size: 14px; color: #666;}
.qty-box button:disabled { color: #ccc; cursor: not-allowed; }
.qty-box input { width: 36px; border: none; border-left: 1px solid #ddd; border-right: 1px solid #ddd; text-align: center; outline: none; font-size: 13px;}

.col-total { width: 120px; text-align: center; }
.total-price { color: #e1251b; font-weight: bold; font-size: 16px;}

.col-action { width: 60px; text-align: right; display: flex; flex-direction: column; gap: 8px;}
.btn-text { font-size: 12px; color: #666; cursor: pointer; }
.btn-text:hover { color: #e1251b; }
.text-gray-400 { color: #999; }

/* 底部结算 (保持不变) */
.settle-bar { position: fixed; bottom: 0; left: 0; width: 100%; height: 60px; background: #fff; box-shadow: 0 -2px 10px rgba(0,0,0,0.05); z-index: 100; }
.settle-inner { display: flex; justify-content: space-between; align-items: center; height: 100%; }
.settle-left { display: flex; align-items: center; }
.ml-4 { margin-left: 20px; }
.settle-right { display: flex; align-items: center; gap: 20px; }
.thumb-stack { display: flex; align-items: center; background: #f8f8f8; padding: 2px 10px; border-radius: 20px; border: 1px solid #eee;}
.thumb-stack img { width: 30px; height: 30px; border-radius: 50%; border: 1px solid #fff; margin-left: -10px; }
.thumb-stack img:first-child { margin-left: 0; }
.thumb-stack .arrow { color: #e1251b; font-weight: bold; margin-left: 5px;}
.price-summary { display: flex; flex-direction: column; align-items: flex-end; }
.total-text { font-size: 12px; color: #666; }
.total-price { color: #e1251b; }
.price-symbol { font-size: 16px; }
.price-num { font-size: 24px; font-weight: bold; }
.btn-checkout { width: 120px; height: 50px; background: #e1251b; color: #fff; font-size: 18px; border: none; border-radius: 4px; cursor: pointer; }
.btn-checkout:hover { background: #c91e15; }
.btn-checkout.is-disabled { background: #ccc; cursor: not-allowed; }
/* 悬浮触发文字组 */
.hover-links {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 弹窗内部样式 */
.hover-panel {
  min-height: 200px;
}
.hover-panel :deep(.el-tabs__header) {
  margin-bottom: 15px;
}
.hover-panel :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

/* 两列商品网格 */
.mini-goods-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}
.mini-goods {
  cursor: pointer;
  transition: transform 0.2s;
}
.mini-goods:hover {
  transform: translateY(-2px);
}
.mini-goods img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 4px;
}
.mini-goods .price {
  color: #e1251b;
  font-weight: bold;
  font-size: 16px;
  margin-top: 5px;
}
.mini-goods .name {
  font-size: 12px;
  color: #333;
  margin-top: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}
.mini-goods .name:hover {
  color: #e1251b;
}

.empty-tip {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 40px 0;
}
</style>