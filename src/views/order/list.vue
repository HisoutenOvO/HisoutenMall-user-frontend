<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { formatSkuSpecs } from '@/utils/specs'
import { ElMessage, ElMessageBox } from 'element-plus'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import type { UserOrderPageQueryDTO, UserOrderPageResultVO } from '@/types/order'
import {getOrderPageApi, cancelOrderApi, receiveOrderApi, deleteOrderApi, restoreOrderApi} from '@/api/order'
import { addCartApi } from "@/api/cart.ts"
import UserSideBar from "@/components/UserSideBar.vue"
import {getAddressListApi, updateOrderAddressApi} from "@/api/address.ts";

const router = useRouter()
const loading = ref(false)
const orderList = ref<UserOrderPageResultVO[]>([])
const addressDialogVisible = ref(false)
const addressList = ref<any[]>([])
const currentOrderNo = ref('')
const isRecycleBin = ref(false)

// --- 无限滚动状态 ---
const hasMore = ref(true) // 是否还有下一页
const sentinelRef = ref<HTMLElement | null>(null) // 底部哨兵
let observer: IntersectionObserver | null = null

// 修改 searchForm
const searchForm = ref<UserOrderPageQueryDTO>({
  page: 1,
  pageSize: 10, // 建议改大一点，体验更好
  keyword: '',
  status: undefined,
  source: undefined,
  merchantName: '',
  productName: '',
  deleted: 0 // 默认查正常的
})

// 核心加载函数
const loadOrders = async (isLoadMore = false) => {
  if (loading.value || (isLoadMore && !hasMore.value)) return

  loading.value = true
  try {
    const res = await getOrderPageApi(searchForm.value)
    if (res.code === 1) {
      const records = res.data.records || []

      if (isLoadMore) {
        // 触底加载，追加数据
        orderList.value.push(...records)
      } else {
        // 首次加载/搜索/切Tab，替换数据
        orderList.value = records
      }

      // 如果后端返回的条数少于 pageSize，说明到底了
      if (records.length < searchForm.value.pageSize) {
        hasMore.value = false
      } else {
        // 还有下一页，页码 +1
        searchForm.value.page += 1
      }
    } else {
      ElMessage.error(res.msg)
    }
  } finally {
    loading.value = false
  }
}

// 统一重置加载（用于搜索、切Tab、切回收站）
const resetAndLoad = () => {
  searchForm.value.page = 1
  hasMore.value = true
  orderList.value = []
  loadOrders(false)
  window.scrollTo({ top: 300, behavior: 'smooth' })
}

const handleSearch = () => resetAndLoad()

const resetSearch = () => {
  searchForm.value.keyword = ''
  searchForm.value.merchantName = ''
  searchForm.value.productName = ''
  searchForm.value.source = undefined
  resetAndLoad()
}

const changeStatus = (status: number | undefined) => {
  searchForm.value.status = status
  resetAndLoad()
}

const toggleRecycleBin = () => {
  isRecycleBin.value = !isRecycleBin.value
  searchForm.value.deleted = isRecycleBin.value ? 1 : 0
  searchForm.value.keyword = ''
  searchForm.value.merchantName = ''
  searchForm.value.productName = ''
  searchForm.value.status = undefined
  searchForm.value.source = undefined
  resetAndLoad()
}

// --- 业务操作 ---
const openAddressDialog = async (orderNo: string) => {
  currentOrderNo.value = orderNo
  const res = await getAddressListApi()
  if (res.code === 1) {
    addressList.value = res.data
    addressDialogVisible.value = true
  }
}

const confirmAddressChange = async (addressId: number) => {
  const res = await updateOrderAddressApi(currentOrderNo.value, addressId)
  if (res.code === 1) {
    ElMessage.success('地址修改成功')
    addressDialogVisible.value = false
    resetAndLoad()
  }
}

const handleRestore = async (orderNo: string) => {
  try {
    await ElMessageBox.confirm('确认恢复该订单到订单列表吗？', '提示', {
      type: 'info', confirmButtonText: '确定', cancelButtonText: '取消'
    })
    const res = await restoreOrderApi(orderNo)
    if (res.code === 1) {
      ElMessage.success('订单已恢复')
      resetAndLoad()
    }
  } catch (e) {}
}

const handleDelete = async (orderNo: string) => {
  try {
    await ElMessageBox.confirm('确认删除该订单吗？删除后可在回收站找回。', '提示', {
      type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消'
    })
    const res = await deleteOrderApi(orderNo)
    if (res.code === 1) {
      ElMessage.success('订单已移入回收站')
      resetAndLoad()
    } else {
      ElMessage.error(res.msg)
    }
  } catch (e) {}
}

