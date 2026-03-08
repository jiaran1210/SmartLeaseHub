<template>
  <div class="meters-page">
    <div class="page-header">
      <h2>水电煤读数</h2>
      <el-button type="primary" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon>
        记录读数
      </el-button>
    </div>

    <div class="filter-bar">
      <el-select v-model="filterHouse" placeholder="房屋筛选" clearable style="width: 200px">
        <el-option v-for="h in houses" :key="h.id" :label="h.name" :value="h.id" />
      </el-select>
      <el-select v-model="filterType" placeholder="类型筛选" clearable style="width: 120px; margin-left: 12px">
        <el-option label="水" value="水" />
        <el-option label="电" value="电" />
        <el-option label="燃气" value="燃气" />
      </el-select>
    </div>

    <div v-if="filteredReadings.length === 0" class="empty-state">
      <el-icon size="64"><Odometer /></el-icon>
      <p>暂无读数记录</p>
    </div>

    <el-table v-else :data="filteredReadings" stripe style="width: 100%">
      <el-table-column prop="reading_date" label="记录日期" width="120" />
      <el-table-column prop="house_name" label="房屋" min-width="150" />
      <el-table-column prop="type" label="类型" width="80">
        <template #default="{ row }">
          <el-tag :type="getTypeTag(row.type)" size="small">{{ row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="reading" label="表盘读数" width="100">
        <template #default="{ row }">
          {{ row.reading }}
        </template>
      </el-table-column>
      <el-table-column prop="usage" label="本期用量" width="100">
        <template #default="{ row }">
          {{ row.usage || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="cost" label="费用" width="100">
        <template #default="{ row }">
          {{ row.cost ? `¥${row.cost}` : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增读数对话框 -->
    <el-dialog v-model="showAddDialog" title="记录读数" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="房屋" required>
          <el-select v-model="form.house_id" placeholder="选择房屋" style="width: 100%" @change="handleHouseChange">
            <el-option v-for="h in houses" :key="h.id" :label="h.name" :value="h.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" required>
          <el-radio-group v-model="form.type">
            <el-radio-button label="水">水</el-radio-button>
            <el-radio-button label="电">电</el-radio-button>
            <el-radio-button label="燃气">燃气</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="上期读数">
          <span>{{ lastReading || '暂无记录' }}</span>
        </el-form-item>
        <el-form-item label="本期读数" required>
          <el-input v-model="form.reading" type="number" placeholder="请输入表盘读数" />
        </el-form-item>
        <el-form-item label="记录日期" required>
          <el-date-picker v-model="form.reading_date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="费用">
          <el-input v-model="form.cost" type="number" placeholder="费用（可选）">
            <template #append>元</template>
          </el-input>
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
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMeterReadings, getLatestMeter, createMeterReading, deleteMeterReading, getHouses } from '../api/auth'

const readings = ref([])
const houses = ref([])
const filterHouse = ref('')
const filterType = ref('')
const showAddDialog = ref(false)
const lastReading = ref(null)

const form = reactive({
  house_id: '',
  type: '水',
  reading: '',
  reading_date: new Date().toISOString().split('T')[0],
  cost: ''
})

const filteredReadings = computed(() => {
  return readings.value.filter(r => {
    if (filterHouse.value && r.house_id !== filterHouse.value) return false
    if (filterType.value && r.type !== filterType.value) return false
    return true
  })
})

function getTypeTag(type) {
  const map = { '水': 'primary', '电': 'warning', '燃气': 'info' }
  return map[type] || ''
}

async function fetchData() {
  try {
    const [readingsRes, housesRes] = await Promise.all([
      getMeterReadings(),
      getHouses()
    ])
    readings.value = readingsRes.readings
    houses.value = housesRes.houses
  } catch (err) {
    console.error(err)
  }
}

async function handleHouseChange() {
  if (!form.house_id || !form.type) return
  try {
    const res = await getLatestMeter(form.house_id, form.type)
    lastReading.value = res.reading?.reading || null
  } catch (err) {
    lastReading.value = null
  }
}

watch(() => form.type, () => {
  if (form.house_id) handleHouseChange()
})

async function handleAdd() {
  if (!form.house_id || !form.reading) {
    ElMessage.warning('请填写必填项')
    return
  }

  try {
    await createMeterReading(form)
    ElMessage.success('添加成功')
    showAddDialog.value = false
    Object.assign(form, { house_id: '', type: '水', reading: '', reading_date: new Date().toISOString().split('T')[0], cost: '' })
    lastReading.value = null
    fetchData()
  } catch (err) {
    ElMessage.error(err.response?.error || err.response?.data?.error || '添加失败')
  }
}

async function handleDelete(reading) {
  try {
    await ElMessageBox.confirm('确定要删除该记录吗？', '确认删除', { type: 'warning' })
    await deleteMeterReading(reading.id)
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
.meters-page {
  .filter-bar {
    margin-bottom: 16px;
  }
}
</style>