<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { loginApi } from '@/api/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const activeTab = ref<'password' | 'register'>('password')
const loading = ref(false)
const form = reactive({ username: '', password: '' })
const errorMsg = ref('')

const handleLogin = async () => {
  errorMsg.value = ''
  if (!form.username.trim()) { errorMsg.value = '请输入用户名'; return }
  if (!form.password.trim()) { errorMsg.value = '请输入密码'; return }

  loading.value = true
  try {
    const res = await loginApi(form)
    if (res.code === 1) {
      // 只允许普通用户登录
      if (res.data.role !== 1) {
        errorMsg.value = '请使用普通用户账号登录'
        return
      }
      userStore.setToken(res.data.token)
      await userStore.fetchUserInfo()
      // 登录后跳回原页面或首页
      const redirect = (route.query.redirect as string) || '/'
      router.push(redirect)
    } else {
      errorMsg.value = res.msg
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <!-- 顶部 logo -->
    <div class="container top">
      <div class="logo" @click="router.push('/')">HisoutenMall</div>
      <div class="link">登录页面，改进建议</div>
    </div>

    <!-- 登录卡片 -->
    <div class="container card-wrap">
      <div class="card">
        <!-- 左侧二维码占位 -->
        <div class="left">
          <div class="tab-title active">扫码登录</div>
          <div class="qr-wrap">
            <div class="qr-placeholder">二维码<br />（暂未开放）</div>
          </div>
          <div class="qr-tip">打开 App 扫一扫登录</div>
        </div>

        <!-- 右侧账号密码登录 -->
        <div class="right">
          <div class="form-title">密码登录</div>
          <div class="form">
            <div class="input-wrap">
              <input
                  v-model="form.username"
                  placeholder="账号名/手机号/邮箱"
                  @keyup.enter="handleLogin"
              />
            </div>
            <div class="input-wrap">
              <input
                  v-model="form.password"
                  type="password"
                  placeholder="密码"
                  @keyup.enter="handleLogin"
              />
            </div>
            <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
            <button class="btn-login" :disabled="loading" @click="handleLogin">
              {{ loading ? '登录中...' : '登录' }}
            </button>
          </div>
          <div class="links">
            <router-link to="/register">立即注册</router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部 -->
    <div class="footer">
      关于我们 | 联系我们 | 人才招聘 | 商家入驻 | 广告服务 | 友情链接
      <div class="copyright">Copyright © 2026 HisoutenMall 版权所有</div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #f4f4f4;
  display: flex;
  flex-direction: column;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px 0;
}
.logo {
  font-size: 32px;
  font-weight: bold;
  color: #e1251b;
  cursor: pointer;
}
.link {
  font-size: 13px;
  color: #666;
}

.card-wrap {
  flex: 1;
  display: flex;
  justify-content: center;
  padding-top: 40px;
}
.card {
  width: 800px;
  background: #fff;
  border-radius: 8px;
  padding: 50px 60px;
  display: flex;
  gap: 60px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

/* 左侧二维码 */
.left {
  width: 280px;
  text-align: center;
  border-right: 1px solid #eee;
  padding-right: 60px;
}
.tab-title {
  font-size: 16px;
  color: #333;
  margin-bottom: 20px;
}
.qr-wrap {
  width: 200px;
  height: 200px;
  margin: 0 auto;
  background: #f8f8f8;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qr-placeholder {
  color: #999;
  font-size: 14px;
  line-height: 1.6;
}
.qr-tip {
  margin-top: 15px;
  font-size: 12px;
  color: #999;
}

/* 右侧表单 */
.right {
  flex: 1;
}
.form-title {
  font-size: 20px;
  color: #e1251b;
  font-weight: bold;
  margin-bottom: 30px;
}
.input-wrap {
  margin-bottom: 18px;
}
.input-wrap input {
  width: 100%;
  height: 45px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0 15px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.input-wrap input:focus {
  border-color: #e1251b;
}
.error {
  color: #e1251b;
  font-size: 13px;
  margin-bottom: 10px;
}
.btn-login {
  width: 100%;
  height: 45px;
  background: #e1251b;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-login:hover:not(:disabled) {
  background: #c91e15;
}
.btn-login:disabled {
  background: #f5a5a0;
  cursor: not-allowed;
}
.links {
  margin-top: 20px;
  text-align: right;
}
.links a {
  color: #e1251b;
  font-size: 13px;
}

/* 底部 */
.footer {
  padding: 30px 0;
  text-align: center;
  font-size: 12px;
  color: #999;
}
.copyright {
  margin-top: 8px;
}
</style>