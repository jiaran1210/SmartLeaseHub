<template>
  <div class="houses-page">
    <div class="page-header">
      <div class="header-left">
        <h2>房屋管理</h2>
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          新增房屋
        </el-button>
      </div>
      <el-button @click="showAddressDialog = true">
        <el-icon><Location /></el-icon>
        管理地址
      </el-button>
    </div>

    <div v-if="houses.length === 0" class="empty-state">
      <el-icon size="64"><House /></el-icon>
      <p>暂无房屋，点击下方按钮添加</p>
      <el-button type="primary" @click="showAddDialog = true">添加房屋</el-button>
    </div>

    <div v-else class="card-list">
      <div v-for="house in houses" :key="house.id" class="house-card" @click="$router.push(`/houses/${house.id}`)">
        <div class="card-header">
          <div class="house-name">{{ house.name }}</div>
          <el-tag :type="house.status === '出租中' ? 'success' : 'info'" size="small">
            {{ house.status }}
          </el-tag>
        </div>

        <div class="card-body">
          <div class="info-row">
            <span class="label">地址</span>
            <span class="value">{{ house.address || '未填写' }}</span>
          </div>
          <div class="info-row">
            <span class="label">户型</span>
            <span class="value">{{ house.rooms || '未填写' }}</span>
          </div>
          <div class="info-row">
            <span class="label">租户</span>
            <span class="value">{{ house.tenant_count }} 人</span>
          </div>
          <div class="info-row">
            <span class="label">总收入</span>
            <span class="value income">¥{{ formatMoney(house.total_income) }}</span>
          </div>
        </div>

        <div class="card-footer">
          <el-button type="primary" link @click.stop="handleEdit(house)">编辑</el-button>
          <el-button type="danger" link @click.stop="handleDelete(house)">删除</el-button>
        </div>
      </div>
    </div>

    <!-- 添加/编辑对话框 -->
    <el-dialog v-model="showAddDialog" :title="editingHouse ? '编辑房屋' : '新增房屋'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="房屋名称" required>
          <el-input v-model="form.name" placeholder="如：阳光花园A栋301" />
        </el-form-item>
        <el-form-item label="地址" required>
          <el-select v-model="form.address" placeholder="选择或输入地址" style="width: 100%" allow-create filterable @change="handleAddressChange">
            <el-option v-for="addr in addressOptions" :key="addr" :label="addr" :value="addr" />
          </el-select>
        </el-form-item>
        <el-form-item label="户型">
          <el-input v-model="form.rooms" placeholder="如：2室1厅" />
        </el-form-item>
        <el-form-item label="面积">
          <el-input v-model="form.area" type="number" placeholder="建筑面积">
            <template #append>㎡</template>
          </el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option label="空置中" value="空置中" />
            <el-option label="出租中" value="出租中" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 管理地址对话框 -->
    <el-dialog v-model="showAddressDialog" title="管理地址" width="500px">
      <div class="address-manager">
        <div class="add-address">
          <el-input v-model="newAddress" placeholder="输入新地址" @keyup.enter="addAddress">
            <template #append>
              <el-button @click="addAddress" :disabled="!newAddress.trim()">添加</el-button>
            </template>
          </el-input>
        </div>
        <div class="address-list" v-if="addressOptions.length > 0">
          <div v-for="(addr, index) in addressOptions" :key="addr" class="address-item">
            <span>{{ addr }}</span>
            <el-button type="danger" link size="small" @click="removeAddress(index)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
        <el-empty v-else description="暂无地址，请添加" :image-size="60" />
      </div>
      <template #footer>
        <el-button @click="showAddressDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getHouses, createHouse, updateHouse, deleteHouse } from '../api/auth'

const houses = ref([])
const showAddDialog = ref(false)
const showAddressDialog = ref(false)
const editingHouse = ref(null)
const newAddress = ref('')

// 地址选项列表
const addressOptions = ref([])

const form = reactive({
  name: '',
  address: '',
  rooms: '',
  area: '',
  status: '空置中'
})

function formatMoney(value) {
  return Number(value || 0).toLocaleString('zh-CN')
}

// 从 localStorage 加载地址
function loadAddressOptions() {
  const saved = localStorage.getItem('house_addresses')
  addressOptions.value = saved ? JSON.parse(saved) : []
}

