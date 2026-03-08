<template>
  <div class="contracts-page">
    <div class="page-header">
      <h2>合同管理</h2>
    </div>

    <div v-if="contracts.length === 0" class="empty-state">
      <el-icon size="64"><Document /></el-icon>
      <p>暂无合同</p>
    </div>

    <el-table v-else :data="contracts" stripe style="width: 100%">
      <el-table-column prop="contract_no" label="合同编号" width="180" />
      <el-table-column prop="house_name" label="房屋" min-width="150" />
      <el-table-column prop="tenant_name" label="租户" width="100" />
      <el-table-column prop="tenant_phone" label="租户电话" width="120" />
      <el-table-column label="租期" min-width="200">
        <template #default="{ row }">
          {{ row.start_date }} 至 {{ row.end_date }}
        </template>
      </el-table-column>
      <el-table-column prop="monthly_rent" label="月租金" width="100">
        <template #default="{ row }">
          ¥{{ row.monthly_rent }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === '生效' ? 'success' : 'info'" size="small">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" width="100">
        <template #default="{ row }">
          <el-button type="primary" link size="small">查看</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getContracts } from '../api/auth'

const contracts = ref([])

async function fetchContracts() {
  try {
    const res = await getContracts()
    contracts.value = res.contracts
  } catch (err) {
    console.error(err)
  }
}

onMounted(() => {
  fetchContracts()
})
</script>