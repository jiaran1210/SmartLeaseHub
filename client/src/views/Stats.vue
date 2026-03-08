<template>
  <div class="stats-page">
    <div class="page-header">
      <h2>统计分析</h2>
      <el-select v-model="selectedYear" style="width: 120px" @change="fetchData">
        <el-option v-for="y in years" :key="y" :label="`${y}年`" :value="y" />
      </el-select>
    </div>

    <!-- 汇总统计 -->
    <el-row :gutter="20" class="stat-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-value">{{ summary.house_count }}</div>
          <div class="stat-label">房屋数量</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-value">{{ summary.active_tenant_count }}</div>
          <div class="stat-label">活跃租户</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-value income">¥{{ formatMoney(summary.total_income) }}</div>
          <div class="stat-label">年度总收入</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-value">¥{{ formatMoney(avgIncome) }}</div>
          <div class="stat-label">月均收入</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <!-- 月度趋势图 -->
      <el-col :xs="24" :lg="14">
        <div class="chart-container">
          <div class="chart-title">月度收入趋势</div>
          <div ref="trendChartRef" style="height: 300px;"></div>
        </div>
      </el-col>

      <!-- 房屋收入占比 -->
      <el-col :xs="24" :lg="10">
        <div class="chart-container">
          <div class="chart-title">房屋收入分布</div>
          <div ref="pieChartRef" style="height: 300px;"></div>
        </div>
      </el-col>
    </el-row>

    <!-- 房屋收入明细 -->
    <div class="chart-container">
      <div class="chart-title">房屋收入明细</div>
      <el-table :data="houseStats" stripe style="width: 100%">
        <el-table-column prop="house_name" label="房屋名称" />
        <el-table-column prop="total_income" label="年度收入" width="150">
          <template #default="{ row }">
            <span class="income">¥{{ formatMoney(row.total_income) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="占比" width="150">
          <template #default="{ row }">
            <el-progress :percentage="getPercentage(row.total_income)" :stroke-width="10" />
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import * as echarts from 'echarts'
import { getYearlyStats } from '../api/auth'

const selectedYear = ref(new Date().getFullYear())
const years = computed(() => {
  const current = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => current - i)
})

const summary = ref({ house_count: 0, active_tenant_count: 0, total_income: 0 })
const houseStats = ref([])
const monthlyTrend = ref([])

const trendChartRef = ref(null)
const pieChartRef = ref(null)
let trendChart = null
let pieChart = null

const avgIncome = computed(() => {
  return summary.value.total_income / 12
})

function formatMoney(value) {
  return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function getPercentage(value) {
  const total = houseStats.value.reduce((sum, h) => sum + Number(h.total_income), 0)
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

function initCharts() {
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
  }
  if (pieChartRef.value) {
    pieChart = echarts.init(pieChartRef.value)
  }
}

function updateCharts() {
  // 月度趋势图
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const data = Array(12).fill(0)
  monthlyTrend.value.forEach(item => {
    data[parseInt(item.month) - 1] = Number(item.income)
  })

  trendChart?.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value' },
    series: [{
      data: data,
      type: 'line',
      smooth: true,
      areaStyle: { opacity: 0.3 },
      itemStyle: { color: '#409eff' }
    }]
  })

  // 房屋收入饼图
  pieChart?.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: { show: false },
      data: houseStats.value.map(h => ({
        name: h.house_name,
        value: h.total_income
      })).filter(h => h.value > 0)
    }]
  })
}

async function fetchData() {
  try {
    const res = await getYearlyStats(selectedYear.value)
    summary.value = res.summary
    houseStats.value = res.houseStats
    monthlyTrend.value = res.monthlyTrend
    updateCharts()
  } catch (err) {
    console.error(err)
  }
}

onMounted(() => {
  initCharts()
  fetchData()
  window.addEventListener('resize', () => {
    trendChart?.resize()
    pieChart?.resize()
  })
})
</script>

<style lang="scss" scoped>
.stats-page {
  .stat-row {
    margin-bottom: 20px;
  }

  .stat-card {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);

    .stat-value {
      font-size: 28px;
      font-weight: 600;
      color: #303133;

      &.income {
        color: #67c23a;
      }
    }

    .stat-label {
      font-size: 14px;
      color: #909399;
      margin-top: 8px;
    }
  }

  .chart-container {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);

    .chart-title {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
      margin-bottom: 16px;
    }
  }

  .income {
    color: #67c23a;
    font-weight: 600;
  }
}
</style>