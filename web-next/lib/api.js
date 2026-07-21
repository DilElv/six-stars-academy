const API_URL = typeof window !== 'undefined'
  ? `http://${window.location.hostname}:3002/api`
  : 'http://localhost:3002/api'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ssb_next_token')
}

function setToken(token) {
  localStorage.setItem('ssb_next_token', token)
}

function clearToken() {
  localStorage.removeItem('ssb_next_token')
}

async function request(endpoint, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers })
  const data = await res.json()

  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setToken(data.token)
  return data.profile
}

export async function getMe() {
  return request('/auth/me')
}

export function logout() {
  clearToken()
}

export async function register(payload) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  setToken(data.token)
  return data
}

export async function getCmsContent() {
  return request('/cms/public')
}

export async function getCmsSection(section) {
  const res = await request(`/cms/public/${section}`)
  return res.data
}

export async function updateCmsSection(section, data) {
  return request(`/cms/${section}`, { method: 'PUT', body: JSON.stringify({ data }) })
}

export async function getPackages() {
  return request('/packages')
}

export async function getMyChild() {
  return request('/students/me')
}

export async function getSchedules(ageGroup, branchId) {
  const params = new URLSearchParams()
  if (ageGroup) params.set('ageGroup', ageGroup)
  if (branchId) params.set('branchId', branchId)
  const qs = params.toString()
  return request(`/schedules${qs ? `?${qs}` : ''}`)
}

export async function getMyPayments() {
  return request('/payments/me')
}

export async function getMyReports() {
  return request('/reports/me')
}

export async function updateMe(payload) {
  return request('/auth/me', { method: 'PUT', body: JSON.stringify(payload) })
}

export async function getStudents(ageGroup, branchId) {
  const params = new URLSearchParams()
  if (ageGroup) params.set('ageGroup', ageGroup)
  if (branchId) params.set('branchId', branchId)
  const qs = params.toString()
  return request(`/students${qs ? `?${qs}` : ''}`)
}

export async function getAttendance(date, ageGroup, branchId) {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (ageGroup) params.set('ageGroup', ageGroup)
  if (branchId) params.set('branchId', branchId)
  return request(`/attendance?${params.toString()}`)
}

export async function getMyAttendance() {
  return request('/attendance/me')
}

export async function submitAttendance(date, records) {
  return request('/attendance', { method: 'POST', body: JSON.stringify({ date, records }) })
}

export async function getTrainingSessions(ageGroup, branchId) {
  const params = new URLSearchParams()
  if (ageGroup) params.set('ageGroup', ageGroup)
  if (branchId) params.set('branchId', branchId)
  const qs = params.toString()
  return request(`/training-sessions${qs ? `?${qs}` : ''}`)
}

export async function createTrainingSession(payload) {
  return request('/training-sessions', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateTrainingSession(id, payload) {
  return request(`/training-sessions/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function deleteTrainingSession(id) {
  return request(`/training-sessions/${id}`, { method: 'DELETE' })
}

export async function getStudent(id) {
  return request(`/students/${id}`)
}

export async function updateStudent(id, payload) {
  return request(`/students/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function getMyNotifications() {
  return request('/notifications/me')
}

export async function markNotificationRead(id) {
  return request(`/notifications/${id}/read`, { method: 'PUT' })
}

export async function markAllNotificationsRead() {
  return request('/notifications/read-all', { method: 'PUT' })
}

export async function getAssessment(studentId, month, year) {
  return request(`/assessments?studentId=${studentId}&month=${month}&year=${year}`)
}

export async function saveAssessment(payload) {
  return request('/assessments', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getMyChildQrCodeUrl() {
  const token = getToken()
  const res = await fetch(`${API_URL}/students/me/qrcode.png`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) throw new Error('Gagal memuat QR code')
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export async function scanAttendance(qrCode) {
  return request('/attendance/scan', { method: 'POST', body: JSON.stringify({ qrCode }) })
}

export async function getReport(studentId, month, year) {
  return request(`/reports?studentId=${studentId}&month=${month}&year=${year}`)
}

export async function generateReport(studentId, month, year) {
  return request('/reports/generate', { method: 'POST', body: JSON.stringify({ studentId, month, year }) })
}

export async function deleteStudent(id) {
  return request(`/students/${id}`, { method: 'DELETE' })
}

export async function getRevenueTrend() {
  return request('/admin/revenue-trend')
}

export async function getAdminStats() {
  return request('/admin/stats')
}

export async function getUsers(role, branchId) {
  const params = new URLSearchParams()
  if (role) params.set('role', role)
  if (branchId) params.set('branchId', branchId)
  const qs = params.toString()
  return request(`/admin/users${qs ? `?${qs}` : ''}`)
}

export async function createUser(payload) {
  return request('/admin/users', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateUser(id, payload) {
  return request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function deleteUser(id) {
  return request(`/admin/users/${id}`, { method: 'DELETE' })
}

export async function getAllPayments(status) {
  return request(`/payments${status ? `?status=${status}` : ''}`)
}

export async function updatePayment(id, payload) {
  return request(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function createSchedule(payload) {
  return request('/schedules', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateSchedule(id, payload) {
  return request(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function deleteSchedule(id) {
  return request(`/schedules/${id}`, { method: 'DELETE' })
}

export async function getAllPackages() {
  return request('/packages/all')
}

export async function updatePackage(id, payload) {
  return request(`/packages/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function getSettings() {
  return request('/settings')
}

export async function updateSettings(payload) {
  return request('/settings', { method: 'PUT', body: JSON.stringify(payload) })
}

export async function getFields(branchId) {
  return request(`/fields${branchId ? `?branchId=${branchId}` : ''}`)
}

export async function getBranches() {
  return request('/branches')
}

export async function createBranch(payload) {
  return request('/branches', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateBranch(id, payload) {
  return request(`/branches/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function deleteBranch(id) {
  return request(`/branches/${id}`, { method: 'DELETE' })
}

export async function checkinStaff() {
  return request('/staff-attendance/checkin', { method: 'POST' })
}

export async function getMyStaffAttendance(date) {
  return request(`/staff-attendance/me${date ? `?date=${date}` : ''}`)
}

export async function getStaffAttendance(date, branchId) {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (branchId) params.set('branchId', branchId)
  return request(`/staff-attendance?${params.toString()}`)
}

export async function uploadFile(file) {
  const token = getToken()
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Upload failed')
  return data.url
}
