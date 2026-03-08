<template>
  <div class="house-detail">
    <div class="page-header">
      <el-button @click="$router.back()">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
    </div>

    <div v-if="loading" class="loading-state">
      <el-icon size="32" class="is-loading"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <template v-else-if="house">
      <!-- 房屋信息 -->
      <div class="detail-header">
        <div class="house-title">{{ house.name }}</div>
        <div class="house-info">
          <div class="info-item">
            <div class="label">地址</div>
            <div class="value">{{ house.address || '未填写' }}</div>
          </div>
          <div class="info-item">
            <div class="label">户型</div>
            <div class="value">{{ house.rooms || '未填写' }}</div>
          </div>
          <div class="info-item">
            <div class="label">状态</div>
            <div class="value">
              <el-tag :type="house.status === '出租中' ? 'success' : 'info'">{{ house.status }}</el-tag>
            </div>
          </div>
          <div class="info-item">
            <div class="label">租户数</div>
            <div class="value">{{ house.tenant_count }} 人</div>
          </div>
          <div class="info-item">
            <div class="label">总收入</div>
            <div class="value income">¥{{ formatMoney(house.total_income) }}</div>
          </div>
        </div>
      </div>

      <!-- 租户列表 -->
      <div class="section-card">
        <div class="section-header">
          <h3>租户列表</h3>
          <el-button type="primary" size="small" @click="showAddTenantDialog = true">
            <el-icon><Plus /></el-icon>
            新增租户
          </el-button>
        </div>

        <div v-if="tenants.length === 0" class="empty-state">
          <el-icon size="48"><User /></el-icon>
          <p>暂无租户</p>
        </div>

        <el-table v-else :data="tenants" stripe style="width: 100%">
          <el-table-column prop="name" label="姓名" width="100" />
          <el-table-column prop="phone" label="电话" width="120" />
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
          <el-table-column label="操作" fixed="right" width="150">
            <template #default="{ row }">
              <el-button v-if="row.status === 'active'" type="primary" link size="small" @click="handleMoveOut(row)">
                退租
              </el-button>
              <el-button type="primary" link size="small" @click="currentTenant = row; showPaymentDialog = true">缴费</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>
  </div>

  <!-- 添加租户对话框 -->
  <el-dialog v-model="showAddTenantDialog" title="新增租户" width="600px" destroy-on-close @closed="resetTenantForm">
    <el-form :model="tenantForm" label-width="100px">
      <el-form-item label="姓名" required>
        <el-input v-model="tenantForm.name" placeholder="租户姓名" />
      </el-form-item>
      <el-form-item label="电话" required>
        <el-input v-model="tenantForm.phone" placeholder="联系电话" />
      </el-form-item>
      <el-form-item label="入住时间" required>
        <el-date-picker v-model="tenantForm.move_in_date" type="date" value-format="YYYY-MM-DD" placeholder="选择入住时间" style="width: 100%" />
      </el-form-item>
      <el-form-item label="租期到期" required>
        <el-date-picker v-model="tenantForm.lease_end_date" type="date" value-format="YYYY-MM-DD" placeholder="选择到期时间" style="width: 100%" />
      </el-form-item>
      <el-form-item label="月租金" required>
        <el-input v-model="tenantForm.monthly_rent" type="number" placeholder="月租金">
          <template #append>元</template>
        </el-input>
      </el-form-item>
      <el-form-item label="押金">
        <el-input v-model="tenantForm.deposit" type="number" placeholder="押金金额">
          <template #append>元</template>
        </el-input>
      </el-form-item>
      <el-form-item label="紧急联系人">
        <el-input v-model="tenantForm.emergency_contact" placeholder="紧急联系人姓名" />
      </el-form-item>
      <el-form-item label="紧急电话">
        <el-input v-model="tenantForm.emergency_phone" placeholder="紧急联系电话" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="showAddTenantDialog = false">取消</el-button>
      <el-button type="primary" @click="handleAddTenant">确定</el-button>
    </template>
  </el-dialog>

  <!-- 缴费对话框 -->
  <el-dialog v-model="showPaymentDialog" title="记录缴费" width="500px" destroy-on-close @opened="initPaymentForm">
    <el-form :model="paymentForm" label-width="100px">
      <el-form-item label="租户">
        <span>{{ currentTenant?.name }}</span>
      </el-form-item>
      <el-form-item label="金额" required>
        <el-input v-model="paymentForm.amount" type="number" placeholder="缴费金额">
          <template #append>元</template>
        </el-input>
      </el-form-item>
      <el-form-item label="缴费日期" required>
        <el-date-picker v-model="paymentForm.payment_date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
      </el-form-item>
      <el-form-item label="缴费周期">
        <el-col :span="11">
          <el-date-picker v-model="paymentForm.period_start" type="month" value-format="YYYY-MM-DD" placeholder="开始月份" style="width: 100%" />
        </el-col>
        <el-col :span="2" style="text-align: center">-</el-col>
        <el-col :span="11">
          <el-date-picker v-model="paymentForm.period_end" type="month" value-format="YYYY-MM-DD" placeholder="结束月份" style="width: 100%" />
        </el-col>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="paymentForm.remark" type="textarea" placeholder="备注信息" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="showPaymentDialog = false">取消</el-button>
      <el-button type="primary" @click="handleAddPayment">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getHouse, getTenants, createTenant, moveOutTenant, createPayment } from '../api/auth'

