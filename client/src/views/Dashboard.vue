<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: #e8f4fd;">
            <el-icon size="24" color="#409eff"><House /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.houseCount }}</div>
            <div class="stat-label">房屋总数</div>
          </div>
        </div>
      </el-col>

      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: #e8f9f0;">
            <el-icon size="24" color="#67c23a"><User /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.activeTenantCount }}</div>
            <div class="stat-label">活跃租户</div>
          </div>
        </div>
      </el-col>

      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: #fef5e8;">
            <el-icon size="24" color="#e6a23c"><Money /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">¥{{ formatMoney(stats.totalIncome) }}</div>
            <div class="stat-label">年度收入</div>
          </div>
        </div>
      </el-col>

      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: #f3e8fd;">
            <el-icon size="24" color="#909399"><Warning /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.expiringCount }}</div>
            <div class="stat-label">即将到期</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <!-- 房屋列表 -->
      <el-col :xs="24" :lg="14">
        <div class="section-card">
          <div class="section-header">
            <h3>房屋概览</h3>
            <el-button type="primary" link @click="$router.push('/houses')">查看全部</el-button>
          </div>

          <div v-if="houses.length === 0" class="empty-state">
            <el-icon size="48"><House /></el-icon>
            <p>暂无房屋，去添加一个吧</p>
            <el-button type="primary" @click="showAddHouseDialog = true">添加房屋</el-button>
          </div>

          <div v-else class="house-list">
            <div v-for="house in houses.slice(0, 6)" :key="house.id" class="house-item" @click="$router.push(`/houses/${house.id}`)">
              <div class="house-info">
                <div class="house-name">{{ house.name }}</div>
                <div class="house-meta">
                  <el-tag :type="house.status === '出租中' ? 'success' : 'info'" size="small">
                    {{ house.status }}
                  </el-tag>
                  <span class="tenant-count">{{ house.tenant_count }} 位租户</span>
                </div>
              </div>
              <div class="house-income">
                <span class="label">总收入</span>
                <span class="value">¥{{ formatMoney(house.total_income) }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-col>

      <!-- 提醒事项 -->
      <el-col :xs="24" :lg="10">
        <div class="section-card">
          <div class="section-header">
            <h3>提醒事项</h3>
            <el-badge :value="reminders.expiringContracts?.length || 0" :hidden="!reminders.expiringContracts?.length">
              <span></span>
            </el-badge>
          </div>

          <div v-if="!reminders.expiringContracts?.length" class="empty-state">
            <el-icon size="48"><Bell /></el-icon>
            <p>暂无提醒事项</p>
          </div>

          <div v-else class="reminder-list">
            <div v-for="item in reminders.expiringContracts.slice(0, 5)" :key="item.id" class="reminder-item">
              <div class="reminder-icon" style="color: #e6a23c;">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="reminder-content">
                <div class="reminder-title">{{ item.house_name }} - {{ item.tenant_name }}</div>
                <div class="reminder-desc">合同将于 {{ item.end_date }} 到期</div>
              </div>
              <el-button type="primary" link size="small" @click="$router.push(`/houses/${item.house_id}`)">查看</el-button>
            </div>
          </div>
        </div>

        <!-- 快捷操作 -->
        <div class="section-card">
          <div class="section-header">
            <h3>快捷操作</h3>
          </div>
          <div class="quick-actions">
            <el-button @click="showAddHouseDialog = true">
              <el-icon><Plus /></el-icon>
              添加房屋
            </el-button>
            <el-button @click="openAddTenantDialog">
              <el-icon><UserFilled /></el-icon>
              添加租户
            </el-button>
            <el-button @click="openRenewDialog">
              <el-icon><Refresh /></el-icon>
              租户续租
            </el-button>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 添加房屋对话框 -->
    <el-dialog v-model="showAddHouseDialog" title="添加房屋" width="500px">
      <el-form :model="houseForm" label-width="100px">
        <el-form-item label="房屋名称" required>
          <el-input v-model="houseForm.name" placeholder="如：阳光花园A栋301" />
        </el-form-item>
        <el-form-item label="地址" required>
          <div class="address-selector">
            <el-select v-model="houseForm.address" placeholder="选择地址" style="width: 100%" allow-create filterable @change="handleAddressChange">
              <el-option v-for="addr in addressOptions" :key="addr" :label="addr" :value="addr" />
            </el-select>
          </div>
        </el-form-item>
        <el-form-item label="户型">
          <el-input v-model="houseForm.rooms" placeholder="如：2室1厅" />
        </el-form-item>
        <el-form-item label="面积">
          <el-input v-model="houseForm.area" type="number" placeholder="建筑面积（平方米）">
            <template #append>㎡</template>
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddHouseDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddHouse">确定</el-button>
      </template>
    </el-dialog>

    <!-- 添加租户对话框 -->
    <el-dialog v-model="showAddTenantDialog" title="添加租户" width="600px" destroy-on-close @closed="resetTenantForm">
      <el-form :model="tenantForm" label-width="100px">
        <el-form-item label="房屋" required>
          <el-select v-model="tenantForm.house_id" placeholder="选择房屋" style="width: 100%">
            <el-option v-for="h in houses" :key="h.id" :label="h.name" :value="h.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="姓名" required>
          <el-input v-model="tenantForm.name" placeholder="租户姓名" />
        </el-form-item>
        <el-form-item label="电话" required>
          <el-input v-model="tenantForm.phone" placeholder="联系电话" />
        </el-form-item>
        <el-form-item label="入住时间" required>
          <el-date-picker v-model="tenantForm.move_in_date" type="date" value-format="YYYY-MM-DD" placeholder="选择入住时间" style="width: 100%" @change="handleMoveInDateChange" />
        </el-form-item>
        <el-form-item label="租期" required>
          <div class="lease-term-selector">
            <el-radio-group v-model="tenantForm.lease_term" @change="handleLeaseTermChange">
              <el-radio-button :label="6">半年</el-radio-button>
              <el-radio-button :label="12">1年</el-radio-button>
              <el-radio-button :label="36">3年</el-radio-button>
            </el-radio-group>
            <div class="custom-term">
              <span>自定义</span>
              <el-input-number v-model="tenantForm.custom_months" :min="1" :max="120" controls-position="right" @change="handleCustomMonthChange" />
              <span>个月</span>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="到期时间" required>
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
      </el-form>
      <template #footer>
        <el-button @click="showAddTenantDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddTenant">确定</el-button>
      </template>
    </el-dialog>

    <!-- 租户续租对话框 -->
    <el-dialog v-model="showRenewDialog" title="租户续租" width="550px" destroy-on-close @opened="initRenewForm">
      <el-form :model="renewForm" label-width="100px">
        <el-form-item label="房屋" required>
          <el-select v-model="renewForm.house_id" placeholder="选择房屋" style="width: 100%" @change="handleRenewHouseChange">
            <el-option v-for="h in houses" :key="h.id" :label="h.name" :value="h.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="租户" required>
          <el-select v-model="renewForm.tenant_id" placeholder="选择租户" style="width: 100%" :disabled="!renewTenants.length" @change="handleRenewTenantChange">
            <el-option v-for="t in renewTenants" :key="t.id" :label="t.name + ' (' + t.phone + ')'" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="selectedRenewTenant" label="当前信息">
          <div class="current-info">
            <span>原租金：¥{{ selectedRenewTenant.monthly_rent }}/月</span>
            <span>原到期：{{ selectedRenewTenant.lease_end_date }}</span>
          </div>
        </el-form-item>
        <el-form-item label="新租金" required>
          <el-input v-model="renewForm.new_rent" type="number" placeholder="新租金">
            <template #append>元/月</template>
          </el-input>
        </el-form-item>
        <el-form-item label="续期时长">
          <div class="lease-term-selector">
            <el-radio-group v-model="renewForm.renew_type" @change="handleRenewTypeChange">
              <el-radio-button :label="6">半年</el-radio-button>
              <el-radio-button :label="12">1年</el-radio-button>
              <el-radio-button :label="36">3年</el-radio-button>
            </el-radio-group>
            <div class="custom-term">
              <span>自定义</span>
              <el-input-number v-model="renewForm.custom_months" :min="1" :max="120" controls-position="right" @change="handleRenewCustomMonthChange" />
              <span>个月</span>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="新到期日期" required>
          <el-date-picker v-model="renewForm.new_end_date" type="date" value-format="YYYY-MM-DD" placeholder="选择新到期日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="renewForm.remark" type="textarea" placeholder="续租备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRenewDialog = false">取消</el-button>
        <el-button type="primary" @click="handleRenew">确认续租</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getHouses, getYearlyStats, getReminders, createHouse, getTenants, createTenant, updateTenant } from '../api/auth'

