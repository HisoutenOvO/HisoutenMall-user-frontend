<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage,ElMessageBox } from 'element-plus'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import {cancelOrderApi, getOrderDetailApi, receiveOrderApi} from '@/api/order'
import type { UserOrderDetailVO } from '@/types/order'
import { formatSkuSpecs } from '@/utils/specs'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const detail = ref<UserOrderDetailVO | null>(null)

// 状态映射
const statusText = computed(() => {
  if (!detail.value) return ''
  const map: Record<number, string> = {
    0: '等待付款', 1: '等待发货', 2: '已取消', 3: '等待收货', 4: '已完成', 5: '已退款'
  }
  return map[detail.value.status] || '未知'
})

// 进度条节点 (模拟)
const steps = ['提交订单', '付款成功', '商品出库', '等待收货', '完成']
const currentStep = computed(() => {
  if (!detail.value) return 0
  const s = detail.value.status
  if (s === 0) return 1 // 提交
  if (s === 1) return 2 // 付款
  if (s === 3) return 4 // 出库后/待收货
  if (s === 4) return 5 // 完成
  return 1
})
const handleReceive = async () => {
  if (!detail.value) return
  try {
    await ElMessageBox.confirm('请确认已收到商品？', '提示', { type: 'info' })
    const res = await receiveOrderApi(detail.value.orderNo)
    if (res.code === 1) {
      ElMessage.success('确认收货成功')
      loadDetail()
    }
  } catch (e) {}
}

const loadDetail = async () => {
  const orderNo = route.params.orderNo as string
  if (!orderNo) return router.push('/order/list')

  loading.value = true
  try {
    const res = await getOrderDetailApi(orderNo)
    if (res.code === 1) {
      detail.value = res.data
    } else {
      ElMessage.error(res.msg)
    }
  } finally {
    loading.value = false
  }
}
// 去支付
const goPay = () => {
  if (!detail.value) return
  window.open(`/pay/alipay?orderNo=${detail.value.orderNo}`, '_blank')
  // 延迟刷新一下页面状态
  setTimeout(() => loadDetail(), 2000)
}