// 保存地址到 localStorage
function saveAddressOptions() {
  localStorage.setItem('house_addresses', JSON.stringify(addressOptions.value))
}

// 添加地址
function addAddress() {
  const addr = newAddress.value.trim()
  if (!addr) return
  if (addressOptions.value.includes(addr)) {
    ElMessage.warning('地址已存在')
    return
  }
  addressOptions.value.unshift(addr)
  if (addressOptions.value.length > 20) {
    addressOptions.value = addressOptions.value.slice(0, 20)
  }
  saveAddressOptions()
  newAddress.value = ''
  ElMessage.success('添加成功')
}

// 删除地址
function removeAddress(index) {
  addressOptions.value.splice(index, 1)
  saveAddressOptions()
  ElMessage.success('删除成功')
}

// 处理地址选择/创建
function handleAddressChange(value) {
  if (value && !addressOptions.value.includes(value)) {
    addressOptions.value.unshift(value)
    if (addressOptions.value.length > 20) {
      addressOptions.value = addressOptions.value.slice(0, 20)
    }
    saveAddressOptions()
  }
}

async function fetchHouses() {
  try {
    const res = await getHouses()
    houses.value = res.houses
  } catch (err) {
    console.error(err)
    ElMessage.error('获取房屋列表失败')
  }
}

function handleEdit(house) {
  editingHouse.value = house
  Object.assign(form, {
    name: house.name,
    address: house.address || '',
    rooms: house.rooms || '',
    area: house.area || '',
    status: house.status
  })
  showAddDialog.value = true
}

function closeDialog() {
  showAddDialog.value = false
  editingHouse.value = null
  Object.assign(form, { name: '', address: '', rooms: '', area: '', status: '空置中' })
}

async function handleSubmit() {
  if (!form.name) {
    ElMessage.warning('请输入房屋名称')
    return
  }
  if (!form.address) {
    ElMessage.warning('请选择或输入地址')
    return
  }

  try {
    if (editingHouse.value) {
      await updateHouse(editingHouse.value.id, form)
      ElMessage.success('更新成功')
    } else {
      await createHouse(form)
      // 保存新地址
      if (!addressOptions.value.includes(form.address)) {
        addressOptions.value.unshift(form.address)
        if (addressOptions.value.length > 20) {
          addressOptions.value = addressOptions.value.slice(0, 20)
        }
        saveAddressOptions()
      }
      ElMessage.success('添加成功')
    }
    closeDialog()
    fetchHouses()
  } catch (err) {
    ElMessage.error(err.response?.error || err.response?.data?.error || '操作失败')
  }
}

async function handleDelete(house) {
  try {
    await import('element-plus').then(({ ElMessageBox }) => {
      ElMessageBox.confirm('确定要删除该房屋吗？删除后无法恢复。', '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        await deleteHouse(house.id)
        ElMessage.success('删除成功')
        fetchHouses()
      }).catch(() => {})
    })
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.error || err.response?.data?.error || '删除失败')
    }
  }
}

onMounted(() => {
  loadAddressOptions()
  fetchHouses()
})
</script>

<style lang="scss" scoped>
.houses-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;

      h2 {
        font-size: 18px;
        font-weight: 600;
        color: #303133;
        margin: 0;
      }
    }
  }

  .house-card {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      .house-name {
        font-size: 18px;
        font-weight: 600;
        color: #303133;
      }
    }

    .card-body {
      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #f0f2f5;

        &:last-child {
          border-bottom: none;
        }

        .label {
          color: #909399;
          font-size: 14px;
        }

        .value {
          color: #303133;
          font-size: 14px;

          &.income {
            color: #67c23a;
            font-weight: 600;
          }
        }
      }
    }

    .card-footer {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #f0f2f5;
      display: flex;
      gap: 12px;
    }
  }

  .address-manager {
    .add-address {
      margin-bottom: 20px;
    }

    .address-list {
      max-height: 300px;
      overflow-y: auto;

      .address-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: #f5f7fa;
        border-radius: 4px;
        margin-bottom: 8px;

        span {
          flex: 1;
          color: #303133;
          font-size: 14px;
        }
      }
    }
  }
}
</style>