const houses = ref([])
const stats = ref({
  houseCount: 0,
  activeTenantCount: 0,
  totalIncome: 0,
  expiringCount: 0
})
const reminders = ref({})
const allTenants = ref([])

// 地址选项列表（从 localStorage 读取）
const addressOptions = ref([])

const showAddHouseDialog = ref(false)
const showAddTenantDialog = ref(false)
const showRenewDialog = ref(false)

const houseForm = reactive({
  name: '',
  address: '',
  rooms: '',
  area: ''
})

const tenantForm = reactive({
  house_id: '',
  name: '',
  phone: '',
  move_in_date: '',
  lease_term: 12,
  custom_months: 12,
  lease_end_date: '',
  monthly_rent: '',
  deposit: ''
})

const renewForm = reactive({
  house_id: '',
  tenant_id: '',
  new_rent: '',
  renew_type: 12,
  custom_months: 12,
  new_end_date: '',
  remark: ''
})

// 根据选择的房屋获取对应的活跃租户列表
const renewTenants = computed(() => {
  if (!renewForm.house_id) return []
  return allTenants.value.filter(t => t.house_id === renewForm.house_id && t.status === 'active')
})

// 当前选中的续租租户信息
const selectedRenewTenant = computed(() => {
  if (!renewForm.tenant_id) return null
  return allTenants.value.find(t => t.id === renewForm.tenant_id) || null
})

