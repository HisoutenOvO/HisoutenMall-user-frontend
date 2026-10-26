<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import {
  getSeckillActivityListApi,
  getSeckillActivityDetailApi,
  executeSeckillApi
} from '@/api/seckill'
import type { UserSeckillActivityListVO, UserSeckillActivityDetailVO } from '@/types/seckill'
import { formatSkuSpecs } from '@/utils/specs'

const router = useRouter()

// 活动列表与当前选中
const activityList = ref<UserSeckillActivityListVO[]>([])
const currentActivityId = ref<number | null>(null)

// 当前活动详情
const currentDetail = ref<UserSeckillActivityDetailVO | null>(null)
const loading = ref(false)

// 倒计时相关
const countdownText = ref('')
const countdownTimer = ref<number | null>(null)

// 记录当前正在抢购的 skuId，用于禁用按钮
const buyingSkuId = ref<number | null>(null)

// 1. 初始化活动列表
const loadActivities = async () => {
  const res = await getSeckillActivityListApi()
  if (res.code === 1 && res.data && res.data.length > 0) {
    activityList.value = res.data
    // 默认选中第一个进行中的，如果没有则选第一个
    const running = res.data.find(a => a.status === 1)
    const defaultId = running ? running.id : res.data[0]?.id
    if (defaultId) {
      changeActivity(defaultId)
    }
  }
}

// 2. 切换场次
const changeActivity = async (id: number) => {
  currentActivityId.value = id
  loading.value = true
  if (countdownTimer.value) clearInterval(countdownTimer.value)

  try {
    const res = await getSeckillActivityDetailApi(id)
    if (res.code === 1) {
      currentDetail.value = res.data
      startCountdown(res.data.remainSeconds)
    }
  } finally {
    loading.value = false
  }
}

