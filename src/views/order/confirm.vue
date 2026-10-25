<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import type { AddressVO, UsableCouponVO, OrderPreviewVO } from '@/types/order'
import { getCartListApi } from '@/api/cart'
import { getAddressListApi } from '@/api/address'
import { getUsableCouponsApi } from '@/api/coupon'
import { formatSkuSpecs } from '@/utils/specs'
import { getOrderPreviewApi, createOrderFromCartApi, getOrderPreviewDirectApi, createOrderDirectApi } from '@/api/order'
import { useRoute } from 'vue-router'

const route = useRoute()
const isDirectBuy = ref(!!route.query.skuId)
const directSkuId = Number(route.query.skuId)
const directQuantity = Number(route.query.quantity)

const router = useRouter()

// 核心数据
const addressList = ref<AddressVO[]>([])
const selectedAddress = ref<AddressVO | null>(null)
const previewData = ref<OrderPreviewVO | null>(null) // 后端算好的全部数据
const loading = ref(false)

// 优惠券相关
const merchantCoupons = ref<Record<number, UsableCouponVO[]>>({}) // 每个商家的可用券
const selectedCoupons = ref<Record<number, UsableCouponVO | null>>({}) // 每个商家选中的券

const addressDialogVisible = ref(false)

// 拉取预计算数据
const fetchPreview = async () => {
  if (!selectedAddress.value) return
  loading.value = true
  try {
    let couponIds = Object.values(selectedCoupons.value).filter(c => !!c).map(c => c!.userCouponId)
    let res

    if (isDirectBuy.value) {
      // 直接购买模式（暂时只能选一张券）
      res = await getOrderPreviewDirectApi({
        skuId: directSkuId,
        quantity: directQuantity,
        userCouponId: couponIds.length > 0 ? couponIds[0] : undefined
      })
    } else {
      // 购物车模式
      res = await getOrderPreviewApi({
        addressId: selectedAddress.value.id,
        userCouponIds: couponIds.length > 0 ? couponIds : undefined
      })
    }

    if (res.code === 1) {
      previewData.value = res.data

      // 重新拉取可用券
      for (const merchant of res.data.merchantList) {
        if (!merchantCoupons.value[merchant.merchantId]) {
          const couponRes = await getUsableCouponsApi(merchant.merchantId, merchant.merchantProductAmount)
          if (couponRes.code === 1) {
            merchantCoupons.value[merchant.merchantId] = couponRes.data || []
          }
        }
      }
    }
  } finally {
    loading.value = false
  }
}

// 初始化页面
const initData = async () => {
  loading.value = true
  try {
    if (!isDirectBuy.value) {
      const cartRes = await getCartListApi()
      const checkedItems = (cartRes.data || []).filter((i: any) => Number(i.checked) === 1 && !i.invalid)
      if (checkedItems.length === 0) {
        ElMessage.warning('没有选中任何商品')
        router.push('/cart')
        return
      }
    }

    // 获取地址逻辑不变...
    const addressRes = await getAddressListApi()
    if (addressRes.code === 1) {
      addressList.value = addressRes.data || []
      selectedAddress.value = addressList.value.find(a => a.isDefault === 1) || addressList.value[0] || null
    }

    if (selectedAddress.value) {
      await fetchPreview()
    }
  } finally {
    loading.value = false
  }
}

// 监听优惠券变动，触发重新计算
watch(selectedCoupons, () => {
  console.log('【优惠券变更】当前数据:', selectedCoupons.value)
  fetchPreview()
}, { deep: true })

// 切换地址
const handleSelectAddress = (addr: AddressVO) => {
  selectedAddress.value = addr
  addressDialogVisible.value = false
  fetchPreview()
}

