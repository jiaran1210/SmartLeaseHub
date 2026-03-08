import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, register, getUserInfo } from '../api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(null)

  const isLoggedIn = computed(() => !!token.value)

  async function doLogin(phone, password) {
    const res = await login(phone, password)
    token.value = res.token
    localStorage.setItem('token', token.value)
    user.value = res.user
    return res
  }

  async function doRegister(phone, password) {
    const res = await register(phone, password)
    token.value = res.token
    localStorage.setItem('token', token.value)
    user.value = res.user
    return res
  }

  async function fetchUserInfo() {
    if (!token.value) return
    try {
      const res = await getUserInfo()
      user.value = res.user
    } catch (err) {
      logout()
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
  }

  return {
    token,
    user,
    isLoggedIn,
    doLogin,
    doRegister,
    fetchUserInfo,
    logout
  }
})