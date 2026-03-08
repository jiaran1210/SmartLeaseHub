<template>
  <div class="bills-page">
    <div class="page-header">
      <h2>费用账单</h2>
      <el-button type="primary" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon>
        新增账单
      </el-button>
    </div>

    <div class="filter-bar">
      <el-select v-model="filterType" placeholder="类型筛选" clearable style="width: 120px">
        <el-option label="房租" value="房租" />
        <el-option label="水费" value="水费" />
        <el-option label="电费" value="电费" />
        <el-option label="燃气费" value="燃气费" />
      </el-select>
      <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width: 120px; margin-left: 12px">
        <el-option label="未缴纳" value="未缴纳" />
        <el-option label="已缴纳" value="已缴纳" />
      </el-select>
    </div>

    <div v-if="filteredBills.length === 0" class="empty-state">
      <el-icon size="64"><Money /></el-icon>
      <p>暂无账单</p>
    </div>

    <el-table v-else :data="filteredBills" stripe style="width: 100%">
      <el-table-column prop="bill_date" label="账单日期" width="120" />
      <el-table-column prop="house_name" label="房屋" min-width="150" />
      <el-table-column prop="tenant_name" label="租户" width="100" />
      <el-table-column prop="type" label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="getTypeTag(row.type)" size="small">{{ row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="amount" label="金额" width="100">
        <template #default="{ row }">
          <span class="amount">¥{{ row.amount }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === '已缴纳' ? 'success' : 'warning'" size="small">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
      <el-table-column label="操作" fixed="right" width="150">
        <template #default="{ row }">
          <el-button v-if="row.status === '未缴纳'" type="success" link size="small" @click="handlePay(row)">
            缴费
          </el-button>
          <el-button type="primary" link size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增账单对话框 -->
    <el-dialog v-model="showAddDialog" title="新增账单" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="房屋" required>
          <el-select v-model="form.house_id" placeholder="选择房屋" style="width: 100%">
            <el-option v-for="h in houses" :key="h.id" :label="h.name" :value="h.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" required>
          <el-select v-model="form.type" placeholder="选择类型" style="width: 100%">
            <el-option label="水费" value="水费" />
            <el-option label="电费" value="电费" />
            <el-option label="燃气费" value="燃气费" />
            <el-option label="其他费用" value="其他费用" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额" required>
          <el-input v-model="form.amount" type="number" placeholder="金额">
            <template #append>元</template>
          </el-input>
        </el-form-item>
        <el-form-item label="账单日期" required>
          <el-date-picker v-model="form.bill_date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAdd">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getBills, getBills as getHouses, createBill, payBill, deleteBill } from '../api/auth'

const bills = ref([])
const houses = ref([])
const filterType = ref('')
const filterStatus = ref('')
const showAddDialog = ref(false)

const form = reactive({
  house_id: '',
  type: '',
  amount: '',
  bill_date: new Date().toISOString().split('T')[0],
  remark: ''
})

const filteredBills = computed(() => {
  return bills.value.filter(b => {
    if (filterType.value && b.type !== filterType.value) return false
    if (filterStatus.value && b.status !== filterStatus.value) return false
    return true
  })
})

function getTypeTag(type) {
  const map = { '水费': '', '电费': 'warning', '燃气费': 'info', '其他费用': '' }
  return map[type] || ''
}

async function fetchData() {
  try {
    const [billsRes, housesRes] = await Promise.all([
      getBills(),
      getHouses()
    ])
    bills.value = billsRes.bills
    houses.value = housesRes.houses
  } catch (err) {
    console.error(err)
  }
}

async function handleAdd() {
  if (!form.house_id || !form.type || !form.amount) {
    ElMessage.warning('请填写必填项')
    return
  }

  try {
    await createBill(form)
    ElMessage.success('添加成功')
    showAddDialog.value = false
    Object.assign(form, { house_id: '', type: '', amount: '', bill_date: new Date().toISOString().split('T')[0], remark: '' })
    fetchData()
  } catch (err) {
    ElMessage.error(err.response?.error || err.response?.data?.error || '添加失败')
  }
}

async function handlePay(bill) {
  try {
    await payBill(bill.id, {})
    ElMessage.success('缴费成功')
    fetchData()
  } catch (err) {
    ElMessage.error(err.response?.error || err.response?.data?.error || '操作失败')
  }
}

async function handleDelete(bill) {
  try {
    await ElMessageBox.confirm('确定要删除该账单吗？', '确认删除', { type: 'warning' })
    await deleteBill(bill.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.error || err.response?.data?.error || '删除失败')
    }
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.bills-page {
  .filter-bar {
    margin-bottom: 16px;
  }

  .amount {
    color: #f56c6c;
    font-weight: 600;
  }
}
</style>