function formatMoney(value) {
  return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// 从 localStorage 加载地址选项
function loadAddressOptions() {
  const saved = localStorage.getItem('house_addresses')
  addressOptions.value = saved ? JSON.parse(saved) : []
}

// 保存地址到选项列表
function saveAddress(address) {
  if (!address || addressOptions.value.includes(address)) return
  addressOptions.value.unshift(address)
  // 最多保留20个地址
  if (addressOptions.value.length > 20) {
    addressOptions.value = addressOptions.value.slice(0, 20)
  }
  localStorage.setItem('house_addresses', JSON.stringify(addressOptions.value))
}

// 处理地址选择/创建
function handleAddressChange(value) {
  // 当用户创建新地址时，自动保存
  if (value && !addressOptions.value.includes(value)) {
    saveAddress(value)
  }
}

async function fetchData() {
  try {
    const [housesRes, statsRes, remindersRes, tenantsRes] = await Promise.all([
      getHouses(),
      getYearlyStats(),
      getReminders(30),
      getTenants()
    ])

    houses.value = housesRes.houses
    allTenants.value = tenantsRes.tenants
    stats.value = {
      houseCount: housesRes.houses.length,
      activeTenantCount: statsRes.summary.active_tenant_count,
      totalIncome: statsRes.summary.total_income,
      expiringCount: remindersRes.expiringContracts?.length || 0
    }
    reminders.value = remindersRes
  } catch (err) {
    console.error(err)
  }
}

async function handleAddHouse() {
  if (!houseForm.name) {
    ElMessage.warning('请输入房屋名称')
    return
  }
  if (!houseForm.address) {
    ElMessage.warning('请选择或输入地址')
    return
  }

  try {
    await createHouse(houseForm)
    // 保存地址到选项列表
    saveAddress(houseForm.address)
    ElMessage.success('添加成功')
    showAddHouseDialog.value = false
    Object.assign(houseForm, { name: '', address: '', rooms: '', area: '' })
    fetchData()
  } catch (err) {
    ElMessage.error(err.response?.error || err.response?.data?.error || '添加失败')
  }
}

function openAddTenantDialog() {
  if (houses.value.length === 0) {
    ElMessage.warning('请先添加房屋')
    return
  }
  tenantForm.house_id = houses.value[0].id
  tenantForm.lease_term = 12
  tenantForm.custom_months = 12
  showAddTenantDialog.value = true
}

function resetTenantForm() {
  Object.assign(tenantForm, {
    house_id: '', name: '', phone: '', move_in_date: '',
    lease_term: 12, custom_months: 12, lease_end_date: '', monthly_rent: '', deposit: ''
  })
}

function handleMoveInDateChange() {
  if (tenantForm.move_in_date) {
    calculateLeaseEndDate()
  }
}

function handleLeaseTermChange() {
  if (tenantForm.move_in_date) {
    tenantForm.custom_months = tenantForm.lease_term
    calculateLeaseEndDate()
  }
}

function handleCustomMonthChange() {
  if (tenantForm.move_in_date && tenantForm.custom_months) {
    tenantForm.lease_term = tenantForm.custom_months
    calculateLeaseEndDate()
  }
}

function calculateLeaseEndDate() {
  if (!tenantForm.move_in_date) return

  const months = tenantForm.lease_term || tenantForm.custom_months
  if (!months) return

  const startDate = new Date(tenantForm.move_in_date)
  startDate.setMonth(startDate.getMonth() + months)
  tenantForm.lease_end_date = startDate.toISOString().split('T')[0]
}

async function handleAddTenant() {
  if (!tenantForm.house_id || !tenantForm.name || !tenantForm.phone || !tenantForm.move_in_date || !tenantForm.lease_end_date || !tenantForm.monthly_rent) {
    ElMessage.warning('请填写必填项')
    return
  }

  try {
    await createTenant(tenantForm)
    ElMessage.success('添加成功')
    showAddTenantDialog.value = false
    resetTenantForm()
    fetchData()
  } catch (err) {
    ElMessage.error(err.response?.error || err.response?.data?.error || '添加失败')
  }
}

function openRenewDialog() {
  if (houses.value.length === 0) {
    ElMessage.warning('请先添加房屋')
    return
  }
  if (allTenants.value.filter(t => t.status === 'active').length === 0) {
    ElMessage.warning('暂无活跃租户')
    return
  }
  renewForm.house_id = houses.value[0].id
  showRenewDialog.value = true
}

function handleRenewHouseChange() {
  renewForm.tenant_id = ''
  renewForm.new_rent = ''
  renewForm.new_end_date = ''
}

function handleRenewTenantChange() {
  if (selectedRenewTenant.value) {
    renewForm.new_rent = selectedRenewTenant.value.monthly_rent
    // 默认续期1年
    renewForm.renew_type = 12
    renewForm.custom_months = 12
    handleRenewTypeChange()
  }
}

function handleRenewTypeChange() {
  if (!selectedRenewTenant.value) return
  renewForm.custom_months = renewForm.renew_type
  calculateRenewEndDate()
}

function handleRenewCustomMonthChange() {
  if (selectedRenewTenant.value && renewForm.custom_months) {
    renewForm.renew_type = renewForm.custom_months
    calculateRenewEndDate()
  }
}

function calculateRenewEndDate() {
  if (!selectedRenewTenant.value) return

  const months = renewForm.renew_type || renewForm.custom_months
  if (!months) return

  const endDate = new Date(selectedRenewTenant.value.lease_end_date)
  endDate.setMonth(endDate.getMonth() + months)
  renewForm.new_end_date = endDate.toISOString().split('T')[0]
}

function initRenewForm() {
  if (renewTenants.value.length > 0) {
    const firstTenant = renewTenants.value[0]
    renewForm.tenant_id = firstTenant.id
    renewForm.new_rent = firstTenant.monthly_rent
    // 默认续期1年
    renewForm.renew_type = 12
    renewForm.custom_months = 12
    calculateRenewEndDate()
  }
}

async function handleRenew() {
  if (!renewForm.house_id || !renewForm.tenant_id || !renewForm.new_rent || !renewForm.new_end_date) {
    ElMessage.warning('请填写必填项')
    return
  }

  try {
    const tenant = selectedRenewTenant.value
    await updateTenant(tenant.id, {
      lease_end_date: renewForm.new_end_date,
      monthly_rent: renewForm.new_rent
    })
    ElMessage.success('续租成功')
    showRenewDialog.value = false
    fetchData()
  } catch (err) {
    ElMessage.error(err.response?.error || err.response?.data?.error || '续租失败')
  }
}

onMounted(() => {
  loadAddressOptions()
  fetchData()
})
</script>

<style lang="scss" scoped>
.dashboard {
  .stat-row {
    margin-bottom: 20px;
  }

  .stat-card {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-content {
      .stat-value {
        font-size: 24px;
        font-weight: 600;
        color: #303133;
      }

      .stat-label {
        font-size: 13px;
        color: #909399;
        margin-top: 4px;
      }
    }
  }

  .section-card {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);

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

  .house-list {
    .house-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #ebeef5;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: #f5f7fa;
      }

      &:last-child {
        border-bottom: none;
      }

      .house-name {
        font-size: 14px;
        font-weight: 500;
        color: #303133;
        margin-bottom: 6px;
      }

      .house-meta {
        display: flex;
        align-items: center;
        gap: 12px;

        .tenant-count {
          font-size: 12px;
          color: #909399;
        }
      }

      .house-income {
        text-align: right;

        .label {
          font-size: 12px;
          color: #909399;
          display: block;
        }

        .value {
          font-size: 16px;
          font-weight: 600;
          color: #67c23a;
        }
      }
    }
  }

  .reminder-list {
    .reminder-item {
      display: flex;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #ebeef5;

      &:last-child {
        border-bottom: none;
      }

      .reminder-icon {
        margin-right: 12px;
      }

      .reminder-content {
        flex: 1;

        .reminder-title {
          font-size: 14px;
          color: #303133;
          margin-bottom: 4px;
        }

        .reminder-desc {
          font-size: 12px;
          color: #909399;
        }
      }
    }
  }

  .quick-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .address-selector {
    width: 100%;
  }

  .current-info {
    display: flex;
    gap: 20px;
    font-size: 13px;
    color: #606266;

    span {
      background: #f5f7fa;
      padding: 4px 12px;
      border-radius: 4px;
    }
  }

  .lease-term-selector {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .custom-term {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #606266;

      .el-input-number {
        width: 100px;
      }
    }
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #909399;

  .el-icon {
    font-size: 48px;
    color: #dcdfe6;
    margin-bottom: 12px;
  }

  p {
    margin-bottom: 16px;
  }
}
</style>