<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance } from 'element-plus'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import type { AddressListVO } from '@/types/address'
import UserSideBar from "@/components/UserSideBar.vue";
import {
  getAddressListApi,
  getAddressDetailApi,
  addAddressApi,
  updateAddressApi,
  setDefaultAddressApi,
  deleteAddressApi
} from '@/api/address'

const router = useRouter()
const loading = ref(false)
const addressList = ref<AddressListVO[]>([])

// 弹窗控制
const dialogVisible = ref(false)
const dialogTitle = ref('新增地址')
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const addressForm = reactive({
  id: 0,
  receiverName: '',
  receiverPhone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  isDefault: 0
})

// 校验规则
const rules = {
  receiverName: [{ required: true, message: '请输入收货人姓名', trigger: 'blur' }],
  receiverPhone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  province: [{ required: true, message: '请输入省份', trigger: 'blur' }],
  city: [{ required: true, message: '请输入城市', trigger: 'blur' }],
  district: [{ required: true, message: '请输入区县', trigger: 'blur' }],
  detail: [{ required: true, message: '请输入详细地址', trigger: 'blur' }]
}

const loadAddress = async () => {
  loading.value = true
  try {
    const res = await getAddressListApi()
    if (res.code === 1) {
      addressList.value = res.data || []
    }
  } finally {
    loading.value = false
  }
}

// 打开新增弹窗
const openAdd = () => {
  dialogTitle.value = '新增地址'
  Object.assign(addressForm, {
    id: 0, receiverName: '', receiverPhone: '', province: '', city: '', district: '', detail: '', isDefault: 0
  })
  dialogVisible.value = true
  setTimeout(() => formRef.value?.clearValidate(), 0)
}

// 打开编辑弹窗
const openEdit = async (id: number) => {
  dialogTitle.value = '编辑地址'
  // 列表没返回手机号，所以要查详情
  const res = await getAddressDetailApi(id)
  if (res.code === 1) {
    const data = res.data
    Object.assign(addressForm, {
      id: id,
      receiverName:  data.receiverName,
      receiverPhone: data.receiverPhone,
      province: data.province,
      city: data.city,
      district: data.district,
      detail: data.detail,
      isDefault: data.isDefault
    })
    dialogVisible.value = true
    setTimeout(() => formRef.value?.clearValidate(), 0)
  }
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true
      try {
        let res
        if (addressForm.id) {
          res = await updateAddressApi(addressForm.id, addressForm)
        } else {
          res = await addAddressApi(addressForm)
        }
        if (res.code === 1) {
          ElMessage.success(addressForm.id ? '修改成功' : '新增成功')
          dialogVisible.value = false
          loadAddress()
        } else {
          ElMessage.error(res.msg)
        }
      } finally {
        submitLoading.value = false
      }
    }
  })
}

// 设为默认
const handleSetDefault = async (id: number) => {
  const res = await setDefaultAddressApi(id)
  if (res.code === 1) {
    ElMessage.success('已设为默认地址')
    loadAddress()
  }
}

// 删除
const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除该地址吗？', '提示', { type: 'warning' })
    const res = await deleteAddressApi(id)
    if (res.code === 1) {
      ElMessage.success('删除成功')
      loadAddress()
    }
  } catch (e) {}
}

onMounted(() => loadAddress())
</script>

<template>
  <div class="address-page">
    <TopNav />
    <Header />

    <div class="container layout-wrapper">
      <!-- 左侧导航 -->
      <UserSideBar />

      <!-- 右侧内容 -->
      <div class="right-content">
        <div class="header-banner">
          <h2>收货地址</h2>
          <span class="tip">您已创建 {{ addressList.length }} 个收货地址，最多可创建 20 个</span>
        </div>

        <div class="action-bar">
          <button class="btn-add" @click="openAdd">+ 新增收货地址</button>
        </div>

        <div class="address-list" v-loading="loading">
          <div class="address-card" v-for="item in addressList" :key="item.id">
            <div class="card-header">
              <span class="name">{{ item.receiverName }}</span>
              <span class="region">{{ item.province }} {{ item.city }} {{ item.district }}</span>
              <span class="default-tag" v-if="item.isDefault === 1">默认地址</span>
            </div>
            <div class="card-body">
              <p>地址：{{ item.detail }}</p>
              <p>收货人：{{ item.receiverName }} (手机号在详情中)</p>
            </div>
            <div class="card-footer">
              <button class="btn-text" @click="openEdit(item.id)">编辑</button>
              <button class="btn-text" v-if="item.isDefault === 0" @click="handleSetDefault(item.id)">设为默认</button>
              <button class="btn-text danger" v-if="item.isDefault === 0" @click="handleDelete(item.id)">删除</button>
            </div>
          </div>
          <div class="empty" v-if="addressList.length === 0 && !loading">暂无收货地址</div>
        </div>
      </div>
    </div>

    <!-- 新增/编辑地址弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form :model="addressForm" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="收货人" prop="receiverName">
          <el-input v-model="addressForm.receiverName" placeholder="请输入收货人姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="receiverPhone">
          <el-input v-model="addressForm.receiverPhone" placeholder="请输入手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="所在地区" required>
          <div class="region-inputs">
            <el-input v-model="addressForm.province" placeholder="省" />
            <el-input v-model="addressForm.city" placeholder="市" />
            <el-input v-model="addressForm.district" placeholder="区/县" />
          </div>
        </el-form-item>
        <el-form-item label="详细地址" prop="detail">
          <el-input v-model="addressForm.detail" type="textarea" :rows="2" placeholder="街道、门牌号等" />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="addressForm.isDefault" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.address-page { background: #f4f4f4; min-height: 100vh; padding-bottom: 50px; }
.layout-wrapper { display: flex; gap: 20px; margin-top: 20px; }

/* 右侧内容 */
.right-content { flex: 1; min-width: 0; }
.header-banner { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 15px; }
.header-banner h2 { font-size: 20px; color: #333; margin-bottom: 5px; }
.header-banner .tip { font-size: 13px; color: #999; }

.action-bar { margin-bottom: 15px; }
.btn-add { background: #fff; border: 1px solid #ddd; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; }
.btn-add:hover { border-color: #e1251b; color: #e1251b; }

/* 地址卡片 */
.address-list { display: flex; flex-direction: column; gap: 15px; }
.address-card { background: #fff; border-radius: 8px; padding: 20px; border: 1px solid #eee; }
.address-card:hover { border-color: #e1251b; }
.card-header { display: flex; align-items: center; gap: 15px; border-bottom: 1px dashed #eee; padding-bottom: 15px; margin-bottom: 15px; }
.card-header .name { font-size: 16px; font-weight: bold; color: #333; }
.card-header .region { font-size: 14px; color: #666; }
.default-tag { background: #fef5f5; color: #e1251b; border: 1px solid #e1251b; padding: 1px 6px; border-radius: 2px; font-size: 12px; }

.card-body p { font-size: 14px; color: #333; line-height: 1.8; }
.card-footer { margin-top: 15px; display: flex; justify-content: flex-end; gap: 15px; }
.btn-text { background: transparent; border: none; color: #005ea7; cursor: pointer; font-size: 14px; }
.btn-text:hover { text-decoration: underline; }
.btn-text.danger { color: #e1251b; }

.empty { text-align: center; padding: 60px; color: #999; background: #fff; border-radius: 8px; }
.region-inputs { display: flex; gap: 10px; }
</style>