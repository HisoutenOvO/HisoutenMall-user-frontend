<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { registerApi } from '@/api/auth'

const router = useRouter()
const loading = ref(false)
const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  nickname: ''
})
const errorMsg = ref('')

const handleRegister = async () => {
  errorMsg.value = ''
  if (!form.username.trim()) { errorMsg.value = '请输入用户名'; return }
  if (!form.password.trim()) { errorMsg.value = '请输入密码'; return }
  if (form.password.length < 6) { errorMsg.value = '密码长度至少6位'; return }
  if (form.password !== form.confirmPassword) { errorMsg.value = '两次密码不一致'; return }
  if (!form.nickname.trim()) { errorMsg.value = '请输入昵称'; return }

  loading.value = true
  try {
    const res = await registerApi({
      username: form.username,
      password: form.password,
      nickname: form.nickname
    })
    if (res.code === 1) {
      alert('注册成功，请登录')
      router.push('/login')
    } else {
      errorMsg.value = res.msg
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-page">
    <div class="container top">
      <div class="logo" @click="router.push('/')">HisoutenMall</div>
    </div>

    <div class="container card-wrap">
      <div class="card">
        <div class="form-title">用户注册</div>
        <div class="form">
          <div class="input-wrap">
            <label>用户名</label>
            <input v-model="form.username" placeholder="请输入用户名" />
          </div>
          <div class="input-wrap">
            <label>密码</label>
            <input v-model="form.password" type="password" placeholder="请输入密码（6-20位）" />
          </div>
          <div class="input-wrap">
            <label>确认密码</label>
            <input v-model="form.confirmPassword" type="password" placeholder="请再次输入密码" />
          </div>
          <div class="input-wrap">
            <label>昵称</label>
            <input v-model="form.nickname" placeholder="请输入昵称" />
          </div>
          <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
          <button class="btn-register" :disabled="loading" @click="handleRegister">
            {{ loading ? '注册中...' : '立即注册' }}
          </button>
        </div>
        <div class="links">
          已有账号？<router-link to="/login">立即登录</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  min-height: 100vh;
  background: #f4f4f4;
}
.top {
  padding: 25px 0;
}
.logo {
  font-size: 32px;
  font-weight: bold;
  color: #e1251b;
  cursor: pointer;
}
.card-wrap {
  display: flex;
  justify-content: center;
  padding-top: 60px;
}
.card {
  width: 460px;
  background: #fff;
  border-radius: 8px;
  padding: 50px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}
.form-title {
  font-size: 22px;
  color: #333;
  margin-bottom: 30px;
  text-align: center;
}
.input-wrap {
  margin-bottom: 20px;
}
.input-wrap label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}
.input-wrap input {
  width: 100%;
  height: 45px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0 15px;
  font-size: 14px;
  outline: none;
}
.input-wrap input:focus {
  border-color: #e1251b;
}
.error {
  color: #e1251b;
  font-size: 13px;
  margin-bottom: 10px;
  text-align: center;
}
.btn-register {
  width: 100%;
  height: 45px;
  background: #e1251b;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 10px;
}
.btn-register:hover:not(:disabled) {
  background: #c91e15;
}
.btn-register:disabled {
  background: #f5a5a0;
  cursor: not-allowed;
}
.links {
  margin-top: 20px;
  text-align: center;
  font-size: 13px;
  color: #666;
}
.links a {
  color: #e1251b;
}
</style>