// 提交订单
const submitOrder = async () => {
  if (!selectedAddress.value) return ElMessage.warning('请选择收货地址')
  if (!previewData.value) return

  try {
    await ElMessageBox.confirm(`订单金额：￥${previewData.value.payAmount.toFixed(2)}，确认提交？`, '提交订单', { type: 'info' })
    loading.value = true

    let couponIds = Object.values(selectedCoupons.value).filter(c => !!c).map(c => c!.userCouponId)
    let res

    if (isDirectBuy.value) {
      res = await createOrderDirectApi({
        addressId: selectedAddress.value.id,
        skuId: directSkuId,
        quantity: directQuantity,
        userCouponId: couponIds.length > 0 ? couponIds[0] : undefined
      })
    } else {
      res = await createOrderFromCartApi({
        addressId: selectedAddress.value.id,
        userCouponIds: couponIds
      })
    }

    if (res.code === 1) {
      ElMessage.success('订单提交成功')
      const orderNos = res.data.orderNos
      if (orderNos.length === 1) {
        window.open(`/api/pay/alipay?orderNo=${orderNos[0]}`, '_blank')
      }
      router.push('/order/list')
    } else {
      ElMessage.error(res.msg)
    }
  } catch (e) {
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  initData()
})
</script>

<template>
  <div class="confirm-page">
    <TopNav />
    <Header />

    <div class="container main-content" v-loading="loading">
      <h2 class="page-title">填写并核对订单信息</h2>

      <!-- 1. 收货地址模块 -->
      <div class="section address-section">
        <div class="section-header">
          <h3>收货人信息</h3>
          <span class="btn-link" @click="addressDialogVisible = true">切换地址</span>
        </div>

        <div class="address-content" v-if="selectedAddress">
          <p class="addr-name">{{ selectedAddress.receiverName }} <span class="phone">{{ selectedAddress.receiverPhone }}</span></p>
          <p class="addr-detail">{{ selectedAddress.province }}{{ selectedAddress.city }}{{ selectedAddress.district }}{{ selectedAddress.detail }}</p>
        </div>
        <div class="address-content empty" v-else>
          <span class="btn-link" @click="addressDialogVisible = true">+ 请添加收货地址</span>
        </div>
      </div>

      <!-- 2. 商品与优惠券模块（渲染后端的预计算结果） -->
      <div class="section items-section" v-if="previewData">
        <div class="section-header">
          <h3>商品清单</h3>
          <span class="header-tip">价格说明</span>
        </div>

        <div class="merchant-group" v-for="merchant in previewData.merchantList" :key="merchant.merchantId">
          <div class="merchant-header">
            <span class="m-icon">🏪</span>
            <span class="m-name">{{ merchant.merchantName }}</span>
          </div>

          <div class="items-list">
            <div class="item-row" v-for="item in merchant.items" :key="item.id">
              <img :src="item.skuImage" class="p-img" />
              <div class="p-info">
                <h4 class="p-title">{{ item.productName }}</h4>
                <p class="p-specs">{{ formatSkuSpecs(item.skuSpecs) }}</p>
              </div>
              <div class="p-price">¥{{ item.price }}</div>
              <div class="p-qty">x{{ item.quantity }}</div>
              <div class="p-total">¥{{ (item.price * item.quantity).toFixed(2) }}</div>
            </div>
          </div>

          <!-- 优惠券选择：只针对当前商家 -->
          <div class="coupon-row">
            <span class="label">店铺优惠券</span>
            <el-select
                v-model="selectedCoupons[merchant.merchantId]"
                placeholder="选择本店优惠券"
                clearable
                value-key="userCouponId"
                style="width: 350px"
            >
              <el-option
                  v-for="coupon in merchantCoupons[merchant.merchantId]"
                  :key="coupon.userCouponId"
                  :label="`${coupon.name} (减¥${coupon.discountAmount})`"
                  :value="coupon"
              />
            </el-select>
            <span class="coupon-tip" v-if="!merchantCoupons[merchant.merchantId]?.length">该店铺暂无可用券</span>
          </div>
        </div>
      </div>

      <!-- 3. 支付方式 -->
      <div class="section pay-section">
        <div class="section-header">
          <h3>支付方式</h3>
        </div>
        <div class="pay-method">
          <div class="alipay-box">
            <span class="alipay-text">支付宝</span>
            <span class="check-icon">✔</span>
          </div>
        </div>
      </div>

      <!-- 4. 底部结算 -->
      <div class="section bottom-checkout-section" v-if="previewData">
        <!-- 左侧：地址与保障，垂直分散布局撑满高度 -->
        <div class="address-confirm" v-if="selectedAddress">
          <div class="addr-top">
            <h3 class="confirm-title">订单确认</h3>
            <p>寄送至：{{ selectedAddress.province }}{{ selectedAddress.city }}{{ selectedAddress.district }} {{ selectedAddress.detail }}</p>
            <p>收货人：{{ selectedAddress.receiverName }} <span class="phone">{{ selectedAddress.receiverPhone }}</span></p>
          </div>
          <div class="safe-tip">
            <span>🛡️ 支付安全保障中，请放心购买</span>
          </div>
        </div>
        <div v-else class="address-confirm empty">请选择收货地址</div>

        <!-- 右侧：金额明细与提交按钮 -->
        <div class="right-summary">
          <div class="summary-info">
            <div class="summary-row">
              <span class="label">商品总额：</span>
              <span class="val">¥{{ previewData.totalProductAmount.toFixed(2) }}</span>
            </div>
            <div class="summary-row">
              <span class="label">运费：</span>
              <span class="val">¥0.00</span>
            </div>
            <div class="summary-row discount">
              <span class="label">优惠总额：</span>
              <span class="val">-¥{{ previewData.totalDiscountAmount.toFixed(2) }}</span>
            </div>
            <div class="summary-row total">
              <span class="label">应付总额：</span>
              <span class="price-highlight">¥{{ previewData.payAmount.toFixed(2) }}</span>
            </div>
          </div>
          <button class="btn-submit" @click="submitOrder">提交订单</button>
        </div>
      </div>

    </div>

    <!-- 地址选择弹窗 -->
    <el-dialog v-model="addressDialogVisible" title="选择收货地址" width="600">
      <div class="dialog-address-list">
        <div
            class="dialog-address-item"
            v-for="addr in addressList"
            :key="addr.id"
            :class="{ active: selectedAddress?.id === addr.id }"
            @click="handleSelectAddress(addr)"
        >
          <p class="name">{{ addr.receiverName }} <span class="phone">{{ addr.receiverPhone }}</span></p>
          <p class="detail">{{ addr.province }}{{ addr.city }}{{ addr.district }}{{ addr.detail }}</p>
          <span class="default-tag" v-if="addr.isDefault === 1">默认</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="addressDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="router.push('/user/address')">管理地址</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.confirm-page {
  background: #f4f4f4;
  min-height: 100vh;
  padding-bottom: 80px;
}