// 取消订单
const handleCancel = async () => {
  if (!detail.value) return
  try {
    await ElMessageBox.confirm('确定要取消该订单吗？', '提示', { type: 'warning' })
    const res = await cancelOrderApi(detail.value.orderNo)
    if (res.code === 1) {
      ElMessage.success('订单已取消')
      loadDetail() // 刷新详情
    } else {
      ElMessage.error(res.msg)
    }
  } catch (e) {
    // 用户取消操作
  }
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <div class="detail-page">
    <TopNav />
    <Header />

    <div class="container main-content" v-loading="loading">
      <!-- 面包屑 -->
      <div class="breadcrumb">
        <span @click="router.push('/order/list')">返回订单列表</span> / 订单详情
      </div>

      <div v-if="detail" class="content-wrapper">
        <!-- 1. 状态头部与进度条 -->
        <div class="status-header">
          <div class="left-status">
            <h2>订单状态：{{ statusText }}</h2>
            <p v-if="detail.status === 0">请在 30 分钟内完成支付，否则订单将自动取消。</p>
            <p v-else-if="detail.status === 3">订单已完成，感谢您在商城购物。</p>
          </div>

          <div class="steps-container">
            <div
                v-for="(step, index) in steps"
                :key="index"
                class="step-item"
                :class="{ active: currentStep > index, current: currentStep === index + 1 }"
            >
              <div class="step-circle">{{ index + 1 }}</div>
              <div class="step-name">{{ step }}</div>
              <div class="step-line" v-if="index < steps.length - 1"></div>
            </div>
          </div>
        </div>

        <!-- 2. 物流信息 (如果有) -->
        <div class="info-card" v-if="detail.logistics">
          <div class="card-title">物流信息</div>
          <div class="logistics-content">
            <div class="log-left">
              <p><span>承运公司：</span>{{ detail.logistics.company || '待定' }}</p>
              <p><span>运单编号：</span>{{ detail.logistics.trackingNo || '待定' }}</p>
            </div>
            <div class="log-right">
              <!-- 简单模拟一个时间线 -->
              <div class="timeline">
                <div class="timeline-item active">
                  <div class="dot"></div>
                  <div class="time">{{ detail.logistics.updateTime?.replace('T', ' ') || '刚刚' }}</div>
                  <div class="desc">
                    {{ detail.logistics.status === 2 ? '您的订单已签收' : '您的订单正在派送中' }}
                  </div>
                </div>
                <div class="timeline-item" v-if="detail.logistics.shipTime">
                  <div class="dot"></div>
                  <div class="time">{{ detail.logistics.shipTime?.replace('T', ' ') }}</div>
                  <div class="desc">商品已出库，发往目的地</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. 收货人与付款信息 -->
        <div class="info-card">
          <div class="card-title">收货人信息</div>
          <div class="grid-info">
            <div class="info-item"><span>收货人：</span>{{ detail.receiverName }}</div>
            <div class="info-item"><span>联系电话：</span>{{ detail.receiverPhone }}</div>
            <div class="info-item full-width"><span>收货地址：</span>{{ detail.receiverAddress }}</div>
          </div>
        </div>

        <!-- 4. 商品清单 -->
        <div class="info-card">
          <div class="card-title">商品清单 <span class="merchant">店铺：{{ detail.merchantName }}</span></div>

          <div class="goods-table">
            <div class="table-header">
              <div class="col-goods">商品信息</div>
              <div class="col-price">单价</div>
              <div class="col-qty">数量</div>
              <div class="col-total">小计</div>
            </div>

            <div class="table-row" v-for="item in detail.items" :key="item.id">
              <div class="col-goods">
                <img :src="item.image" alt="商品图" />
                <div class="name-specs">
                  <h4>{{ item.productName }}</h4>
                  <p>{{ formatSkuSpecs(item.skuSpecs) }}</p>
                </div>
              </div>
              <div class="col-price">￥{{ item.price }}</div>
              <div class="col-qty">x{{ item.quantity }}</div>
              <div class="col-total">￥{{ (item.price * item.quantity).toFixed(2) }}</div>
            </div>
          </div>
        </div>

        <!-- 5. 金额汇总 -->
        <!-- 5. 金额汇总 -->
        <div class="info-card">
          <div class="card-title">费用明细</div>
          <div class="amount-list-full">
            <div class="amount-row">
              <span class="label">商品总额：</span>
              <span class="value">￥{{ detail.totalAmount }}</span>
            </div>
            <div class="amount-row">
              <span class="label">运费：</span>
              <span class="value">+ ￥0.00</span>
            </div>
            <div class="amount-row" v-if="detail.discountAmount > 0">
              <span class="label">优惠减免 <span v-if="detail.couponInfo">({{ detail.couponInfo.couponName }})</span>：</span>
              <span class="value text-red">- ￥{{ detail.discountAmount }}</span>
            </div>
            <div class="amount-row total-row">
              <span class="label">实付款：</span>
              <span class="value text-red price">￥{{ detail.payAmount }}</span>
            </div>
          </div>
        </div>

        <!-- 6. 操作按钮区 -->
        <div class="action-bar">
          <p class="order-meta">
            订单编号：{{ detail.orderNo }} <br/>
            下单时间：{{ detail.createTime?.replace('T', ' ') || '' }}
            <span v-if="detail.payTime"><br/>支付时间：{{ detail.payTime?.replace('T', ' ') }}</span>
          </p>
          <div class="btns">
            <button class="btn-default" @click="router.push('/order/list')">返回列表</button>
            <!-- 待付款 -->
            <template v-if="detail.status === 0">
              <button class="btn-cancel" @click="handleCancel">取消订单</button>
              <button class="btn-pay" @click="goPay">立即付款</button>
            </template>
            <!-- 待收货 -->
            <template v-else-if="detail.status === 3">
              <button class="btn-pay" @click="handleReceive">确认收货</button>
            </template>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-page { background: #f4f4f4; min-height: 100vh; padding-bottom: 50px; }
.main-content { margin-top: 20px; }
.breadcrumb { font-size: 13px; color: #666; margin-bottom: 15px; }
.breadcrumb span { cursor: pointer; color: #005ea7; }
.breadcrumb span:hover { text-decoration: underline; }

.content-wrapper { display: flex; flex-direction: column; gap: 15px; }

/* 公共卡片样式 */
.info-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.card-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.merchant { font-size: 14px; font-weight: normal; color: #666; }

/* 1. 状态与进度条 */
.status-header { background: #fff; border-radius: 8px; padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; }
.left-status h2 { font-size: 20px; color: #333; margin-bottom: 8px; }
.left-status p { color: #999; font-size: 13px; }
.steps-container { display: flex; align-items: center; margin-top: 10px;}
.step-item { display: flex; flex-direction: column; align-items: center; position: relative; width: 100px; }
.step-circle {
  width: 30px; height: 30px; border-radius: 50%; background: #f0f0f0; color: #999;
  display: flex; align-items: center; justify-content: center; font-weight: bold; z-index: 2;
}
.step-name { font-size: 12px; color: #999; margin-top: 8px; text-align: center; }
.step-line { position: absolute; top: 15px; left: 50%; width: 100%; height: 2px; background: #f0f0f0; z-index: 1; }
.step-item.active .step-circle { background: #67c23a; color: #fff; }
.step-item.active .step-name { color: #333; }
.step-item.active .step-line { background: #67c23a; }
.step-item.current .step-circle { transform: scale(1.1); box-shadow: 0 0 8px rgba(103,194,58,0.5); }

/* 2. 物流信息 */
.logistics-content { display: flex; gap: 40px; }
.log-left { width: 250px; }
.log-left p { margin-bottom: 10px; color: #333; font-size: 14px; }
.log-left p span { color: #999; }
.log-right { flex: 1; border-left: 1px solid #eee; padding-left: 30px; }
.timeline-item { position: relative; padding-left: 20px; margin-bottom: 20px; }
.timeline-item .dot { position: absolute; left: 0; top: 4px; width: 10px; height: 10px; background: #ccc; border-radius: 50%; }
.timeline-item.active .dot { background: #67c23a; }
.timeline-item .time { font-size: 12px; color: #999; margin-bottom: 5px; }
.timeline-item .desc { font-size: 14px; color: #333; }
.timeline-item.active .desc { color: #67c23a; font-weight: bold; }

/* 3. 收货信息 */
.grid-info { display: flex; flex-wrap: wrap; gap: 15px; font-size: 14px; color: #333; }
.info-item { width: 45%; }
.info-item.full-width { width: 100%; }
.info-item span { color: #999; margin-right: 10px; }

/* 4. 商品清单 */
.goods-table { width: 100%; }
.table-header { display: flex; padding: 10px 0; border-bottom: 1px solid #eee; font-size: 13px; color: #999; }
.table-row { display: flex; align-items: center; padding: 15px 0; border-bottom: 1px solid #f8f8f8; font-size: 14px; }
.table-row:last-child { border-bottom: none; }
.col-goods { flex: 1; display: flex; align-items: center; gap: 15px; }
.col-goods img { width: 60px; height: 60px; object-fit: cover; border: 1px solid #eee; }
.col-goods .name-specs h4 { font-weight: normal; color: #333; margin-bottom: 5px; }
.col-goods .name-specs p { color: #999; font-size: 12px; }
.col-price { width: 120px; text-align: center; }
.col-qty { width: 80px; text-align: center; }
.col-total { width: 120px; text-align: right; font-weight: bold; color: #333; }

/* 5. 金额汇总 (全宽账单式) */
.amount-list-full {
  width: 100%;
  display: flex;
  flex-direction: column;
}
.amount-row {
  display: flex;
  justify-content: space-between; /* 左右撑开，消灭空白 */
  padding: 12px 0;
  font-size: 14px;
  color: #333;
  border-bottom: 1px dashed #f0f0f0; /* 加一条浅浅的虚线，像真实的账单 */
}
.amount-row:last-child {
  border-bottom: none;
}
.amount-row .label { color: #666; }
.amount-row .value { font-weight: 500; }

.amount-row.total-row {
  margin-top: 10px;
  padding-top: 15px;
  border-top: 1px solid #eee;
  align-items: baseline; /* 底部对齐，防止大字和小字高低不平 */
}
.amount-row.total-row .label { font-weight: bold; color: #333; font-size: 16px; }
.amount-row.total-row .price { font-size: 24px; font-weight: bold; color: #e1251b; }

/* 6. 操作区 */
.action-bar { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 20px; border-radius: 8px; }
.order-meta { font-size: 12px; color: #999; line-height: 1.8; }
.btns { display: flex; gap: 15px; }
.btns button { padding: 10px 25px; border-radius: 4px; font-size: 14px; cursor: pointer; border: none; }
.btn-default { background: #fff; border: 1px solid #ddd; color: #333; }
.btn-default:hover { border-color: #333; }
.btn-pay { background: #e1251b; color: #fff; }
.btn-pay:hover { background: #c91e15; }
.btn-cancel { background: #fff; border: 1px solid #ddd; color: #333; }
.btn-cancel:hover { border-color: #e1251b; color: #e1251b; }
</style>