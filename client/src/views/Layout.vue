<template>
  <el-container class="layout-container">
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <el-icon><HomeFilled /></el-icon>
        <span>SmartLeaseHub</span>
      </div>

      <el-menu
        :default-active="$route.path"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <el-menu-item index="/">
          <el-icon><DataAnalysis /></el-icon>
          <span>数据概览</span>
        </el-menu-item>

        <el-menu-item index="/houses">
          <el-icon><House /></el-icon>
          <span>房屋管理</span>
        </el-menu-item>

        <el-menu-item index="/tenants">
          <el-icon><User /></el-icon>
          <span>租户管理</span>
        </el-menu-item>

        <el-menu-item index="/contracts">
          <el-icon><Document /></el-icon>
          <span>合同管理</span>
        </el-menu-item>

        <el-menu-item index="/bills">
          <el-icon><Money /></el-icon>
          <span>费用账单</span>
        </el-menu-item>

        <el-menu-item index="/meters">
          <el-icon><Odometer /></el-icon>
          <span>水电煤读数</span>
        </el-menu-item>

        <el-menu-item index="/stats">
          <el-icon><TrendCharts /></el-icon>
          <span>统计分析</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentRoute !== '/'">{{ currentRouteName }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><UserFilled /></el-icon>
              {{ userStore.user?.phone }}
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const currentRoute = computed(() => route.path)
const currentRouteName = computed(() => {
  const nameMap = {
    '/': '数据概览',
    '/houses': '房屋管理',
    '/tenants': '租户管理',
    '/contracts': '合同管理',
    '/bills': '费用账单',
    '/meters': '水电煤读数',
    '/stats': '统计分析'
  }
  return nameMap[route.path] || ''
})

function handleCommand(command) {
  if (command === 'logout') {
    userStore.logout()
    router.push('/login')
  }
}
</script>

<style lang="scss" scoped>
.layout-container {
  min-height: 100vh;
}

.sidebar {
  background: #304156;

  .logo {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #fff;
    font-size: 18px;
    font-weight: 600;
    border-bottom: 1px solid #1f2d3d;
  }

  .el-menu {
    border-right: none;
  }
}

.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  padding: 0 24px;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    color: #606266;

    &:hover {
      color: #409eff;
    }
  }
}

.main {
  background: #f5f7fa;
  padding: 20px;
}
</style>