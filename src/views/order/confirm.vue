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
const previewData = ref<OrderPreviewVO | null>(null)
const loading = ref(false)

// 优惠券相关
const merchantCoupons = ref<Record<number, UsableCouponVO[]>>({})
const selectedCoupons = ref<Record<number, UsableCouponVO | null>>({})

const addressDialogVisible = ref(false)

const fetchPreview = async () => {
  if (!selectedAddress.value) return
  loading.value = true
  try {
    let couponIds = Object.values(selectedCoupons.value).filter(c => !!c).map(c => c!.userCouponId)
    let res

    if (isDirectBuy.value) {
      res = await getOrderPreviewDirectApi({
        skuId: directSkuId,
        quantity: directQuantity,
        userCouponId: couponIds.length > 0 ? couponIds[0] : undefined
      })
    } else {
      res = await getOrderPreviewApi({
        addressId: selectedAddress.value.id,
        userCouponIds: couponIds.length > 0 ? couponIds : undefined
      })
    }

    if (res.code === 1) {
      previewData.value = res.data

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

watch(selectedCoupons, () => {
  fetchPreview()
}, { deep: true })

const handleSelectAddress = (addr: AddressVO) => {
  selectedAddress.value = addr
  addressDialogVisible.value = false
  fetchPreview()
}

const submitOrder = async () => {
  if (!selectedAddress.value) return ElMessage.warning('请选择收货地址')
  if (!previewData.value) return

  try {
    await ElMessageBox.confirm(
        `订单金额：￥${previewData.value.payAmount.toFixed(2)}，确认提交？`,
        '提交订单',
        {
          type: 'info',
          confirmButtonText: '确认提交',
          cancelButtonText: '取消'
        }
    )
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
          <el-button type="primary" plain size="small" @click="addressDialogVisible = true">
            <el-icon><Location /></el-icon> 切换地址
          </el-button>
        </div>

        <div class="address-content" v-if="selectedAddress">
          <div class="addr-main">
            <span class="addr-name">{{ selectedAddress.receiverName }}</span>
            <span class="phone">{{ selectedAddress.receiverPhone }}</span>
          </div>
          <p class="addr-detail">{{ selectedAddress.province }}{{ selectedAddress.city }}{{ selectedAddress.district }} {{ selectedAddress.detail }}</p>
        </div>
        <div class="address-content empty" v-else>
          <span class="btn-link" @click="addressDialogVisible = true">+ 请添加收货地址</span>
        </div>
      </div>

      <!-- 2. 商品与优惠券模块 -->
      <div class="section items-section" v-if="previewData">
        <div class="section-header">
          <h3>商品清单</h3>
          <span class="header-tip"><el-icon><Document /></el-icon> 价格说明</span>
        </div>

        <div class="merchant-group" v-for="merchant in previewData.merchantList" :key="merchant.merchantId">
          <div class="merchant-header">
            <el-icon class="m-icon"><Shop /></el-icon>
            <span class="m-name">{{ merchant.merchantName }}</span>
          </div>

          <div class="items-list">
            <div class="item-row" v-for="item in merchant.items" :key="item.id">
              <img :src="item.skuImage || item.mainImage" class="p-img" />
              <div class="p-info">
                <h4 class="p-title">{{ item.productName }}</h4>
                <p class="p-specs">{{ formatSkuSpecs(item.skuSpecs) }}</p>
              </div>
              <div class="p-price">¥{{ item.price }}</div>
              <div class="p-qty">x{{ item.quantity }}</div>
              <div class="p-total">¥{{ (item.price * item.quantity).toFixed(2) }}</div>
            </div>
          </div>

          <!-- 优惠券选择 -->
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
            <span class="coupon-tip" v-if="!merchantCoupons[merchant.merchantId]?.length">
              该店铺暂无可用券
            </span>
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
            <div class="check-circle">
              <el-icon><Check /></el-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. 底部结算 -->
      <div class="section bottom-checkout-section" v-if="previewData">
        <div class="address-confirm" v-if="selectedAddress">
          <div class="addr-top">
            <h3 class="confirm-title">订单确认</h3>
            <p>寄送至：{{ selectedAddress.province }}{{ selectedAddress.city }}{{ selectedAddress.district }} {{ selectedAddress.detail }}</p>
            <p>收货人：{{ selectedAddress.receiverName }} <span class="phone">{{ selectedAddress.receiverPhone }}</span></p>
          </div>
          <div class="safe-tip">
            <el-icon><Lock /></el-icon> 支付安全保障中，请放心购买
          </div>
        </div>
        <div v-else class="address-confirm empty">请选择收货地址</div>

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
              <span class="price-highlight"><span class="symbol">¥</span>{{ previewData.payAmount.toFixed(2) }}</span>
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
          <div class="dialog-addr-header">
            <span class="name">{{ addr.receiverName }}</span>
            <span class="phone">{{ addr.receiverPhone }}</span>
            <span class="default-tag" v-if="addr.isDefault === 1">默认</span>
          </div>
          <p class="detail">{{ addr.province }}{{ addr.city }}{{ addr.district }} {{ addr.detail }}</p>
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
  margin-top: 24px;
}

.page-title {
  font-size: 22px;
  margin-bottom: 20px;
  font-weight: 600;
  color: #333;
}

/* 通用卡片样式 */
.section {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 20px;
  padding: 24px 30px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.3s;
}
.section:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 16px;
  margin-bottom: 20px;
}
.section-header h3 {
  font-size: 16px;
  color: #333;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-tip {
  color: #999;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: help;
}

/* 1. 地址 */
.address-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.addr-main {
  font-size: 16px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 15px;
}
.addr-name {
  font-weight: bold;
}
.phone {
  color: #666;
  font-size: 14px;
}
.addr-detail {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}
.empty {
  color: #e1251b;
  padding: 10px 0;
  cursor: pointer;
}

/* 2. 商家与商品 */
.merchant-group {
  border-bottom: 1px dashed #eee;
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
  font-weight: 600;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
}
.m-icon {
  color: #e1251b;
  font-size: 18px;
}

.items-list {
  margin-bottom: 16px;
  background: #fafafa;
  border-radius: 8px;
  padding: 10px 20px;
}

.item-row {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}
.item-row:last-child {
  border-bottom: none;
}

.p-img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  margin-right: 20px;
  border-radius: 6px;
  border: 1px solid #eee;
}

.p-info {
  flex: 1;
  min-width: 0;
}
.p-title {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.p-specs {
  color: #999;
  font-size: 13px;
}

.p-price {
  width: 100px;
  text-align: right;
  color: #666;
  font-size: 14px;
}
.p-qty {
  width: 80px;
  text-align: center;
  color: #999;
  font-size: 14px;
}
.p-total {
  width: 120px;
  text-align: right;
  color: #333;
  font-weight: 600;
  font-size: 15px;
}

/* 3. 优惠券 */
.coupon-row {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 14px;
  padding-left: 92px;
}
.coupon-row .label {
  color: #666;
  font-weight: 500;
}
.coupon-tip {
  color: #e1251b;
  font-size: 13px;
  background: #fef5f5;
  padding: 2px 8px;
  border-radius: 4px;
}

/* 4. 支付方式 */
.pay-method {
  display: flex;
  gap: 20px;
}
.alipay-box {
  border: 1px solid #e1251b;
  padding: 12px 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  background: #fef5f5;
  position: relative;
}
.alipay-text {
  font-size: 16px;
  font-weight: bold;
  color: #1677ff;
}
.check-circle {
  width: 20px;
  height: 20px;
  background: #e1251b;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

/* 5. 底部结算 */
.bottom-checkout-section {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  padding: 30px !important;
  background: #fff;
  border-top: 2px solid #e1251b;
}

.address-confirm {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-right: 40px;
}

.addr-top {
  margin-top: 5px;
}
.confirm-title {
  font-size: 18px;
  color: #333;
  margin-bottom: 16px;
  font-weight: 600;
}
.address-confirm p {
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: #666;
}

.safe-tip {
  margin-top: 20px;
  color: #e1251b;
  font-size: 13px;
  background: #fef5f5;
  padding: 8px 16px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
}

.right-summary {
  width: 320px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-left: 1px dashed #e0e0e0;
  padding-left: 40px;
}

.summary-info {
  margin-top: 5px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 14px;
  font-size: 14px;
  color: #333;
}
.summary-row .label {
  color: #666;
}
.discount .val {
  color: #e1251b;
  font-weight: 500;
}

.total {
  font-size: 16px;
  font-weight: bold;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
  align-items: baseline;
}
.price-highlight {
  color: #e1251b;
  font-size: 30px;
  font-weight: bold;
  font-family: Arial, sans-serif;
}
.price-highlight .symbol {
  font-size: 18px;
  margin-right: 2px;
}

.btn-submit {
  width: 100%;
  height: 54px;
  background: linear-gradient(90deg, #e1251b 0%, #c91e15 100%);
  color: #fff;
  font-size: 18px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 20px;
  transition: all 0.2s;
}
.btn-submit:hover {
  box-shadow: 0 6px 16px rgba(225, 37, 27, 0.4);
  transform: translateY(-2px);
}
.btn-submit:active {
  transform: scale(0.98);
}

/* 弹窗地址列表 */
.dialog-address-list {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 5px;
}
.dialog-address-list::-webkit-scrollbar {
  width: 6px;
}
.dialog-address-list::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 3px;
}
.dialog-address-item {
  padding: 16px;
  border: 1px solid #eee;
  margin-bottom: 12px;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}
.dialog-address-item:hover {
  border-color: #e1251b;
  background: #fafafa;
}
.dialog-address-item.active {
  border-color: #e1251b;
  background: #fef5f5;
  box-shadow: 0 2px 8px rgba(225, 37, 27, 0.1);
}
.dialog-addr-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.dialog-addr-header .name {
  font-weight: bold;
  font-size: 15px;
  color: #333;
}
.dialog-addr-header .phone {
  color: #666;
  font-size: 14px;
}
.dialog-address-item .detail {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}
.default-tag {
  background: #e1251b;
  color: #fff;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
}
</style>