const statusMap: Record<number, { text: string; class: string }> = {
  0: { text: '等待付款', class: 'text-red' },
  1: { text: '等待发货', class: 'text-orange' },
  2: { text: '已取消', class: 'text-gray' },
  3: { text: '等待收货', class: 'text-blue' },
  4: { text: '已完成', class: 'text-green' },
  5: { text: '已退款', class: 'text-gray' }
}

const handleReceive = async (orderNo: string) => {
  try {
    await ElMessageBox.confirm('请确认已收到商品？', '提示', {
      type: 'info', confirmButtonText: '确认', cancelButtonText: '取消'
    })
    const res = await receiveOrderApi(orderNo)
    if (res.code === 1) {
      ElMessage.success('确认收货成功')
      resetAndLoad()
    }
  } catch (e) {}
}

const goPay = (orderNo: string) => {
  window.open(`/api/pay/alipay?orderNo=${orderNo}`, '_blank')
  setTimeout(() => resetAndLoad(), 2000)
}

const handleCancel = async (orderNo: string) => {
  try {
    await ElMessageBox.confirm('确定要取消该订单吗？', '提示', {
      type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消'
    })
    const res = await cancelOrderApi(orderNo)
    if (res.code === 1) {
      ElMessage.success('订单已取消')
      resetAndLoad()
    } else {
      ElMessage.error(res.msg)
    }
  } catch (e) {}
}

const buyAgain = async (order: UserOrderPageResultVO) => {
  try {
    for (const item of order.items) {
      await addCartApi({ skuId: item.skuId, quantity: item.quantity })
    }
    ElMessage.success('已加入购物车')
    router.push('/cart')
  } catch (e) {
    ElMessage.error('加购失败')
  }
}

