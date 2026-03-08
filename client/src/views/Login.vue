<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1>SmartLeaseHub</h1>
        <p>房屋出租管理平台</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>

        <el-form-item v-if="isRegister" label="确认密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" placeholder="请确认密码" show-password />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit" style="width: 100%">
            {{ isRegister ? '注册' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <el-link type="primary" @click="toggleMode">
          {{ isRegister ? '已有账号？去登录' : '没有账号？去注册' }}
        </el-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref(null)
const loading = ref(false)
const isRegister = ref(false)

const form = reactive({
  phone: '',
  password: '',
  confirmPassword: ''
})

const validatePhone = (rule, value, callback) => {
  if (!/^1[3-9]\d{9}$/.test(value)) {
    callback(new Error('请输入正确的手机号'))
  } else {
    callback()
  }
}

const validateConfirmPassword = (rule, value, callback) => {
  if (isRegister.value && value !== form.password) {
    callback(new Error('两次密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { validator: validatePhone, trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

function toggleMode() {
  isRegister.value = !isRegister.value
  form.confirmPassword = ''
}

async function handleSubmit() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      if (isRegister.value) {
        await userStore.doRegister(form.phone, form.password)
        ElMessage.success('注册成功')
      } else {
        await userStore.doLogin(form.phone, form.password)
        ElMessage.success('登录成功')
      }
      router.push('/')
    } catch (err) {
      console.error('Login error:', err)
      let errorMsg = '操作失败'
      if (err.response?.error) {
        errorMsg = err.response.error
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error
      } else if (err.response?.data) {
        errorMsg = err.response.data
      } else if (err.message) {
        errorMsg = err.message
      }
      ElMessage.error(errorMsg)
    } finally {
      loading.value = false
    }
  })
}
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-box {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;

  h1 {
    font-size: 28px;
    font-weight: 700;
    color: #303133;
    margin-bottom: 8px;
  }

  p {
    font-size: 14px;
    color: #909399;
  }
}

.login-footer {
  text-align: center;
  margin-top: 16px;
}
</style>