<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { CategoryListVO } from '@/types/category'
import { getCategoryListApi } from '@/api/category'

const router = useRouter()
const allList = ref<CategoryListVO[]>([])
const hoverId = ref<number | null>(null)

const topList = computed(() => allList.value.filter(c => c.level === 1))

const hoverChildren = computed(() => {
  if (!hoverId.value) return []
  const level2 = allList.value.filter(c => c.parentId === hoverId.value)
  return level2.map(l2 => ({
    ...l2,
    children: allList.value.filter(c => c.parentId === l2.id)
  }))
})

onMounted(async () => {
  const res = await getCategoryListApi()
  if (res.code === 1) {
    allList.value = res.data
  }
})

const goCategory = (id: number) => {
  router.push({ path: '/product/list', query: { categoryId: id } })
}
</script>

<template>
  <div class="category-menu" @mouseleave="hoverId = null">
    <div class="title">全部商品分类</div>
    <ul class="top-list">
      <li
          v-for="c in topList"
          :key="c.id"
          @mouseenter="hoverId = c.id"
          @click="goCategory(c.id)"
          :class="{ active: hoverId === c.id }"
      >
        <span class="name">{{ c.name }}</span>
        <el-icon class="arrow"><ArrowRight /></el-icon>
      </li>
    </ul>

    <transition name="fade-slide">
      <div class="sub-panel" v-if="hoverId && hoverChildren.length">
        <div class="sub-col" v-for="l2 in hoverChildren" :key="l2.id">
          <div class="sub-title" @click="goCategory(l2.id)">
            {{ l2.name }} <el-icon><ArrowRight /></el-icon>
          </div>
          <div class="sub-links">
            <a
                v-for="l3 in l2.children"
                :key="l3.id"
                @click="goCategory(l3.id)"
            >{{ l3.name }}</a>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.category-menu {
  width: 220px;
  background: #fff;
  position: relative;
  border-radius: 12px 0 0 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  z-index: 10;
}

.title {
  background: linear-gradient(90deg, #e1251b 0%, #ff4d4f 100%);
  color: #fff;
  padding: 15px 20px;
  font-size: 16px;
  font-weight: bold;
  border-radius: 12px 0 0 0;
}

.top-list {
  list-style: none;
  padding: 8px 0;
}

.top-list li {
  padding: 12px 20px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.top-list li:hover,
.top-list li.active {
  background: #f8f8f8;
  color: #e1251b;
}

.arrow {
  font-size: 12px;
  color: #ccc;
  transition: transform 0.2s;
}

.top-list li:hover .arrow,
.top-list li.active .arrow {
  color: #e1251b;
  transform: translateX(3px);
}

/* 子分类浮层 */
.sub-panel {
  position: absolute;
  left: 100%;
  top: 0;
  width: 600px; /* 面板宽度 */
  height: 100%; /* 高度与左侧一级菜单保持一致 */
  background: #fff;
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.08);
  border-radius: 0 12px 12px 0;
  padding: 20px 30px;
  display: flex;
  flex-wrap: wrap; /* 允许换行 */
  align-content: flex-start; /* 内容从顶部开始排列 */
  gap: 20px 30px; /* 行列间距 */
  z-index: 20;
  box-sizing: border-box;
}

/* 每一个二级分类 */
.sub-col {
  width: 140px; /* 固定宽度，这样排列才会整齐 */
  display: flex;
  flex-direction: column;
}

/* 二级分类标题 */
.sub-title {
  font-weight: bold;
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #eee; /* 加一根极浅的分割线，区分标题和下级 */
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sub-title:hover {
  color: #e1251b;
}

/* 三级分类的链接列表（如果有的话） */
.sub-links {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sub-links a {
  font-size: 12px;
  color: #666;
  cursor: pointer;
}

.sub-links a:hover {
  color: #e1251b;
}

/* 过渡动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
.category-menu {
  width: 220px;
  background: #fff;
  position: relative;
  /* 添加底部圆角，防止内容撑开后变成直角 */
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  z-index: 10;
  height: fit-content; /* 高度跟随内容 */
}

/* 确保内部的 ul 有底部内边距 */
.top-list {
  max-height: 340px; /* 400 减去标题的高度 */
  overflow-y: auto;
}
</style>