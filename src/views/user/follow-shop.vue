<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import UserSideBar from "@/components/UserSideBar.vue"
import { getFollowShopPageApi, unfollowShopApi } from '@/api/shop'

const router = useRouter()
const loading = ref(false)
const followList = ref<any[]>([])
const total = ref(0)
const pageQuery = ref({ page: 1, pageSize: 10 })

const loadFollowShops = async () => {
  loading.value = true
  try {
    const res = await getFollowShopPageApi(pageQuery.value)
    if (res.code === 1) {
      followList.value = res.data.records
      total.value = res.data.total
    }
  } finally {
    loading.value = false
  }
}

const handlePageChange = (val: number) => {
  pageQuery.value.page = val
  loadFollowShops()
}

const cancelFollow = async (merchantId: number) => {
  try {
    await ElMessageBox.confirm('确定要取消关注该店铺吗？', '提示', { type: 'warning' })
    await unfollowShopApi(merchantId)
    ElMessage.success('已取消关注')
    loadFollowShops()
  } catch (e) {}
}

const goShop = (merchantId: number) => {
  router.push(`/shop/${merchantId}`)
}

onMounted(() => {
  loadFollowShops()
})
</script>

<template>
  <div class="follow-page">
    <TopNav />
    <Header />
    <div class="container layout-wrapper" v-loading="loading">
      <!-- 左侧边栏 -->
      <div class="sidebar-box">
        <UserSideBar />
      </div>

      <!-- 右侧内容 -->
      <div class="right-content">
        <div class="panel-card">
          <div class="panel-header">
            <h2>我的关注 ({{ total }})</h2>
          </div>

          <div class="shop-list" v-if="followList.length > 0">
            <div class="shop-item" v-for="item in followList" :key="item.merchantId">
              <div class="shop-left" @click="goShop(item.merchantId)">
                <img :src="item.shopLogo || 'https://via.placeholder.com/80'" class="shop-logo" />
                <div class="shop-info">
                  <h3>{{ item.shopName }}</h3>
                  <p>
                    <span>关注 {{ item.followerCount }}</span>
                    <span class="divider">|</span>
                    <span>在售商品 {{ item.productCount }}</span>
                  </p>
                </div>
              </div>
              <div class="shop-right">
                <el-button size="small" round @click="goShop(item.merchantId)">进店逛逛</el-button>
                <el-button size="small" round type="danger" plain @click="cancelFollow(item.merchantId)">取消关注</el-button>
              </div>
            </div>
          </div>

          <div class="empty" v-if="followList.length === 0 && !loading">
            你还没有关注任何店铺，去首页逛逛吧~
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
.follow-page { background: #f4f4f4; min-height: 100vh; padding-bottom: 50px; }

/* 核心修复：强制左右分离，绝不重叠 */
.layout-wrapper {
  display: flex;
  gap: 24px;
  margin-top: 20px;
  align-items: flex-start;
}
.sidebar-box {
  width: 200px; /* 固定左侧宽度 */
  flex-shrink: 0;
}
.right-content {
  flex: 1;
  min-width: 0; /* 防止子元素撑破 */
}

.panel-card { background: #fff; border-radius: 8px; padding: 20px; min-height: 500px; }
.panel-header { border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
.panel-header h2 { font-size: 20px; color: #333; margin: 0; }

.shop-list { display: flex; flex-direction: column; gap: 15px; }
.shop-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
  transition: all 0.2s;
}
.shop-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-color: #fce4e4; }

.shop-left { display: flex; align-items: center; gap: 15px; cursor: pointer; }
.shop-logo { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid #f4f4f4; }
.shop-info h3 { font-size: 18px; color: #333; margin-bottom: 8px; }
.shop-info h3:hover { color: #e1251b; }
.shop-info p { font-size: 13px; color: #999; margin: 0; }
.shop-info .divider { margin: 0 10px; color: #eee; }
.shop-right { display: flex; gap: 10px; }

.empty { text-align: center; padding: 100px 0; color: #999; }
.pager { margin-top: 30px; justify-content: center; }
</style>