const route = useRoute()
const houseId = route.params.id

const loading = ref(true)
const house = ref(null)
const tenants = ref([])

const showAddTenantDialog = ref(false)
const showPaymentDialog = ref(false)
const currentTenant = ref(null)

const tenantForm = reactive({
  name: '',
  phone: '',
  move_in_date: '',
  lease_end_date: '',
  monthly_rent: '',
  deposit: '',
  emergency_contact: '',
  emergency_phone: ''
})

const paymentForm = reactive({
  amount: '',
  payment_date: new Date().toISOString().split('T')[0],
  period_start: '',
  period_end: '',
  remark: ''
})

function formatMoney(value) {
  return Number(value || 0).toLocaleString('zh-CN')
}

async function fetchData() {
  loading.value = true
  try {
    const [houseRes, tenantsRes] = await Promise.all([
      getHouse(houseId),
      getTenants({ house_id: houseId })
    ])
    house.value = houseRes.house
    tenants.value = tenantsRes.tenants
  } catch (err) {
    console.error('Fetch data error:', err)
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

function resetTenantForm() {
  Object.assign(tenantForm, {
    name: '', phone: '', move_in_date: '', lease_end_date: '',
    monthly_rent: '', deposit: '', emergency_contact: '', emergency_phone: ''
  })
}

function initPaymentForm() {
  if (!currentTenant.value) return
  const today = new Date()
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  Object.assign(paymentForm, {
    amount: currentTenant.value.monthly_rent,
    payment_date: today.toISOString().split('T')[0],
    period_start: today.toISOString().slice(0, 7) + '-01',
    period_end: nextMonth.toISOString().split('T')[0],
    remark: ''
  })
}

async function handleAddTenant() {
  if (!tenantForm.name || !tenantForm.phone || !tenantForm.move_in_date || !tenantForm.lease_end_date || !tenantForm.monthly_rent) {
    ElMessage.warning('请填写必填项')
    return
  }

  try {
    const res = await createTenant({ ...tenantForm, house_id: houseId })
    console.log('Tenant added:', res)
    ElMessage.success('添加成功')
    showAddTenantDialog.value = false
    fetchData()
  } catch (err) {
    console.error('Add tenant error:', err)
    ElMessage.error(err.response?.error || err.response?.data?.error || err.message || '添加失败')
  }
}

async function handleMoveOut(tenant) {
  try {
    await ElMessageBox.confirm(`确定要将 ${tenant.name} 办理退租吗？`, '确认退租', { type: 'warning' })
    await moveOutTenant(tenant.id, {})
    ElMessage.success('退租成功')
    fetchData()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.error || err.response?.data?.error || '操作失败')
    }
  }
}

async function handleAddPayment() {
  if (!paymentForm.amount || !paymentForm.payment_date) {
    ElMessage.warning('请填写必填项')
    return
  }

  try {
    const res = await createPayment({
      ...paymentForm,
      tenant_id: currentTenant.value.id,
      house_id: houseId
    })
    console.log('Payment added:', res)
    ElMessage.success('缴费记录成功')
    showPaymentDialog.value = false
    fetchData()
  } catch (err) {
    console.error('Add payment error:', err)
    ElMessage.error(err.response?.error || err.response?.data?.error || err.message || '操作失败')
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.house-detail {
  .loading-state {
    text-align: center;
    padding: 60px;
    color: #909399;
  }

  .section-card {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    margin-top: 20px;

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      h3 {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
      }
    }
  }

  .income {
    color: #67c23a;
    font-weight: 600;
  }
}
</style>