.main-content {
  margin-top: 20px;
}

.page-title {
  font-size: 22px;
  margin-bottom: 15px;
  font-weight: normal;
  color: #333;
}

/* 通用卡片样式 */
.section {
  background: #fff;
  border-radius: 8px;
  margin-bottom: 20px;
  padding: 25px 30px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
  margin-bottom: 20px;
}
.section-header h3 {
  font-size: 16px;
  color: #333;
  font-weight: bold;
}
.header-tip {
  color: #999;
  font-size: 12px;
}
.btn-link {
  color: #005ea7;
  cursor: pointer;
  font-size: 14px;
}
.btn-link:hover {
  color: #e1251b;
}

/* 1. 地址 */
.address-content p {
  margin-bottom: 8px;
  font-size: 14px;
  color: #333;
}
.addr-name {
  font-weight: bold;
  font-size: 16px;
}
.phone {
  margin-left: 15px;
  color: #666;
  font-weight: normal;
  font-size: 14px;
}
.empty {
  color: #e1251b;
  padding: 10px 0;
}

/* 2. 商家与商品 */
.merchant-group {
  border-bottom: 1px solid #f4f4f4;
  padding-bottom: 20px;
  margin-bottom: 20px;
}
.merchant-group:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}
.merchant-header {
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.items-list {
  margin-bottom: 15px;
}
.item-row {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  font-size: 14px;
}
.p-img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  margin-right: 20px;
  border: 1px solid #eee;
}
.p-info {
  flex: 1; /* 占据剩余空间 */
  min-width: 0; /* 防止文字撑破 */
}
.p-title {
  color: #333;
  font-weight: normal;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.p-specs {
  color: #999;
  font-size: 12px;
}
.p-price, .p-qty {
  width: 120px;
  text-align: center;
  color: #333;
}
.p-total {
  width: 120px;
  text-align: right;
  color: #333;
  font-weight: bold;
}

/* 3. 优惠券 */
.coupon-row {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 14px;
  padding-left: 100px; /* 对齐图片右侧 */
}
.coupon-row .label {
  color: #666;
}
.coupon-tip {
  color: #e1251b;
  font-size: 12px;
}

/* 4. 支付方式 */
.pay-method {
  display: flex;
  gap: 20px;
}
.alipay-box {
  border: 1px solid #e1251b;
  padding: 12px 30px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  background: #fef5f5;
  position: relative;
}
.alipay-text {
  font-size: 16px;
  font-weight: bold;
  color: #1677ff;
}
.check-icon {
  color: #e1251b;
  font-weight: bold;
  font-size: 18px;
}

/* 5. 底部结算 */
.bottom-checkout-section {
  display: flex;
  justify-content: space-between;
  align-items: stretch; /* 关键修改：让左右两边高度一致，填满空间 */
  padding: 30px !important; /* 稍微加大内边距 */
}

/* 左侧地址区域 */
.address-confirm {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between; /* 关键：地址放顶部，安全提示放底部，完美填满垂直空间 */
  padding-right: 40px;
  font-size: 14px;
  color: #666;
}

.addr-top {
  margin-top: 10px;
}
.confirm-title {
  font-size: 16px;
  color: #333;
  margin-bottom: 20px;
  font-weight: bold;
}
.address-confirm p {
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.6;
}
.address-confirm .phone {
  color: #999;
  margin-left: 15px;
}

.safe-tip {
  margin-top: 20px;
  color: #e1251b;
  font-size: 13px;
  background: #fef5f5;
  padding: 10px 15px;
  border-radius: 4px;
  display: inline-block;
  width: fit-content;
}

/* 右侧金额与按钮 */
.right-summary {
  width: 320px;
  display: flex;
  flex-direction: column;
  justify-content: space-between; /* 金额在上，按钮在下 */
  border-left: 1px dashed #eee; /* 加个分割线，瞬间就不觉得空了 */
  padding-left: 40px;
}

.summary-info {
  margin-top: 10px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
  color: #333;
}
.summary-row .label { color: #666; }
.discount .val { color: #e1251b; }

.total {
  font-size: 16px;
  font-weight: bold;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}
.price-highlight {
  color: #e1251b;
  font-size: 26px;
  font-weight: bold;
}

.btn-submit {
  width: 100%; /* 让按钮和金额等宽，更有冲击力 */
  height: 50px;
  background: #e1251b;
  color: #fff;
  font-size: 18px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 20px;
}
.btn-submit:hover { background: #c91e15; }
/* 弹窗地址列表 */
.dialog-address-list { max-height: 400px; overflow-y: auto; }
.dialog-address-item {
  padding: 15px;
  border: 1px solid #eee;
  margin-bottom: 10px;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}
.dialog-address-item:hover { border-color: #e1251b; }
.dialog-address-item.active { border-color: #e1251b; background: #fef5f5; }
.dialog-address-item .name { font-weight: bold; margin-bottom: 5px; }
.dialog-address-item .detail { font-size: 13px; color: #666; }
.default-tag {
  position: absolute; right: 15px; top: 15px;
  background: #e1251b; color: #fff; font-size: 12px; padding: 2px 6px; border-radius: 2px;
}
</style>