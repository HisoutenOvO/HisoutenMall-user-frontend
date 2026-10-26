<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadUserFile } from 'element-plus'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import UserSideBar from "@/components/UserSideBar.vue"
import {
  getPendingReviewsApi,
  getSelfReviewsApi,
  addReviewApi,
  uploadFileApi,
  getReviewDetailApi,
  deleteReviewApi
} from '@/api/review'
import type { PendingReviewVO, ReviewDetailVO, SelfReviewVO } from '@/types/review'
import { formatSkuSpecs } from '@/utils/specs'

const router = useRouter()
const activeTab = ref<'pending' | 'self'>('pending')
const loading = ref(false)

// 待评价数据
const pendingList = ref<PendingReviewVO[]>([])
const pendingTotal = ref(0)
const pendingQuery = ref({ page: 1, pageSize: 5 })

// 已评价数据
const selfList = ref<SelfReviewVO[]>([])
const selfTotal = ref(0)
const selfQuery = ref({ page: 1, pageSize: 5 })

// 弹窗控制
const dialogVisible = ref(false)
const submitLoading = ref(false)
const reviewForm = reactive({
  orderItemId: 0,
  productName: '',
  rating: 5,
  content: '',
  images: [] as string[]
})

// 上传列表
const fileList = ref<UploadUserFile[]>([])

// 详情弹窗
const detailVisible = ref(false)
const detailLoading = ref(false)
const reviewDetail = ref<ReviewDetailVO | null>(null)

// 查看详情
const openDetailDialog = async (reviewId: number) => {
  detailVisible.value = true
  detailLoading.value = true
  reviewDetail.value = null
  try {
    const res = await getReviewDetailApi(reviewId)
    if (res.code === 1) {
      reviewDetail.value = res.data
    } else {
      ElMessage.error(res.msg)
    }
  } finally {
    detailLoading.value = false
  }
}

// 获取待评价
const loadPending = async () => {
  loading.value = true
  try {
    const res = await getPendingReviewsApi(pendingQuery.value)
    if (res.code === 1) {
      pendingList.value = res.data.records || []
      pendingTotal.value = res.data.total
    }
  } finally {
    loading.value = false
  }
}

// 获取已评价
const loadSelf = async () => {
  loading.value = true
  try {
    const res = await getSelfReviewsApi(selfQuery.value)
    if (res.code === 1) {
      selfList.value = res.data.records || []
      selfTotal.value = res.data.total
    }
  } finally {
    loading.value = false
  }
}

// 删除评价
const handleDelete = async (reviewId: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这条评价吗？删除后无法恢复。', '提示', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })

    const res = await deleteReviewApi(reviewId)
    if (res.code === 1) {
      ElMessage.success('评价已删除')
      loadSelf()
    } else {
      ElMessage.error(res.msg)
    }
  } catch (e) {}
}

const handleTabChange = (tab: any) => {
  if (tab === 'pending' && pendingList.value.length === 0) loadPending()
  if (tab === 'self' && selfList.value.length === 0) loadSelf()
}

const handlePendingPage = (val: number) => {
  pendingQuery.value.page = val
  loadPending()
  window.scrollTo({ top: 300, behavior: 'smooth' })
}

const handleSelfPage = (val: number) => {
  selfQuery.value.page = val
  loadSelf()
  window.scrollTo({ top: 300, behavior: 'smooth' })
}

// 打开评价弹窗
const openReviewDialog = (item: PendingReviewVO) => {
  reviewForm.orderItemId = item.orderItemId
  reviewForm.productName = item.productName
  reviewForm.rating = 5
  reviewForm.content = ''
  reviewForm.images = []
  fileList.value = []
  dialogVisible.value = true
}

