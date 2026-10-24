<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { UserProductPageResultVO } from '@/types/product'

const props = defineProps<{ item: UserProductPageResultVO }>()
const router = useRouter()

const goDetail = () => {
  router.push(`/product/${props.item.id}`)
}
</script>

<template>
  <div class="goods-card" @click="goDetail">
    <div class="img-wrap">
      <img :src="item.mainImage" />
    </div>
    <div class="name">{{ item.name }}</div>
    <div class="coupon-tags">
      <span class="tag">分期免息</span>
      <span class="tag">3期</span>
    </div>
    <div class="price">
      <span class="symbol">￥</span>
      <span class="num">{{ item.minPrice }}</span>
    </div>
  </div>
</template>

<style scoped>
.goods-card {
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  padding: 12px;
  border-radius: 8px;
}
.goods-card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}
.img-wrap {
  width: 100%;
  height: 220px;
  overflow: hidden;
  border-radius: 6px;
  background: #f8f8f8;
}
.img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.name {
  margin-top: 10px;
  font-size: 14px;
  color: #333;
  height: 40px;
  line-height: 20px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.coupon-tags {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  min-height: 20px;
}
.tag {
  font-size: 12px;
  color: #e1251b;
  border: 1px solid #e1251b;
  border-radius: 3px;
  padding: 0 4px;
  line-height: 16px;
}
.price {
  margin-top: 8px;
  color: #e1251b;
  font-weight: bold;
}
.price .symbol {
  font-size: 14px;
}
.price .num {
  font-size: 22px;
}
</style>