onMounted(() => {
  resetAndLoad()

  // 设置无限滚动监听
  observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry && entry.isIntersecting) {
          loadOrders(true) // 触底加载更多
        }
      },
      { rootMargin: '150px' } // 提前 150px 触发
  )
  if (sentinelRef.value) observer.observe(sentinelRef.value)
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<template>
  <div class="order-list-page">
    <TopNav />
    <Header />

    <div class="container layout-wrapper">
      <!-- 左侧菜单：使用 sticky 固定 -->
      <div class="sidebar-sticky">
        <UserSideBar />
      </div>

      <!-- 右侧主内容 -->
      <div class="right-content">
        <div class="page-header">
          <h2 class="page-title">我的订单</h2>
        </div>

        <!-- 搜索栏 -->
        <div class="search-bar">
          <el-form :inline="true" :model="searchForm" class="filter-form">
            <el-form-item label="订单号">
              <el-input v-model="searchForm.keyword" placeholder="输入订单号" clearable @keyup.enter="handleSearch" />
            </el-form-item>
            <el-form-item label="商家">
              <el-input v-model="searchForm.merchantName" placeholder="输入商家名称" clearable @keyup.enter="handleSearch" />
            </el-form-item>
            <el-form-item label="商品">
              <el-input v-model="searchForm.productName" placeholder="输入商品名称" clearable @keyup.enter="handleSearch" />
            </el-form-item>
            <el-form-item label="类型">
              <el-select v-model="searchForm.source" placeholder="全部" clearable @change="handleSearch">
                <el-option label="全部" :value="undefined" />
                <el-option label="普通" :value="0" />
                <el-option label="秒杀" :value="1" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" color="#e1251b" @click="handleSearch">查询</el-button>
              <el-button @click="resetSearch">重置</el-button>
              <el-button
                  :type="isRecycleBin ? 'info' : 'default'"
                  @click="toggleRecycleBin"
                  style="margin-left: 12px;"
              >
                {{ isRecycleBin ? '返回订单列表' : '回收站' }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 状态 Tabs -->
        <div class="status-tabs-wrapper" v-show="!isRecycleBin">
          <div class="status-tabs">
            <div class="tab" :class="{ active: searchForm.status === undefined }" @click="changeStatus(undefined)">全部订单</div>
            <div class="tab" :class="{ active: searchForm.status === 0 }" @click="changeStatus(0)">待付款</div>
            <div class="tab" :class="{ active: searchForm.status === 1 }" @click="changeStatus(1)">待发货</div>
            <div class="tab" :class="{ active: searchForm.status === 3 }" @click="changeStatus(3)">待收货</div>
            <div class="tab" :class="{ active: searchForm.status === 4 }" @click="changeStatus(4)">已完成</div>
            <div class="tab" :class="{ active: searchForm.status === 2 }" @click="changeStatus(2)">已取消</div>
          </div>
        </div>
        <div v-show="isRecycleBin" class="recycle-tip">
          <el-icon><Delete /></el-icon> 这里是订单回收站，仅展示已删除订单。
        </div>

        <!-- 订单列表 -->
        <div class="order-list" v-loading="loading">
          <transition-group name="list-fade" tag="div">
            <div class="order-card" v-for="order in orderList" :key="order.orderNo">
              <!-- 头部 -->
              <div class="order-header">
                <div class="header-left">
                  <span class="time">{{ order.createTime.replace('T', ' ') }}</span>
                  <span class="order-no">订单号：{{ order.orderNo }}</span>
                  <span class="merchant-name" style="cursor: pointer;" @click="router.push(`/shop/${order.merchantId}`)">
                    {{ order.merchantName }} <el-icon><ArrowRight /></el-icon>
                  </span>
                </div>
                <div class="header-right">
                  <span class="status" :class="statusMap[order.status]?.class">
                    {{ statusMap[order.status]?.text }}
                  </span>
                </div>
              </div>

              <!-- 内容区 -->
              <div class="order-body">
                <!-- 1. 商品列表 -->
                <div class="goods-list">
                  <div class="goods-item" v-for="item in order.items" :key="item.id">
                    <img :src="item.image" @click="router.push(`/product/${item.productId}`)" />
                    <div class="goods-info">
                      <h4 @click="router.push(`/product/${item.productId}`)">{{ item.productName }}</h4>
                      <p class="specs">{{ formatSkuSpecs(item.skuSpecs) }}</p>
                    </div>
                    <div class="price-calc">
                      <span class="unit-price">¥{{ item.price }}</span>
                      <span class="qty">x{{ item.quantity }}</span>
                    </div>
                  </div>
                </div>

                <!-- 2. 收货信息 -->
                <div class="address-info">
                  <p>寄送至：{{ order.receiverAddress }}</p>
                  <p>收货人：{{ order.receiverName }} {{ order.receiverPhone }}</p>
                  <span
                      v-if="order.status === 0 || order.status === 1"
                      class="edit-address-btn"
                      @click="openAddressDialog(order.orderNo)"
                  >
                    ✎ 修改地址
                  </span>
                </div>

                <!-- 3. 操作区 -->
                <div class="order-actions">
                  <div class="amount">
                    <span class="label">实付金额</span>
                    <div class="price">¥{{ order.payAmount }}</div>
                  </div>
                  <div class="btns">
                    <!-- 回收站模式 -->
                    <template v-if="isRecycleBin">
                      <el-button type="primary" color="#67c23a" size="small" @click="handleRestore(order.orderNo)">恢复订单</el-button>
                    </template>
                    <!-- 正常模式 -->
                    <template v-else>
                      <template v-if="order.status === 0">
                        <el-button type="primary" color="#e1251b" size="small" @click="goPay(order.orderNo)">立即付款</el-button>
                        <el-button size="small" @click="handleCancel(order.orderNo)">取消订单</el-button>
                      </template>
                      <template v-else-if="order.status === 3">
                        <el-button type="primary" plain size="small" @click="handleReceive(order.orderNo)">确认收货</el-button>
                        <el-button size="small">查看物流</el-button>
                      </template>
                      <template v-else>
                        <el-button type="primary" plain size="small" @click="buyAgain(order)">再次购买</el-button>
                        <el-button size="small" @click="router.push(`/order/detail/${order.orderNo}`)">订单详情</el-button>
                        <el-button size="small" link type="danger" @click="handleDelete(order.orderNo)">删除订单</el-button>
                      </template>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </transition-group>

          <div class="empty" v-if="orderList.length === 0 && !loading">
            <el-empty description="暂无相关订单" />
          </div>

          <!-- 无限滚动的哨兵与状态 -->
          <div ref="sentinelRef" class="sentinel"></div>
          <div class="load-more-status" v-if="orderList.length > 0">
            <span v-if="loading">拼命加载中...</span>
            <span v-else-if="!hasMore">没有更多订单了</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 修改地址弹窗 -->
  <el-dialog v-model="addressDialogVisible" title="选择收货地址" width="500px">
    <div class="address-list-wrapper">
      <div
          v-for="addr in addressList"
          :key="addr.id"
          class="address-item"
          @click="confirmAddressChange(addr.id)"
      >
        <p class="name">{{ addr.receiverName }} <span class="phone">{{ addr.receiverPhone }}</span></p>
        <p class="detail">{{ addr.province }}{{ addr.city }}{{ addr.district }}{{ addr.detail }}</p>
      </div>
      <div v-if="addressList.length === 0" class="empty-tip">暂无地址，请先去个人中心添加</div>
    </div>
  </el-dialog>
</template>

<style scoped>
.order-list-page {
  background: #f4f4f4;
  min-height: 100vh;
  padding-bottom: 50px;
}
.layout-wrapper {
  display: flex;
  gap: 24px;
  margin-top: 24px;
  align-items: flex-start;
}
.sidebar-sticky {
  position: sticky;
  top: 20px;
  flex-shrink: 0;
  height: fit-content;
}
.right-content {
  flex: 1;
  min-width: 0;
}
.page-header {
  margin-bottom: 20px;
}
.page-title {
  font-size: 22px;
  color: #333;
  font-weight: 600;
}
.search-bar {
  background: #fff;
  padding: 20px 24px 0;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.03);
}
.filter-form {
  display: flex;
  flex-wrap: wrap;
}
.filter-form :deep(.el-form-item) {
  margin-bottom: 20px;
  margin-right: 24px;
}
.filter-form :deep(.el-input) {
  width: 160px;
}
.filter-form :deep(.el-select) {
  width: 120px;
}
.status-tabs-wrapper {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.03);
  overflow: hidden;
}
.status-tabs {
  display: flex;
}
.status-tabs .tab {
  flex: 1;
  text-align: center;
  padding: 18px 0;
  cursor: pointer;
  font-size: 15px;
  color: #666;
  position: relative;
  transition: all 0.2s;
}
.status-tabs .tab:hover {
  color: #e1251b;
}
.status-tabs .tab.active {
  color: #e1251b;
  font-weight: 600;
  background: #fef5f5;
}
.status-tabs .tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: #e1251b;
  border-radius: 3px 3px 0 0;
}
.order-card {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.03);
  transition: box-shadow 0.2s;
}
.order-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}
.order-header {
  padding: 14px 24px;
  background: #fcfcfc;
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #666;
  border-radius: 12px 12px 0 0;
  border-bottom: 1px solid #f0f0f0;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}
.merchant-name {
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 4px;
}
.header-right .status {
  font-weight: 600;
}
.order-body {
  display: flex;
  align-items: stretch;
}
.goods-list {
  flex: 1;
  min-width: 0;
  padding: 20px 24px;
}
.goods-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
.goods-item:last-child {
  margin-bottom: 0;
}
.goods-item img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #eee;
  margin-right: 16px;
  cursor: pointer;
  transition: transform 0.2s;
}
.goods-item img:hover {
  transform: scale(1.05);
}
.goods-info {
  flex: 1;
  min-width: 0;
}
.goods-info h4 {
  font-size: 14px;
  color: #333;
  margin-bottom: 6px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.goods-info h4:hover {
  color: #e1251b;
}
.goods-info .specs {
  font-size: 12px;
  color: #999;
}
.price-calc {
  width: 100px;
  text-align: right;
  font-size: 14px;
  flex-shrink: 0;
}
.unit-price {
  color: #333;
  font-weight: 600;
}
.qty {
  color: #999;
  margin-left: 6px;
}
.address-info {
  width: 230px;
  flex-shrink: 0;
  padding: 20px;
  border-left: 1px solid #f0f0f0;
  font-size: 13px;
  color: #666;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}
.address-info p {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.5;
  margin: 0;
}
.address-info .el-icon {
  color: #999;
  margin-top: 3px;
  flex-shrink: 0;
}
.order-actions {
  width: 200px;
  flex-shrink: 0;
  padding: 20px;
  border-left: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.amount {
  text-align: center;
  width: 100%;
}
.amount .label {
  font-size: 12px;
  color: #999;
  display: block;
  margin-bottom: 4px;
}
.amount .price {
  font-size: 20px;
  color: #e1251b;
  font-weight: bold;
  font-family: Arial, sans-serif;
}
.btns {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.btns :deep(.el-button) {
  width: 100%;
  margin-left: 0;
  border-radius: 6px;
}
.empty {
  text-align: center;
  padding: 80px 0;
  background: #fff;
  border-radius: 12px;
}
.recycle-tip {
  background: #fdf6ec;
  color: #e6a23c;
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.edit-addr-btn {
  color: #e1251b;
  cursor: pointer;
  font-size: 12px;
  margin-top: 5px;
  display: inline-block;
}
.edit-addr-btn:hover {
  text-decoration: underline;
}
.address-item {
  border: 1px solid #eee;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 4px;
  cursor: pointer;
}
.address-item:hover {
  border-color: #e1251b;
  background: #fef5f5;
}
.address-item .name {
  font-weight: bold;
  font-size: 14px;
}
.address-item .phone {
  color: #999;
  margin-left: 10px;
  font-weight: normal;
}
.address-item .detail {
  font-size: 13px;
  color: #666;
  margin-top: 5px;
}

/* 无限滚动加载状态 */
.sentinel {
  height: 1px;
  width: 100%;
}
.load-more-status {
  text-align: center;
  padding: 20px 0 40px;
  font-size: 14px;
  color: #999;
}
</style>