import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default request

// Auth APIs
export const login = (phone, password) => request.post('/auth/login', { phone, password })
export const register = (phone, password) => request.post('/auth/register', { phone, password })
export const getUserInfo = () => request.get('/auth/me')

// House APIs
export const getHouses = () => request.get('/houses')
export const getHouse = (id) => request.get(`/houses/${id}`)
export const createHouse = (data) => request.post('/houses', data)
export const updateHouse = (id, data) => request.put(`/houses/${id}`, data)
export const deleteHouse = (id) => request.delete(`/houses/${id}`)

// Tenant APIs
export const getTenants = (params) => request.get('/tenants', { params })
export const getTenant = (id) => request.get(`/tenants/${id}`)
export const createTenant = (data) => request.post('/tenants', data)
export const updateTenant = (id, data) => request.put(`/tenants/${id}`, data)
export const moveOutTenant = (id, data) => request.post(`/tenants/${id}/move-out`, data)
export const deleteTenant = (id) => request.delete(`/tenants/${id}`)

// Contract APIs
export const getContracts = (params) => request.get('/contracts', { params })
export const getContract = (id) => request.get(`/contracts/${id}`)
export const createContract = (data) => request.post('/contracts', data)
export const updateContract = (id, data) => request.put(`/contracts/${id}`, data)
export const deleteContract = (id) => request.delete(`/contracts/${id}`)
export const getExpiringContracts = (days) => request.get('/contracts/expiring/soon', { params: { days } })

// Bill APIs
export const getBills = (params) => request.get('/bills', { params })
export const getBill = (id) => request.get(`/bills/${id}`)
export const createBill = (data) => request.post('/bills', data)
export const updateBill = (id, data) => request.put(`/bills/${id}`, data)
export const payBill = (id, data) => request.post(`/bills/${id}/pay`, data)
export const deleteBill = (id) => request.delete(`/bills/${id}`)

// Meter APIs
export const getMeterReadings = (params) => request.get('/meters', { params })
export const getLatestMeter = (houseId, type) => request.get(`/meters/latest/${houseId}/${type}`)
export const createMeterReading = (data) => request.post('/meters', data)
export const deleteMeterReading = (id) => request.delete(`/meters/${id}`)

// Payment APIs
export const getPayments = (params) => request.get('/payments', { params })
export const createPayment = (data) => request.post('/payments', data)
export const deletePayment = (id) => request.delete(`/payments/${id}`)

// Stats APIs
export const getYearlyStats = (year) => request.get('/stats/yearly', { params: { year } })
export const getHouseSummary = () => request.get('/stats/houses/summary')
export const getReminders = (days) => request.get('/stats/reminders', { params: { days } })
export const getExpenseStats = (params) => request.get('/stats/expenses', { params })