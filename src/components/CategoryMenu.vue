<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { CategoryListVO } from '@/types/category'
import { getCategoryListApi } from '@/api/category'

const router = useRouter()
const allList = ref<CategoryListVO[]>([])
const hoverId = ref<number | null>(null)

// 一级分类
const topList = computed(() => allList.value.filter(c => c.level === 1))

// 当前悬停一级分类的子分类（二级 + 三级）
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
        {{ c.name }}
        <span class="arrow">›</span>
      </li>
    </ul>

    <!-- 子分类浮层 -->
    <div class="sub-panel" v-if="hoverId && hoverChildren.length">
      <div class="sub-col" v-for="l2 in hoverChildren" :key="l2.id">
        <div class="sub-title" @click="goCategory(l2.id)">{{ l2.name }} ›</div>
        <div class="sub-links">
          <a
              v-for="l3 in l2.children"
              :key="l3.id"
              @click="goCategory(l3.id)"
          >{{ l3.name }}</a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.category-menu {
  width: 200px;
  background: #fff;
  position: relative;
  border-radius: 8px 0 0 8px;
}
.title {
  background: #e1251b;
  color: #fff;
  padding: 12px 16px;
  font-size: 15px;
  border-radius: 8px 0 0 0;
}
.top-list {
  list-style: none;
}
.top-list li {
  padding: 12px 16px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.top-list li:hover,
.top-list li.active {
  background: #f4f4f4;
  color: #e1251b;
}
.arrow {
  color: #ccc;
}

/* 子分类浮层 */
.sub-panel {
  position: absolute;
  left: 100%;
  top: 0;
  min-width: 600px;
  min-height: 100%;
  background: #fff;
  border-left: 1px solid #eee;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.08);
  padding: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 20px 40px;
  z-index: 10;
}
.sub-col {
  min-width: 140px;
}
.sub-title {
  font-weight: bold;
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
  cursor: pointer;
}
.sub-title:hover {
  color: #e1251b;
}
.sub-links {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.sub-links a {
  font-size: 12px;
  color: #666;
  cursor: pointer;
}
.sub-links a:hover {
  color: #e1251b;
}
</style>