// 3. 倒计时逻辑
const startCountdown = (seconds: number) => {
  if (seconds <= 0) {
    countdownText.value = '已结束'
    return
  }

  let remain = seconds

  const formatTime = (sec: number) => {
    const d = Math.floor(sec / (3600 * 24))
    const h = Math.floor((sec % (3600 * 24)) / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    let str = ''
    if (d > 0) str += `${d}天`
    str += `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return str
  }

  const updateText = () => {
    if (currentDetail.value?.status === 0) {
      countdownText.value = `距开始：${formatTime(remain)}`
    } else if (currentDetail.value?.status === 1) {
      countdownText.value = `距结束：${formatTime(remain)}`
    }

    if (remain <= 0) {
      clearInterval(countdownTimer.value!)
      changeActivity(currentActivityId.value!)
    }
    remain--
  }

  updateText()
  countdownTimer.value = window.setInterval(updateText, 1000)
}

// 4. 执行秒杀
const handleSeckill = async (skuId: number) => {
  if (!currentDetail.value) return
  buyingSkuId.value = skuId

  try {
    const res = await executeSeckillApi({
      activityId: currentDetail.value.id,
      skuId
    })

    if (res.code === 1) {
      ElMessageBox.alert(
          '抢购成功！系统已使用您的【默认收货地址】为您极速下单，请前往订单列表完成支付。',
          '抢购成功',
          {
            confirmButtonText: '去支付',
            callback: () => {
              router.push('/order/list')
            }
          }
      )
    } else {
      ElMessage.error(res.msg)
      changeActivity(currentActivityId.value!)
    }
  } catch (e: any) {
    ElMessage.error(e.message || '系统繁忙')
  } finally {
    buyingSkuId.value = null
  }
}

onMounted(() => {
  loadActivities()
})

onUnmounted(() => {
  if (countdownTimer.value) clearInterval(countdownTimer.value)
})
</script>

<template>
  <div class="seckill-page">
    <TopNav />
    <Header />

    <div class="container main-content">
      <!-- 顶部 Banner 与倒计时 -->
      <div class="seckill-banner">
        <div class="banner-left">
          <h1>HisoutenMall 限时秒杀</h1>
          <p>超值好物，限时抢购，手慢无！</p>
        </div>
        <div class="banner-right" v-if="countdownText">
          <span class="time-box">{{ countdownText }}</span>
        </div>
      </div>

      <!-- 场次切换 Tabs -->
      <div class="tabs-wrapper">
        <div
            v-for="act in activityList"
            :key="act.id"
            class="tab-card"
            :class="{ active: currentActivityId === act.id }"
            @click="changeActivity(act.id)"
        >
          <div class="act-header">
            <span class="act-name">{{ act.name }}</span>
            <span class="act-status" v-if="act.status === 1">疯抢中</span>
            <span class="act-status gray" v-else-if="act.status === 0">即将开始</span>
          </div>
          <div class="act-sub">
            <span class="merchant">{{ act.merchantName || '官方旗舰店' }}</span>
            <span class="time">{{ act.startTime.substring(11, 16) }} 场</span>
          </div>
        </div>
      </div>

      <!-- 主体布局 -->
      <div class="content-layout">
        <!-- 商品列表 -->
        <div class="goods-list" v-loading="loading">
          <div class="goods-item" v-for="item in currentDetail?.products" :key="item.skuId">

            <!-- 图片与角标 -->
            <div class="goods-img" @click="router.push(`/product/${item.productId}`)">
              <img :src="item.image" :alt="item.productName" />

              <!-- 根据活动状态显示不同角标 -->
              <div class="corner-tag" v-if="currentDetail?.status === 1">秒杀</div>
              <div class="corner-tag upcoming-tag" v-else-if="currentDetail?.status === 0">预告</div>

              <!-- 只有活动进行中，且库存 <= 0 才显示已抢光遮罩 -->
              <div class="stock-mask" v-if="currentDetail?.status === 1 && item.seckillStock <= 0">
                <span>已抢光</span>
              </div>
            </div>

            <!-- 商品信息 -->
            <div class="goods-info">
              <h3 class="title" @click="router.push(`/product/${item.productId}`)">{{ item.productName }}</h3>
              <p class="specs">{{ formatSkuSpecs(item.skuSpecs) }}</p>

              <div class="price-box">
                <div class="seckill-price">
                  <span class="symbol">￥</span>{{ item.seckillPrice }}
                </div>
                <div class="original-price">￥{{ item.originalPrice }}</div>
              </div>

              <!-- 库存进度条 (分状态展示) -->
              <div class="stock-progress">
                <!-- 进行中：显示真实进度和剩余量 -->
                <template v-if="currentDetail?.status === 1">
                  <span class="stock-text">仅剩 {{ item.seckillStock || 0 }} 件</span>
                  <el-progress
                      :percentage="Math.min(100, Math.max(10, 100 - ((item.seckillStock || 0) / 100) * 100))"
                      :show-text="false"
                      :stroke-width="8"
                      color="#e1251b"
                  />
                </template>
                <!-- 未开始：显示总限量 -->
                <template v-else-if="currentDetail?.status === 0">
                  <span class="stock-text">限量 {{ item.seckillStock || 100 }} 件</span>
                  <el-progress :percentage="100" :show-text="false" :stroke-width="8" color="#ccc" />
                </template>
                <!-- 已结束 -->
                <template v-else>
                  <span class="stock-text">活动已结束</span>
                  <el-progress :percentage="100" :show-text="false" :stroke-width="8" color="#999" />
                </template>
              </div>

              <!-- 按钮 -->
              <div class="action-box">
                <button
                    v-if="currentDetail?.status === 1"
                    class="btn-seckill"
                    :class="{ disabled: item.seckillStock <= 0 || buyingSkuId === item.skuId }"
                    :disabled="item.seckillStock <= 0 || buyingSkuId === item.skuId"
                    @click="handleSeckill(item.skuId)"
                >
                  {{ buyingSkuId === item.skuId ? '排队中...' : (item.seckillStock > 0 ? '立即抢购' : '已售罄') }}
                </button>
                <button v-else-if="currentDetail?.status === 0" class="btn-disabled">即将开始</button>
                <button v-else class="btn-disabled">已结束</button>
              </div>
            </div>
          </div>

          <div class="empty" v-if="!loading && (!currentDetail || currentDetail.products.length === 0)">
            <el-empty description="当前场次暂无秒杀商品" />
          </div>
        </div>

        <!-- 右侧辅助区 -->
        <div class="right-side-panel">
          <div class="panel-header">秒杀攻略</div>
          <ul class="rule-list">
            <li>1. 秒杀商品数量有限，先到先得。</li>
            <li>2. 每人限购数量以商品详情为准。</li>
            <li>3. 秒杀订单需在30分钟内完成支付。</li>
            <li>4. 恶意刷单将被取消资格。</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.seckill-page { background: #f4f4f4; min-height: 100vh; padding-bottom: 50px; }
.main-content { margin-top: 20px; }

/* 1. Banner */
.seckill-banner {
  background: linear-gradient(90deg, #e1251b 0%, #ff4d4f 100%);
  border-radius: 12px;
  padding: 25px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  margin-bottom: 20px;
  box-shadow: 0 4px 15px rgba(225, 37, 27, 0.2);
}
.banner-left h1 { font-size: 32px; margin-bottom: 8px; text-shadow: 0 2px 4px rgba(0,0,0,0.1); font-weight: bold; }
.banner-left p { font-size: 15px; opacity: 0.85; letter-spacing: 1px; }
.banner-right { display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.2); padding: 10px 20px; border-radius: 30px; }
.banner-right .time-box { font-size: 24px; font-weight: bold; font-family: monospace; }

/* 2. Tabs */
.tabs-wrapper { display: flex; gap: 15px; margin-bottom: 20px; padding-bottom: 5px; overflow-x: auto; }
.tab-card {
  background: #fff; padding: 15px 20px; border-radius: 8px; cursor: pointer;
  min-width: 200px; border: 1px solid transparent; transition: all 0.2s;
}
.tab-card:hover { background: #fcfcfc; }
.tab-card.active { border-color: #e1251b; background: #fef5f5; box-shadow: 0 4px 12px rgba(225, 37, 27, 0.1); }
.act-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.act-name { font-size: 16px; font-weight: bold; color: #333; }
.tab-card.active .act-name { color: #e1251b; }
.act-status { background: #e1251b; color: #fff; font-size: 12px; padding: 2px 6px; border-radius: 4px; }
.act-status.gray { background: #999; }
.act-sub { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #666; }

/* 3. 商品卡片 */
.content-layout { display: flex; gap: 20px; align-items: flex-start; }
.goods-list { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
.goods-item { background: #fff; border-radius: 8px; overflow: hidden; transition: all 0.3s; display: flex; flex-direction: column; }
.goods-item:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.08); }
.goods-img { position: relative; width: 100%; height: 220px; cursor: pointer; overflow: hidden; }
.goods-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.goods-item:hover .goods-img img { transform: scale(1.05); }

.corner-tag { position: absolute; top: 0; left: 0; background: #e1251b; color: #fff; padding: 4px 12px; border-radius: 0 0 12px 0; font-size: 12px; font-weight: bold; }
.upcoming-tag { background: #f57c00; } /* 预告标签用橙色 */

.stock-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; }
.stock-mask span { color: #fff; border: 2px solid #fff; padding: 5px 15px; border-radius: 20px; font-weight: bold; }

.goods-info { padding: 15px; flex: 1; display: flex; flex-direction: column; }
.title { font-size: 14px; color: #333; margin-bottom: 5px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 38px; }
.specs { font-size: 12px; color: #999; margin-bottom: 10px; }

.price-box { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; }
.seckill-price { font-size: 24px; font-weight: bold; color: #e1251b; }
.seckill-price .symbol { font-size: 14px; }
.original-price { font-size: 13px; color: #999; text-decoration: line-through; }

.stock-progress { margin-top: auto; margin-bottom: 15px; position: relative; }
.stock-text { position: absolute; top: -18px; right: 0; font-size: 12px; color: #e1251b; }
:deep(.el-progress-bar__outer) { background-color: #fce4e4; }

.action-box { text-align: center; }
.btn-seckill { width: 100%; padding: 10px 0; background: #e1251b; color: #fff; border: none; border-radius: 4px; font-size: 15px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
.btn-seckill:hover:not(.disabled) { background: #c91e15; }
.btn-seckill.disabled { background: #ccc; cursor: not-allowed; }
.btn-disabled { width: 100%; padding: 10px 0; background: #f0f0f0; color: #999; border: none; border-radius: 4px; font-size: 15px; cursor: pointer; }

/* 4. 右侧辅助栏 */
.right-side-panel { width: 280px; background: #fff; border-radius: 8px; padding: 20px; }
.panel-header { font-size: 16px; font-weight: bold; color: #333; border-left: 4px solid #e1251b; padding-left: 10px; margin-bottom: 15px; }
.rule-list { list-style: none; padding: 0; margin: 0; }
.rule-list li { font-size: 13px; color: #666; line-height: 1.8; margin-bottom: 10px; }

.empty { grid-column: 1 / -1; background: #fff; border-radius: 8px; padding: 50px 0; }
</style>