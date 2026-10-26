<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import { getMyCouponPageApi } from '@/api/coupon'
import type { UserCouponVO } from '@/types/coupon'
import UserSideBar from "@/components/UserSideBar.vue";

const router = useRouter()
const activeTab = ref<number>(0) // 0-未使用 1-已使用 2-已过期
const loading = ref(false)
const couponList = ref<UserCouponVO[]>([])
const total = ref(0)
const pageQuery = ref({ page: 1, pageSize: 10 })

const loadCoupons = async () => {
  loading.value = true
  try {
    const res = await getMyCouponPageApi({
      page: pageQuery.value.page,
      pageSize: pageQuery.value.pageSize,
      status: activeTab.value
    })
    if (res.code === 1) {
      couponList.value = res.data.records || []
      total.value = res.data.total
    }
  } finally {
    loading.value = false
  }
}

const changeTab = (tab: number) => {
  activeTab.value = tab
  pageQuery.value.page = 1
  loadCoupons()
}

const handlePageChange = (val: number) => {
  pageQuery.value.page = val
  loadCoupons()
}

onMounted(() => {
  loadCoupons()
})
</script>

<template>
  <div class="coupon-page">
    <TopNav />
    <Header />

    <div class="container layout-wrapper" v-loading="loading">
      <UserSideBar />

      <div class="right-content">
        <div class="panel-card">
          <div class="tabs">
            <div class="tab-item" :class="{ active: activeTab === 0 }" @click="changeTab(0)">未使用</div>
            <div class="tab-item" :class="{ active: activeTab === 1 }" @click="changeTab(1)">已使用</div>
            <div class="tab-item" :class="{ active: activeTab === 2 }" @click="changeTab(2)">已过期</div>
          </div>

          <div class="coupon-list" v-if="couponList.length > 0">
            <div class="coupon-card" v-for="item in couponList" :key="item.id" :class="{ gray: activeTab !== 0 }">
              <!-- 左侧金额/折扣区 -->
              <div class="coupon-left">
                <div class="amount" v-if="item.type === 1">
                  <span class="symbol">￥</span>{{ item.value }}
                </div>
                <div class="amount" v-else>
                  {{ (item.value * 10).toFixed(1) }}<span class="symbol">折</span>
                </div>
                <div class="condition">满 {{ item.minAmount }} 元可用</div>
              </div>

              <!-- 中间虚线分割 -->
              <div class="coupon-divider"></div>

              <!-- 右侧信息区 -->
              <div class="coupon-right">
                <h3 class="title">{{ item.couponName }}</h3>
                <p class="merchant">适用店铺：{{ item.merchantName }}</p>
                <p class="time">有效期至：{{ item.expireTime.split('T')[0] }}</p>
              </div>
            </div>
          </div>

          <div class="empty" v-else>
            暂无相关优惠券
          </div>

          <el-pagination
              v-if="total > 0"
              background
              layout="prev, pager, next"
              :total="total"
              :page-size="pageQuery.pageSize"
              :current-page="pageQuery.page"
              @current-change="handlePageChange"
              class="pager"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coupon-page { background: #f4f4f4; min-height: 100vh; padding-bottom: 50px; }
.layout-wrapper { display: flex; gap: 20px; margin-top: 20px; }
.right-content { flex: 1; min-width: 0; }
.panel-card { background: #fff; border-radius: 8px; padding: 20px; min-height: 500px; }

/* Tabs */
.tabs { display: flex; border-bottom: 1px solid #eee; margin-bottom: 20px; }
.tab-item { padding: 15px 30px; font-size: 16px; color: #333; cursor: pointer; }
.tab-item.active { color: #e1251b; font-weight: bold; border-bottom: 2px solid #e1251b; }

/* 优惠券卡片 */
.coupon-list { display: flex; flex-direction: column; gap: 15px; }
.coupon-card { display: flex; background: #fef5f5; border: 1px solid #fce4e4; border-radius: 8px; overflow: hidden; height: 120px; }
.coupon-card.gray { background: #f8f8f8; border-color: #eee; filter: grayscale(100%); opacity: 0.7; }

.coupon-left { width: 150px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #e1251b; }
.coupon-left .amount { font-size: 32px; font-weight: bold; }
.coupon-left .symbol { font-size: 16px; }
.coupon-left .condition { font-size: 12px; margin-top: 5px; }

.coupon-divider { width: 1px; border-left: 2px dashed #fce4e4; margin: 10px 0; }
.coupon-card.gray .coupon-divider { border-left-color: #ddd; }

.coupon-right { flex: 1; padding: 15px 20px; display: flex; flex-direction: column; justify-content: center; }
.coupon-right .title { font-size: 16px; color: #333; margin-bottom: 8px; }
.coupon-right .merchant { font-size: 13px; color: #666; margin-bottom: 5px; }
.coupon-right .time { font-size: 12px; color: #999; }

.empty { text-align: center; padding: 100px 0; color: #999; }
.pager { margin-top: 30px; justify-content: center; }
</style>