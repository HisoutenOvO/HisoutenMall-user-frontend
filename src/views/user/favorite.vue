<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import UserSideBar from '@/components/UserSideBar.vue'
import { getFavoritePageApi, cancelFavoriteApi } from '@/api/favorite'
import type { UserFavoritePageResultVO } from '@/types/favorite'

const router = useRouter()
const loading = ref(false)
const favList = ref<UserFavoritePageResultVO[]>([])
const total = ref(0)
const pageQuery = ref({ page: 1, pageSize: 10 })

const loadFavorites = async () => {
  loading.value = true
  try {
    const res = await getFavoritePageApi(pageQuery.value)
    if (res.code === 1) { favList.value = res.data.records || []; total.value = res.data.total }
  } finally { loading.value = false }
}

const handlePageChange = (val: number) => {
  pageQuery.value.page = val
  loadFavorites()
  window.scrollTo({ top: 300, behavior: 'smooth' })
}

const removeFavorite = async (productId: number) => {
  try {
    await ElMessageBox.confirm('确定要取消收藏吗？', '提示', { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' })
    const res = await cancelFavoriteApi(productId)
    if (res.code === 1) { ElMessage.success('已取消收藏'); loadFavorites() }
  } catch (e) {}
}

onMounted(() => loadFavorites())
</script>

<template>
  <div class="favorite-page">
    <TopNav />
    <Header />
    <div class="container layout-wrapper" v-loading="loading">
      <div class="sidebar-sticky">
        <UserSideBar />
      </div>
      <div class="right-content">
        <div class="panel-card">
          <div class="panel-header">
            <h2>我的收藏 ({{ total }})</h2>
          </div>

          <transition-group name="list-fade" tag="div" class="goods-grid" v-if="favList.length > 0">
            <div class="goods-card" v-for="item in favList" :key="item.id">
              <div class="img-box" @click="router.push(`/product/${item.productId}`)">
                <img :src="item.mainImage" alt="商品" />
                <div class="tag" v-if="item.productStatus === 0">已下架</div>
              </div>
              <div class="info">
                <h4 @click="router.push(`/product/${item.productId}`)">{{ item.productName }}</h4>
                <p class="price">￥{{ item.minPrice }}</p>
                <p class="merchant">{{ item.merchantName }}</p>
                <div class="action">
                  <button class="btn-text danger" @click="removeFavorite(item.productId)">取消收藏</button>
                </div>
              </div>
            </div>
          </transition-group>

          <div class="empty" v-else>你还没有收藏任何商品，去逛逛吧~</div>
          <el-pagination v-if="total > 0" background layout="prev, pager, next" :total="total" :page-size="pageQuery.pageSize" :current-page="pageQuery.page" @current-change="handlePageChange" class="pagination" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.favorite-page { background: #f4f4f4; min-height: 100vh; padding-bottom: 50px; }
.layout-wrapper { display: flex; gap: 24px; margin-top: 20px; align-items: flex-start; }
.sidebar-sticky { position: sticky; top: 20px; flex-shrink: 0; height: fit-content; }
.right-content { flex: 1; min-width: 0; }
.panel-card { background: #fff; border-radius: 8px; padding: 20px; }
.panel-header { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
.panel-header h2 { font-size: 20px; color: #333; }
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
.btn-text.danger { color: #e1251b; }
.empty { text-align: center; padding: 100px 0; color: #999; }

/* 动画与分页美化 */
.list-fade-enter-active { transition: all 0.4s ease; }
.list-fade-leave-active { transition: all 0.3s ease; position: absolute; }
.list-fade-enter-from { opacity: 0; transform: translateY(20px); }
.list-fade-leave-to { opacity: 0; transform: translateY(-20px); }

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