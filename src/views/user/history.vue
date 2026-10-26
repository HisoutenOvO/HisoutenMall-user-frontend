<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import { getHistoryPageApi, deleteHistoryApi, deleteAllHistoryApi } from '@/api/history'
import type { UserHistoryPageResultVO } from '@/types/history'
import UserSideBar from "@/components/UserSideBar.vue";

const router = useRouter()
const loading = ref(false)
const historyList = ref<UserHistoryPageResultVO[]>([])
const total = ref(0)
const pageQuery = ref({ page: 1, pageSize: 10 })

const loadHistory = async () => {
  loading.value = true
  try {
    const res = await getHistoryPageApi(pageQuery.value)
    if (res.code === 1) {
      historyList.value = res.data.records || []
      total.value = res.data.total
    }
  } finally {
    loading.value = false
  }
}

const handlePageChange = (val: number) => {
  pageQuery.value.page = val
  loadHistory()
}

// 删除单条
const removeHistory = async (productId: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这条浏览足迹吗？', '提示', { type: 'warning' })
    const res = await deleteHistoryApi(productId)
    if (res.code === 1) {
      ElMessage.success('已删除')
      loadHistory()
    }
  } catch (e) {}
}

// 清空全部
const clearAllHistory = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有浏览足迹吗？此操作不可恢复。', '警告', { type: 'warning' })
    const res = await deleteAllHistoryApi()
    if (res.code === 1) {
      ElMessage.success('已清空足迹')
      loadHistory()
    }
  } catch (e) {}
}

onMounted(() => {
  loadHistory()
})
</script>

<template>
  <div class="history-page">
    <TopNav />
    <Header />

    <div class="container layout-wrapper" v-loading="loading">
      <UserSideBar />

      <div class="right-content">
        <div class="panel-card">
          <div class="panel-header">
            <h2>我的足迹 ({{ total }})</h2>
            <el-button v-if="historyList.length > 0" type="danger" plain size="small" @click="clearAllHistory">清空全部足迹</el-button>
          </div>

          <div class="goods-grid" v-if="historyList.length > 0">
            <div class="goods-card" v-for="item in historyList" :key="item.id">
              <div class="img-box" @click="router.push(`/product/${item.productId}`)">
                <img :src="item.mainImage" alt="商品" />
                <div class="tag" v-if="item.productStatus === 0">已下架</div>
              </div>
              <div class="info">
                <h4 @click="router.push(`/product/${item.productId}`)">{{ item.productName }}</h4>
                <p class="price">￥{{ item.minPrice }}</p>
                <p class="merchant">{{ item.merchantName }}</p>
                <div class="action">
                  <button class="btn-text danger" @click="removeHistory(item.productId)">删除足迹</button>
                </div>
              </div>
            </div>
          </div>

          <div class="empty" v-else>
            你还没有浏览过任何商品哦~
          </div>

          <!-- 分页 -->
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
.history-page { background: #f4f4f4; min-height: 100vh; padding-bottom: 50px; }
.layout-wrapper { display: flex; gap: 20px; margin-top: 20px; }
.right-content { flex: 1; min-width: 0; }
.panel-card { background: #fff; border-radius: 8px; padding: 20px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
.panel-header h2 { font-size: 20px; color: #333; }

/* 商品网格 */
.goods-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
.goods-card { border: 1px solid #eee; border-radius: 8px; overflow: hidden; transition: all 0.2s; padding: 10px; }
.goods-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); transform: translateY(-2px); }
.img-box { position: relative; width: 100%; height: 180px; cursor: pointer; }
.img-box img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; }
.tag { position: absolute; top: 0; left: 0; background: rgba(0,0,0,0.5); color: #fff; font-size: 12px; padding: 2px 8px; border-radius: 4px 0 4px 0; }

.info { margin-top: 10px; }
.info h4 { font-size: 14px; color: #333; cursor: pointer; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 38px; margin-bottom: 5px; }
.info h4:hover { color: #e1251b; }
.price { font-size: 18px; color: #e1251b; font-weight: bold; margin-bottom: 5px; }
.merchant { font-size: 12px; color: #999; margin-bottom: 10px; }
.action { text-align: right; border-top: 1px dashed #eee; padding-top: 10px; }
.btn-text { background: transparent; border: none; cursor: pointer; font-size: 13px; }
.btn-text.danger { color: #999; transition: color 0.2s; }
.btn-text.danger:hover { color: #e1251b; }

.empty { text-align: center; padding: 100px 0; color: #999; }
.pager { margin-top: 30px; justify-content: center; }
</style>