<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { formatSkuSpecs } from '@/utils/specs'
import { ElMessage, ElMessageBox } from 'element-plus'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import type { UserOrderPageQueryDTO, UserOrderPageResultVO } from '@/types/order'
import {getOrderPageApi, cancelOrderApi, receiveOrderApi} from '@/api/order'
import {addCartApi} from "@/api/cart.ts";
import UserSideBar from "@/components/UserSideBar.vue";

const router = useRouter()
const loading = ref(false)
const orderList = ref<UserOrderPageResultVO[]>([])
const total = ref(0)

// 修复 TS 报错：显式给 searchForm 定义类型
const searchForm = ref<UserOrderPageQueryDTO>({
  page: 1,
  pageSize: 5,
  keyword: '',
  status: undefined
})

// 状态映射
const statusMap: Record<number, { text: string; class: string }> = {
  0: { text: '待付款', class: 'text-red' },
  1: { text: '待发货', class: 'text-orange' },
  2: { text: '已取消', class: 'text-gray' },
  3: { text: '待收货', class: 'text-blue' },
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

// 切换状态 Tab
const changeStatus = (status: number | undefined) => {
  searchForm.value.status = status
  searchForm.value.page = 1
  loadOrders()
}

const handlePageChange = (page: number) => {
  searchForm.value.page = page
  loadOrders()
}
const handleReceive = async (orderNo: string) => {
  try {
    await ElMessageBox.confirm('请确认已收到商品？', '提示', { type: 'info' })
    const res = await receiveOrderApi(orderNo)
    if (res.code === 1) {
      ElMessage.success('确认收货成功')
      loadOrders()
    }
  } catch (e) {}
}
// 去支付
const goPay = (orderNo: string) => {
  // 新窗口打开支付表单
  window.open(`/api/pay/alipay?orderNo=${orderNo}`, '_blank')
  // 轮询或者直接延时刷新
  setTimeout(() => loadOrders(), 2000)
}

// 取消订单
const handleCancel = async (orderNo: string) => {
  try {
    await ElMessageBox.confirm('确定要取消该订单吗？', '提示', { type: 'warning' })
    const res = await cancelOrderApi(orderNo)
    if (res.code === 1) {
      ElMessage.success('订单已取消')
      loadOrders()
    } else {
      ElMessage.error(res.msg)
    }
  } catch (e) {}
}

const buyAgain = async (order: UserOrderPageResultVO) => {
  try {
    // 遍历订单里的商品，重新加购
    for (const item of order.items) {
      await addCartApi({ skuId: item.skuId, quantity: item.quantity })
    }
    ElMessage.success('已加入购物车')
    router.push('/cart') // 跳转到购物车
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
      <!-- 左侧菜单栏 (复刻京东) -->
      <UserSideBar />

      <!-- 右侧主内容 -->
      <div class="right-content">
        <h2 class="page-title">我的订单</h2>

        <!-- 状态筛选 Tabs -->
        <div class="status-tabs">
          <span :class="{ active: searchForm.status === undefined }" @click="changeStatus(undefined)">全部</span>
          <span :class="{ active: searchForm.status === 0 }" @click="changeStatus(0)">待付款</span>
          <span :class="{ active: searchForm.status === 1 }" @click="changeStatus(1)">待发货</span>
          <span :class="{ active: searchForm.status === 3 }" @click="changeStatus(3)">待收货</span>
          <span :class="{ active: searchForm.status === 4 }" @click="changeStatus(4)">已完成</span>
          <span :class="{ active: searchForm.status === 2 }" @click="changeStatus(2)">已取消</span>
        </div>

        <!-- 订单列表 -->
        <div class="order-list" v-loading="loading">
          <div class="order-card" v-for="order in orderList" :key="order.orderNo">
            <!-- 订单头部 -->
            <div class="order-header">
              <div class="header-left">
                <span class="time">{{ order.createTime.replace('T', ' ') }}</span>
                <span class="order-no">订单号：{{ order.orderNo }}</span>
                <span class="merchant-name">{{ order.merchantName }}</span>
              </div>
              <div class="header-right">
                <span class="status" :class="statusMap[order.status]?.class">
                  {{ statusMap[order.status]?.text }}
                </span>
              </div>
            </div>

            <!-- 订单内容 -->
            <div class="order-body">
              <!-- 商品列表 -->
              <div class="goods-list">
                <div class="goods-item" v-for="item in order.items" :key="item.id">
                  <img :src="item.image" alt="商品图" />
                  <div class="info">
                    <h4>{{ item.productName }}</h4>
                    <p>{{ formatSkuSpecs(item.skuSpecs) }}</p>
                  </div>
                  <div class="price-info">
                    ￥{{ item.price }} <span class="qty">x{{ item.quantity }}</span>
                  </div>
                </div>
                <div class="order-address-info">
                  <p>寄送至：{{ order.receiverAddress }}</p>
                  <p>收货人：{{ order.receiverName }} {{ order.receiverPhone }}</p>
                </div>
              </div>

              <!-- 金额与操作 -->
              <div class="order-actions">
                <div class="total">
                  <span class="label">在线支付</span>
                  <div class="price">￥{{ order.payAmount }}</div>
                </div>
                <div class="btns">
                  <!-- 0: 待付款 -->
                  <template v-if="order.status === 0">
                    <button class="btn-cancel" @click="handleCancel(order.orderNo)">取消订单</button>
                    <button class="btn-pay" @click="goPay(order.orderNo)">立即付款</button>
                  </template>
                  <!-- 3: 待收货 -->
                  <template v-else-if="order.status === 3">
                    <button class="btn-pay" @click="handleReceive(order.orderNo)">确认收货</button>
                    <button class="btn-default">查看物流</button>
                  </template>
                  <!-- 其他状态 -->
                  <template v-else>
                    <button class="btn-default" @click="router.push('/product')">再次购买</button>
                    <button class="btn-default" @click="router.push(`/order/detail/${order.orderNo}`)">订单详情</button>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div class="empty" v-if="orderList.length === 0 && !loading">
            <p>暂无相关订单</p>
          </div>

          <!-- 分页 -->
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

/* 双栏布局 */
.layout-wrapper {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}

/* 右侧内容 */
.right-content { flex: 1; min-width: 0; }
.page-title { font-size: 22px; color: #333; margin-bottom: 20px; font-weight: normal; }

/* Tabs */
.status-tabs {
  display: flex;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 15px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.status-tabs span {
  flex: 1;
  text-align: center;
  padding: 15px 0;
  cursor: pointer;
  font-size: 15px;
  color: #333;
}
.status-tabs span.active { color: #e1251b; font-weight: bold; border-bottom: 2px solid #e1251b; }

/* 订单卡片 */
.order-card {
  background: #fff;
  border-radius: 8px;
  margin-bottom: 15px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.order-header {
  padding: 15px 20px;
  background: #f8f8f8;
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #666;
  border-radius: 8px 8px 0 0;
}
.header-left span { margin-right: 25px; }
.merchant-name { font-weight: bold; color: #333; }

/* 订单内容 */
.order-body {
  display: flex;
  border: 1px solid #eee;
  border-top: none;
  border-radius: 0 0 8px 8px;
}

/* 商品明细 */
.goods-list { flex: 1; padding: 15px 20px; }
.goods-item {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px dashed #eee;
}
.goods-item:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
.goods-item img { width: 70px; height: 70px; object-fit: cover; border: 1px solid #eee; margin-right: 15px; }
.goods-item .info { flex: 1; }
.goods-item .info h4 { font-size: 14px; color: #333; margin-bottom: 5px; font-weight: normal; }
.goods-item .info p { font-size: 12px; color: #999; }
.goods-item .price-info { font-weight: bold; color: #333; font-size: 14px; margin-right: 30px; }
.qty { color: #999; font-weight: normal; margin-left: 5px; }

/* 右侧操作区 */
.order-actions {
  width: 180px;
  border-left: 1px solid #eee;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
}
.total { text-align: center; }
.total .label { font-size: 12px; color: #999; display: block; margin-bottom: 5px; }
.total .price { font-size: 18px; color: #333; font-weight: bold; }
.btns { display: flex; flex-direction: column; gap: 10px; width: 100%; }
.btns button {
  width: 100%;
  padding: 8px 0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  border: none;
}
.goods-list {
  flex: 1;
  padding: 15px 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* 新增地址区域的样式 */
.order-address-info {
  margin-top: 20px;
  font-size: 13px;
  color: #999;
  line-height: 1.6;
  background: #fcfcfc;
  padding: 10px;
  border-radius: 4px;
  border: 1px dashed #eee;
}
.btn-pay { background: #e1251b; color: #fff; }
.btn-pay:hover { background: #c91e15; }
.btn-cancel { background: #fff; border: 1px solid #ddd; color: #333; }
.btn-cancel:hover { border-color: #e1251b; color: #e1251b; }
.btn-default { background: #fff; border: 1px solid #ddd; color: #333; }
.btn-default:hover { border-color: #333; }

/* 文字颜色 */
.text-red { color: #e1251b; }
.text-green { color: #67c23a; }
.text-gray { color: #999; }

.empty { text-align: center; padding: 100px 0; color: #999; background: #fff; border-radius: 8px; }
.pagination { margin-top: 30px; justify-content: center; }
</style>