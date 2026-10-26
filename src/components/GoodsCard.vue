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
      <img :src="item.mainImage" loading="lazy" />
    </div>
    <div class="info-wrap">
      <div class="price">
        <span class="symbol">￥</span>
        <span class="num">{{ item.minPrice }}</span>
      </div>
      <div class="name">{{ item.name }}</div>
      <div class="tags">
        <span class="tag">分期免息</span>
        <span class="tag">包邮</span>
      </div>
      <div class="merchant">{{ item.merchantName }}</div>
    </div>
  </div>
</template>

<style scoped>
.goods-card {
  background: #fff;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  padding: 12px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
}

.goods-card:hover {
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  transform: translateY(-4px);
}

.img-wrap {
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 8px;
  background: #f8f8f8;
}

.img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.goods-card:hover .img-wrap img {
  transform: scale(1.06);
}

.info-wrap {
  padding-top: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.price {
  color: #e1251b;
  font-weight: bold;
  margin-bottom: 8px;
  display: flex;
  align-items: baseline;
}

.price .symbol {
  font-size: 14px;
}

.price .num {
  font-size: 24px;
  font-family: Arial, Helvetica, sans-serif;
}

.name {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
  height: 42px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 8px;
  transition: color 0.2s;
}

.goods-card:hover .name {
  color: #e1251b;
}

.tags {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.tag {
  font-size: 12px;
  color: #e1251b;
  background: #fef5f5;
  border: 1px solid #fce4e4;
  border-radius: 4px;
  padding: 1px 6px;
  line-height: 16px;
}

.merchant {
  font-size: 12px;
  color: #999;
  margin-top: auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s;
}

.merchant:hover {
  color: #e1251b;
  text-decoration: underline;
}
</style>