// 自定义图片上传
const customUpload = async (options: any) => {
  const file = options.file
  if (!file) return

  try {
    const res = await uploadFileApi(file)
    if (res.code === 1) {
      options.onSuccess(res.data)
      reviewForm.images.push(res.data)
    } else {
      options.onError(new Error('上传失败'))
      ElMessage.error('图片上传失败')
    }
  } catch (e) {
    options.onError(e)
    ElMessage.error('图片上传异常')
  }
}

const handleRemoveImage = (file: any) => {
  const urlToRemove = file.response || file.url
  reviewForm.images = reviewForm.images.filter(url => url !== urlToRemove)
}

// 提交评价
const submitReview = async () => {
  if (reviewForm.rating === 0) return ElMessage.warning('请选择评分')
  if (!reviewForm.content.trim() && reviewForm.images.length === 0) {
    return ElMessage.warning('请填写内容或上传图片')
  }

  submitLoading.value = true
  try {
    const res = await addReviewApi({
      orderItemId: reviewForm.orderItemId,
      rating: reviewForm.rating,
      content: reviewForm.content,
      images: reviewForm.images.join(',')
    })
    if (res.code === 1) {
      ElMessage.success('评价成功')
      dialogVisible.value = false
      loadPending()
      if (selfList.value.length > 0) loadSelf()
    } else {
      ElMessage.error(res.msg)
    }
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => {
  loadPending()
})
</script>

<template>
  <div class="review-page">
    <TopNav />
    <Header />

    <div class="container layout-wrapper">
      <!-- 左侧固定 -->
      <div class="sidebar-sticky">
        <UserSideBar />
      </div>

      <!-- 右侧主内容 -->
      <div class="right-content">
        <div class="header-banner">
          <div class="user-stat">
            <h2>我的评价</h2>
          </div>
        </div>

        <!-- Tabs 带动画 -->
        <div class="tabs">
          <div class="tab-item" :class="{ active: activeTab === 'pending' }" @click="activeTab = 'pending'; handleTabChange('pending')">待评价</div>
          <div class="tab-item" :class="{ active: activeTab === 'self' }" @click="activeTab = 'self'; handleTabChange('self')">已评价</div>
          <div class="tab-line" :style="{ transform: `translateX(${activeTab === 'pending' ? 0 : 100}%)` }"></div>
        </div>

        <!-- 待评价列表 -->
        <div v-show="activeTab === 'pending'" v-loading="loading">
          <transition-group name="list-fade" tag="div" class="review-list">
            <div class="list-item" v-for="item in pendingList" :key="item.orderItemId">
              <img :src="item.productImage" class="p-img" />
              <div class="p-info">
                <h4>{{ item.productName }}</h4>
                <p>{{ formatSkuSpecs(item.skuSpecs) }}</p>
                <span class="time">完成时间：{{ item.finishTime?.replace('T', ' ') }}</span>
              </div>
              <div class="action">
                <button class="btn-review" @click="openReviewDialog(item)">去评价</button>
              </div>
            </div>
          </transition-group>
          <div class="empty" v-if="pendingList.length === 0 && !loading">暂无待评价商品</div>
          <el-pagination v-if="pendingTotal > 0" background layout="prev, pager, next" :total="pendingTotal" :page-size="pendingQuery.pageSize" :current-page="pendingQuery.page" @current-change="handlePendingPage" class="pagination"/>
        </div>

        <!-- 已评价列表 -->
        <div v-show="activeTab === 'self'" v-loading="loading">
          <transition-group name="list-fade" tag="div" class="review-list">
            <div class="self-card" v-for="item in selfList" :key="item.id">
              <div class="review-header">
                <el-rate v-model="item.rating" disabled :texts="['极差', '失望', '一般', '满意', '惊喜']" />
                <span class="time">{{ item.createTime?.replace('T', ' ') }}</span>
              </div>
              <p class="content">{{ item.content || '此用户没有填写评价内容' }}</p>
              <div class="images" v-if="item.images && item.images.length">
                <img v-for="(img, idx) in item.images" :key="idx" :src="img" />
              </div>
              <div class="self-footer">
                <p class="specs">规格：{{ formatSkuSpecs(item.skuSpecs) }}</p>
                <div class="action-btns">
                  <button class="btn-detail" @click="openDetailDialog(item.id)">查看详情</button>
                  <span class="divider">|</span>
                  <button class="btn-delete" @click="handleDelete(item.id)">删除</button>
                </div>
              </div>
            </div>
          </transition-group>
          <div class="empty" v-if="selfList.length === 0 && !loading">暂无评价记录</div>
          <el-pagination v-if="selfTotal > 0" background layout="prev, pager, next" :total="selfTotal" :page-size="selfQuery.pageSize" :current-page="selfQuery.page" @current-change="handleSelfPage" class="pagination"/>
        </div>
      </div>
    </div>

    <!-- 发布评价弹窗 -->
    <el-dialog v-model="dialogVisible" title="发表评价" width="600px">
      <div class="dialog-product">
        <span>商品：{{ reviewForm.productName }}</span>
      </div>
      <div class="form-item">
        <label>商品评分：</label>
        <el-rate v-model="reviewForm.rating" show-text :texts="['极差', '失望', '一般', '满意', '惊喜']" :colors="['#99A9BF', '#F7BA2A', '#FF9900']" />
      </div>
      <div class="form-item">
        <label>评价内容：</label>
        <el-input v-model="reviewForm.content" type="textarea" :rows="4" placeholder="商品满足你的期待吗？说说你的使用心得吧" />
      </div>
      <div class="form-item">
        <label>上传图片：</label>
        <el-upload action="#" list-type="picture-card" :http-request="customUpload" :on-remove="handleRemoveImage" :limit="5" :file-list="fileList">
          <el-icon><Plus /></el-icon>
        </el-upload>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitReview">提交评价</el-button>
      </template>
    </el-dialog>

    <!-- 评价详情弹窗 -->
    <el-dialog v-model="detailVisible" title="评价详情" width="600px" v-loading="detailLoading">
      <div v-if="reviewDetail" class="detail-wrapper">
        <div class="detail-product">
          <img :src="reviewDetail.productImage" alt="商品" />
          <div class="info">
            <h4>{{ reviewDetail.productName }}</h4>
            <p>{{ formatSkuSpecs(reviewDetail.skuSpecs) }}</p>
            <p class="order-no">订单号：{{ reviewDetail.orderNo }}</p>
          </div>
        </div>
        <el-divider />
        <div class="detail-review">
          <div class="user-info">
            <el-avatar :src="reviewDetail.avatar" :size="40">{{ reviewDetail.nickname?.charAt(0) }}</el-avatar>
            <div class="meta">
              <span class="nickname">{{ reviewDetail.nickname }}</span>
              <span class="time">{{ reviewDetail.createTime?.replace('T', ' ') }}</span>
            </div>
          </div>
          <div class="rating-wrap">
            <el-rate v-model="reviewDetail.rating" disabled :texts="['极差', '失望', '一般', '满意', '惊喜']" show-text />
          </div>
          <p class="content-text">{{ reviewDetail.content || '此用户没有填写文字评价' }}</p>
          <div class="images-list" v-if="reviewDetail.images && reviewDetail.images.length">
            <el-image v-for="(img, index) in reviewDetail.images" :key="index" :src="img" :preview-src-list="reviewDetail.images" fit="cover" class="detail-img" />
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 基础布局 */
.review-page { background: #f4f4f4; min-height: 100vh; padding-bottom: 50px; }
.layout-wrapper { display: flex; gap: 24px; margin-top: 20px; align-items: flex-start; }

.sidebar-sticky { position: sticky; top: 20px; flex-shrink: 0; height: fit-content; }

.right-content { flex: 1; min-width: 0; }
.header-banner { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 15px; }
.header-banner h2 { font-size: 20px; color: #333; }

/* Tabs */
.tabs { display: flex; background: #fff; border-radius: 8px; margin-bottom: 15px; position: relative; border-bottom: 1px solid #eee; }
.tab-item { flex: 1; text-align: center; padding: 15px 0; font-size: 15px; color: #333; cursor: pointer; transition: color 0.3s; z-index: 2; }
.tab-item.active { color: #e1251b; font-weight: bold; }
.tab-line { position: absolute; bottom: 0; left: 0; width: 50%; height: 2px; background: #e1251b; transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1); z-index: 1; }

/* 列表 */
.review-list { display: flex; flex-direction: column; gap: 15px; }
.list-item { background: #fff; border-radius: 8px; padding: 20px; display: flex; align-items: center; gap: 20px; }
.p-img { width: 80px; height: 80px; object-fit: cover; border: 1px solid #eee; }
.p-info { flex: 1; }
.p-info h4 { font-size: 14px; color: #333; margin-bottom: 8px; font-weight: normal; }
.p-info p { font-size: 12px; color: #999; margin-bottom: 8px; }
.p-info .time { font-size: 12px; color: #ccc; }
.action { width: 100px; text-align: right; }
.btn-review { background: #fff; border: 1px solid #e1251b; color: #e1251b; padding: 8px 20px; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
.btn-review:hover { background: #e1251b; color: #fff; }

.self-card { background: #fff; border-radius: 8px; padding: 20px; display: flex; flex-direction: column; width: 100%; box-sizing: border-box; }
.review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.review-header .time { font-size: 13px; color: #999; }
.content { font-size: 14px; color: #333; line-height: 1.6; margin-bottom: 15px; }

.images { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px; }
.images img { width: 80px; height: 80px; object-fit: cover; border-radius: 4px; cursor: pointer; border: 1px solid #eee; }

.self-footer { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 10px; border-top: 1px dashed #eee; padding-top: 15px; }
.self-footer .specs { font-size: 13px; color: #999; }
.action-btns { display: flex; align-items: center; gap: 15px; }
.action-btns .divider { color: #eee; font-size: 12px; }
.btn-detail { background: transparent; border: none; color: #005ea7; cursor: pointer; font-size: 14px; }
.btn-detail:hover { text-decoration: underline; }
.btn-delete { background: transparent; border: none; color: #999; cursor: pointer; font-size: 14px; transition: color 0.2s; }
.btn-delete:hover { color: #e1251b; }

.empty { text-align: center; padding: 60px; background: #fff; border-radius: 8px; color: #999; }

/* 弹窗 */
.dialog-product { background: #f8f8f8; padding: 10px 15px; border-radius: 4px; margin-bottom: 20px; font-size: 14px; color: #333; }
.form-item { margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; }
.form-item label { font-size: 14px; color: #333; font-weight: bold; }
.detail-wrapper { padding: 0 10px; }
.detail-product { display: flex; gap: 15px; background: #f8f8f8; padding: 15px; border-radius: 6px; }
.detail-product img { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; }
.detail-product .info h4 { font-size: 14px; color: #333; margin-bottom: 5px; font-weight: normal; }
.detail-product .info p { font-size: 12px; color: #999; margin-bottom: 3px; }
.detail-product .info .order-no { color: #666; }
.detail-review { margin-top: 10px; }
.detail-review .user-info { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
.detail-review .meta { display: flex; flex-direction: column; gap: 4px; }
.detail-review .nickname { font-size: 14px; color: #333; font-weight: bold; }
.detail-review .time { font-size: 12px; color: #999; }
.rating-wrap { margin-bottom: 15px; }
.content-text { font-size: 14px; color: #333; line-height: 1.6; margin-bottom: 15px; white-space: pre-wrap; }
.images-list { display: flex; gap: 10px; flex-wrap: wrap; }
.detail-img { width: 80px; height: 80px; border-radius: 4px; cursor: pointer; }

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