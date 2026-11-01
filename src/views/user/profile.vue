<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, UploadUserFile } from 'element-plus'
import TopNav from '@/components/TopNav.vue'
import Header from '@/components/Header.vue'
import UserSideBar from '@/components/UserSideBar.vue'
import { getUserProfileApi, updateUserProfileApi } from '@/api/user'
import { uploadFileApi } from '@/api/review' // 复用评价里的上传接口
import type { UserUpdateDTO } from '@/types/user'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const loading = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

// 表单数据
const form = reactive<UserUpdateDTO & { username?: string }>({
  username: '',
  nickname: '',
  avatar: '',
  phone: '',
  email: '',
  gender: 0,
  birthday: ''
})

// 头像上传组件绑定
const fileList = ref<UploadUserFile[]>([])

// 表单校验规则
const rules = {
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { max: 50, message: '昵称不能超过50字', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ]
}

// 获取个人信息
const loadProfile = async () => {
  loading.value = true
  try {
    const res = await getUserProfileApi()
    if (res.code === 1) {
      const data = res.data
      Object.assign(form, data)

      // 回显头像
      if (data.avatar) {
        fileList.value = [
          { name: 'avatar.jpg', url: data.avatar }
        ]
      }
    }
  } finally {
    loading.value = false
  }
}

// 自定义图片上传
const customUpload = async (options: any) => {
  const file = options.file
  if (!file) return
  try {
    const res = await uploadFileApi(file)
    if (res.code === 1) {
      options.onSuccess(res.data)
      form.avatar = res.data
    } else {
      options.onError(new Error('上传失败'))
      ElMessage.error('图片上传失败')
    }
  } catch (e) {
    options.onError(e)
    ElMessage.error('图片上传异常')
  }
}

// 移除头像
const handleRemoveImage = () => {
  form.avatar = ''
}

// 提交保存
const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true
      try {
        const res = await updateUserProfileApi({
          nickname: form.nickname,
          avatar: form.avatar,
          phone: form.phone,
          email: form.email,
          gender: form.gender,
          birthday: form.birthday
        })
        if (res.code === 1) {
          ElMessage.success('个人信息保存成功')
          // 同步更新全局 store，让顶部的头像和昵称立刻变化
          if (userStore.userInfo) {
            userStore.userInfo.nickname = form.nickname
            userStore.userInfo.avatar = form.avatar
          }
        } else {
          ElMessage.error(res.msg)
        }
      } finally {
        submitLoading.value = false
      }
    }
  })
}

onMounted(() => {
  loadProfile()
})
</script>

<template>
  <div class="profile-page">
    <TopNav />
    <Header />

    <div class="container layout-wrapper" v-loading="loading">
      <!-- 左侧导航 -->
      <UserSideBar />

      <!-- 右侧主体 -->
      <div class="right-content">
        <div class="panel-card">
          <div class="panel-header">
            <h2>个人资料</h2>
            <span class="tip">完善个人信息，享受更好的购物体验</span>
          </div>

          <el-form
              :model="form"
              :rules="rules"
              ref="formRef"
              label-width="100px"
              class="profile-form"
          >
            <!-- 头像上传 -->
            <el-form-item label="头像" prop="avatar">
              <div class="avatar-uploader-wrap">
                <el-upload
                    class="avatar-uploader"
                    action="#"
                    :show-file-list="false"
                    :http-request="customUpload"
                    :on-remove="handleRemoveImage"
                    :file-list="fileList"
                >
                  <img v-if="form.avatar" :src="form.avatar" class="avatar" />
                  <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
                </el-upload>
                <div class="avatar-tip">点击更换头像，建议尺寸 200x200</div>
              </div>
            </el-form-item>

            <!-- 用户名（只读） -->
            <el-form-item label="登录账号">
              <el-input v-model="form.username" disabled class="readonly-input" />
            </el-form-item>

            <!-- 昵称 -->
            <el-form-item label="昵称" prop="nickname">
              <el-input v-model="form.nickname" placeholder="请输入昵称" maxlength="50" />
            </el-form-item>

            <!-- 手机号 -->
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" />
            </el-form-item>

            <!-- 邮箱 -->
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱" maxlength="50" />
            </el-form-item>

            <!-- 性别 -->
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="form.gender">
                <el-radio :label="0">保密</el-radio>
                <el-radio :label="1">男</el-radio>
                <el-radio :label="2">女</el-radio>
              </el-radio-group>
            </el-form-item>

            <!-- 生日 -->
            <el-form-item label="生日" prop="birthday">
              <el-date-picker
                  v-model="form.birthday"
                  type="date"
                  placeholder="选择生日"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
              />
            </el-form-item>

            <!-- 操作按钮 -->
            <el-form-item>
              <el-button type="primary" :loading="submitLoading" @click="submitForm" class="btn-save">
                保存修改
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page { background: #f4f4f4; min-height: 100vh; padding-bottom: 50px; }
.layout-wrapper { display: flex; gap: 20px; margin-top: 20px; }
.right-content { flex: 1; min-width: 0; }

.panel-card {
  background: #fff;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.panel-header {
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 30px;
  padding-bottom: 15px;
}
.panel-header h2 { font-size: 20px; color: #333; margin-bottom: 5px; }
.panel-header .tip { font-size: 13px; color: #999; }

.profile-form {
  max-width: 500px;
}

/* 头像上传 */
.avatar-uploader-wrap {
  display: flex;
  align-items: center;
  gap: 20px;
}
.avatar-uploader :deep(.el-upload) {
  border: 1px dashed #d9d9d9;
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
}
.avatar-uploader :deep(.el-upload:hover) {
  border-color: #e1251b;
}
.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  line-height: 100px;
  text-align: center;
}
.avatar {
  width: 100px;
  height: 100px;
  display: block;
  object-fit: cover;
}
.avatar-tip {
  font-size: 12px;
  color: #999;
}

/* 只读输入框 */
.readonly-input :deep(.el-input__wrapper) {
  background-color: #f8f8f8;
  color: #999;
}

.btn-save {
  width: 160px;
  background-color: #e1251b;
  border-color: #e1251b;
  font-size: 16px;
  height: 40px;
}
.btn-save:hover {
  background-color: #c91e15;
  border-color: #c91e15;
}
</style>