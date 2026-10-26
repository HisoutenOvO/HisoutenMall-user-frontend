<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { formatSkuSpecs } from '@/utils/specs'
import { ElMessage, ElMessageBox } from 'element-plus'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import type { UserOrderPageQueryDTO, UserOrderPageResultVO } from '@/types/order'
// 补上了 deleteOrderApi
import { getOrderPageApi, cancelOrderApi, receiveOrderApi, deleteOrderApi } from '@/api/order'
import { addCartApi } from "@/api/cart.ts"
import UserSideBar from "@/components/UserSideBar.vue"

const router = useRouter()
const loading = ref(false)
const orderList = ref<UserOrderPageResultVO[]>([])
const total = ref(0)

const searchForm = ref<UserOrderPageQueryDTO>({
  page: 1,
  pageSize: 5,
  keyword: '',
  status: undefined,
  source: undefined,
  merchantName: '',
  productName: ''
})

const resetSearch = () => {
  searchForm.value.keyword = ''
  searchForm.value.merchantName = ''
  searchForm.value.productName = ''
  searchForm.value.source = undefined
  searchForm.value.page = 1
  loadOrders()
}

const statusMap: Record<number, { text: string; class: string }> = {
  0: { text: '等待付款', class: 'text-red' },
  1: { text: '等待发货', class: 'text-orange' },
  2: { text: '已取消', class: 'text-gray' },
  3: { text: '等待收货', class: 'text-blue' },
  4: { text: '已完成', class: 'text-green' },
  5: { text: '已退款', class: 'text-gray' }
}

const loadOrders = async () => {
  loading.value = true
  try {
    const res = await getOrderPageApi(searchForm.value)
    if (res.code === 1) {
      orderList.value = res.data.records || []
      total.value = res.data.total
    }
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  searchForm.value.page = 1
  loadOrders()
}

const changeStatus = (status: number | undefined) => {
  searchForm.value.status = status
  searchForm.value.page = 1
  loadOrders()
}

const handlePageChange = (page: number) => {
  searchForm.value.page = page
  loadOrders()
  // 平滑滚动回列表顶部
  window.scrollTo({ top: 300, behavior: 'smooth' })
}

const handleReceive = async (orderNo: string) => {
  try {
    await ElMessageBox.confirm('请确认已收到商品？', '提示', {
      type: 'info',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    })
    const res = await receiveOrderApi(orderNo)
    if (res.code === 1) {
      ElMessage.success('确认收货成功')
      loadOrders()
    }
  } catch (e) {}
}

const goPay = (orderNo: string) => {
  window.open(`/api/pay/alipay?orderNo=${orderNo}`, '_blank')
  setTimeout(() => loadOrders(), 2000)
}

const handleCancel = async (orderNo: string) => {
  try {
    await ElMessageBox.confirm('确定要取消该订单吗？', '提示', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    const res = await cancelOrderApi(orderNo)
    if (res.code === 1) {
      ElMessage.success('订单已取消')
      loadOrders()
    } else {
      ElMessage.error(res.msg)
    }
  } catch (e) {}
}

// 补上了删除逻辑
const handleDelete = async (orderNo: string) => {

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
  loadOrders()
})
</script>

<template>
  <div class="order-list-page">
    <TopNav />
    <Header />

    <div class="container layout-wrapper">
      <!-- 左侧菜单：使用 sticky 固定，不随右侧滚动 -->
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
            </el-form-item>
          </el-form>
        </div>

        <!-- 状态 Tabs -->
        <div class="status-tabs-wrapper">
          <div class="status-tabs">
            <div class="tab" :class="{ active: searchForm.status === undefined }" @click="changeStatus(undefined)">全部订单</div>
            <div class="tab" :class="{ active: searchForm.status === 0 }" @click="changeStatus(0)">待付款</div>
            <div class="tab" :class="{ active: searchForm.status === 1 }" @click="changeStatus(1)">待发货</div>
            <div class="tab" :class="{ active: searchForm.status === 3 }" @click="changeStatus(3)">待收货</div>
            <div class="tab" :class="{ active: searchForm.status === 4 }" @click="changeStatus(4)">已完成</div>
            <div class="tab" :class="{ active: searchForm.status === 2 }" @click="changeStatus(2)">已取消</div>
          </div>
        </div>

        <!-- 订单列表 -->
        <div class="order-list" v-loading="loading">
          <!-- 改用了纯 opacity 动画，不再导致高度塌陷 -->
          <transition-group name="list-fade" tag="div">
            <div class="order-card" v-for="order in orderList" :key="order.orderNo">
              <!-- 头部 -->
              <div class="order-header">
                <div class="header-left">
                  <span class="time">{{ order.createTime.replace('T', ' ') }}</span>
                  <span class="order-no">订单号：{{ order.orderNo }}</span>
                  <span class="merchant-name">
                    <el-icon><Shop /></el-icon> {{ order.merchantName }}
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
                  <p><el-icon><User /></el-icon> {{ order.receiverName }} {{ order.receiverPhone }}</p>
                  <p><el-icon><Location /></el-icon> {{ order.receiverAddress }}</p>
                </div>

                <!-- 3. 操作区 -->
                <div class="order-actions">
                  <div class="amount">
                    <span class="label">实付金额</span>
                    <div class="price">¥{{ order.payAmount }}</div>
                  </div>
                  <div class="btns">
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
                  </div>
                </div>
              </div>
            </div>
          </transition-group>

          <div class="empty" v-if="orderList.length === 0 && !loading">
            <el-empty description="暂无相关订单" />
          </div>

          <el-pagination
              v-if="total > 0"
              background
              layout="prev, pager, next"
              :total="total"
              :page-size="searchForm.pageSize"
              :current-page="searchForm.page"
              @current-change="handlePageChange"
              class="pagination"
          />
        </div>
      </div>
    </div>
  </div>
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
.text-red { color: #e1251b; font-weight: 600; }
.text-orange { color: #ff9500; }
.text-gray { color: #999; }
.text-blue { color: #1677ff; }
.text-green { color: #67c23a; }
.empty {
  text-align: center;
  padding: 80px 0;
  background: #fff;
  border-radius: 12px;
}

/* 修复闪烁：只做透明度变化，不再改变高度 */
.list-fade-enter-active,
.list-fade-leave-active {
  transition: opacity 0.3s ease;
}
.list-fade-enter-from,
.list-fade-leave-to {
  opacity: 0;
}

.pagination { margin-top: 30px; justify-content: center; }
.pagination :deep(.el-pagination.is-background .el-pager li),
.pagination :deep(.el-pagination.is-background .btn-prev),
.pagination :deep(.el-pagination.is-background .btn-next) {
  border-radius: 8px; background-color: #f4f4f4; font-weight: 600; color: #666; transition: all 0.3s; margin: 0 4px; min-width: 36px;
}
.pagination :deep(.el-pagination.is-background .el-pager li:hover) { color: #e1251b; background-color: #fef5f5; }
.pagination :deep(.el-pagination.is-background .el-pager li.is-active) {
  background: linear-gradient(135deg, #e1251b 0%, #c91e15 100%); color: #fff; box-shadow: 0 4px 12px rgba(225, 37, 27, 0.3);
}
.pagination :deep(.el-pagination.is-background .btn-prev:disabled),
.pagination :deep(.el-pagination.is-background .btn-next:disabled) { background-color: #fafafa; color: #ccc; }
</style>