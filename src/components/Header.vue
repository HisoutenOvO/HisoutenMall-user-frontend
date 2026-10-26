<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCategoryListApi } from '@/api/category'
import type { CategoryListVO } from '@/types/category'

const router = useRouter()
const keyword = ref('')
const hotCategories = ref<CategoryListVO[]>([])

const onSearch = () => {
  if (!keyword.value.trim()) return
  router.push({ path: '/product/list', query: { keyword: keyword.value } })
}

const goCategory = (id: number) => {
  router.push({ path: '/product/list', query: { categoryId: id } })
}

onMounted(async () => {
  const res = await getCategoryListApi()
  if (res.code === 1) {
    // 筛选出一级分类，取前 8 个作为热词展示
    hotCategories.value = res.data.filter((c: CategoryListVO) => c.level === 1).slice(0, 8)
  }
})
</script>

<template>
  <div class="header">
    <div class="container inner">
      <div class="logo" @click="router.push('/')">
        <span class="logo-text">HisoutenMall</span>
        <span class="logo-sub">热卖</span>
      </div>
      <div class="search-wrap">
        <div class="search">
          <input v-model="keyword" @keyup.enter="onSearch" placeholder="搜索商品" />
          <button @click="onSearch">搜索</button>
        </div>
        <div class="hots">
          <a
              v-for="c in hotCategories"
              :key="c.id"
              @click="goCategory(c.id)"
          >{{ c.name }}</a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header {
  /* 背景交由父级页面控制 */
}
.inner {
  position: relative;
  display: flex;
  align-items: center;
  height: 100px;
}
.logo {
  position: absolute;
  left: 0;
  top: 30px;
  display: flex;
  align-items: baseline;
  cursor: pointer;
  gap: 6px;
}
.logo-text {
  font-size: 28px;
  font-weight: bold;
  color: #e1251b; /* 恢复京东红 */
}
.logo-sub {
  font-size: 18px;
  color: #e1251b; /* 恢复京东红 */
}
.search-wrap {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  top: 30px;
}
.search {
  display: flex;
  border: 2px solid #e1251b;
  border-radius: 20px;
  overflow: hidden;
  height: 40px;
}
.search input {
  flex: 1;
  padding: 0 20px;
  border: none;
  outline: none;
  font-size: 14px;
}
.search button {
  width: 90px;
  background: #e1251b;
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 15px;
}
.hots {
  display: flex;
  gap: 14px;
  margin-top: 8px;
  padding-left: 20px;
  font-size: 12px;
  color: #999; /* 恢复灰色 */
}
.hots a {
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
}
.hots a:hover {
  color: #e1251b;
}
</style>