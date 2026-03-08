<template>
  <div class="tenants-page">
    <div class="page-header">
      <h2>租户管理</h2>
    </div>

    <div class="filter-bar">
      <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width: 120px">
        <el-option label="在住" value="active" />
        <el-option label="已退租" value="inactive" />
      </el-select>
    </div>

    <div v-if="filteredTenants.length === 0" class="empty-state">
      <el-icon size="64"><User /></el-icon>
      <p>暂无租户</p>
    </div>

    <el-table v-else :data="filteredTenants" stripe style="width: 100%">
      <el-table-column prop="name" label="姓名" width="100" />
      <el-table-column prop="phone" label="电话" width="120" />
      <el-table-column prop="house_name" label="房屋" min-width="150" />
      <el-table-column prop="move_in_date" label="入住时间" width="120" />
      <el-table-column prop="lease_end_date" label="合同到期" width="120" />
      <el-table-column prop="monthly_rent" label="月租金" width="100">
        <template #default="{ row }">
          ¥{{ row.monthly_rent }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
            {{ row.status === 'active' ? '在住' : '已退租' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" width="120">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="$router.push(`/houses/${row.house_id}`)">
            查看
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getTenants } from '../api/auth'

const tenants = ref([])
const filterStatus = ref('')

const filteredTenants = computed(() => {
  if (!filterStatus.value) return tenants.value
  return tenants.value.filter(t => t.status === filterStatus.value)
})

async function fetchTenants() {
  try {
    const res = await getTenants()
    tenants.value = res.tenants
  } catch (err) {
    console.error(err)
  }
}

onMounted(() => {
  fetchTenants()
})
</script>

<style lang="scss" scoped>
.tenants-page {
  .filter-bar {
    margin-bottom: 16px;
  }
}
</style>