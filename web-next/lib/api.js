// In production, NEXT_PUBLIC_API_URL is set to a relative "/api" so requests
// go through Nginx on the same origin (same HTTP/HTTPS scheme, no exposed
// backend port). Falls back to the old direct-port behavior for local dev.
const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined'
  ? `http://${window.location.hostname}:3002/api`
  : 'http://localhost:3002/api')

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

// No account/token is created here anymore — registration only creates a
// PendingRegistration + Rintisan billing link. The real account (and login)
// only exist once the payment webhook confirms success.
export async function register(payload) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getPendingRegistration(id) {
  return request(`/auth/pending-registration/${id}`)
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

export async function getPaymentMethods() {
  return request('/payments/methods')
}

export async function createRenewalPayment(payload) {
  return request('/payments/renewal', { method: 'POST', body: JSON.stringify(payload) })
}

// Actively asks Rintisan whether this payment has been paid yet, instead of
// only waiting for their webhook — used while polling on the payment screen.
export async function syncPayment(id) {
  return request(`/payments/${id}/sync`)
}

export async function createEventPayment(payload) {
  return request('/payments/event', { method: 'POST', body: JSON.stringify(payload) })
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

export async function getAttendanceSummary() {
  return request('/attendance/summary')
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

export async function getMyAssessment(month, year) {
  const qs = month && year ? `?month=${month}&year=${year}` : ''
  return request(`/assessments/me${qs}`)
}

export async function getMyChildQrCodeUrl() {
  const token = getToken()
  const res = await fetch(`${API_URL}/students/me/qrcode.png`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) throw new Error('Gagal memuat QR code')
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

// Used by admin/head_coach to show or download any student's QR card.
export async function getStudentQrCodeUrl(id) {
  const token = getToken()
  const res = await fetch(`${API_URL}/students/${id}/qrcode.png`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
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

export async function createStudent(payload) {
  return request('/students', { method: 'POST', body: JSON.stringify(payload) })
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

export async function checkinStaff(payload) {
  return request('/staff-attendance/checkin', { method: 'POST', body: JSON.stringify(payload) })
}

export async function approveStaffAttendance(id) {
  return request(`/staff-attendance/${id}/approve`, { method: 'PUT' })
}

export async function rejectStaffAttendance(id, reason) {
  return request(`/staff-attendance/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) })
}

export async function getMyStaffAttendance(date) {
  return request(`/staff-attendance/me${date ? `?date=${date}` : ''}`)
}

export async function getStaffAttendance(filters = {}) {
  const { date, month, year, role, branchId } = filters
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (month) params.set('month', month)
  if (year) params.set('year', year)
  if (role) params.set('role', role)
  if (branchId) params.set('branchId', branchId)
  return request(`/staff-attendance?${params.toString()}`)
}

export async function getEvents(ageGroup, branchId, status) {
  const params = new URLSearchParams()
  if (ageGroup) params.set('ageGroup', ageGroup)
  if (branchId) params.set('branchId', branchId)
  if (status) params.set('status', status)
  const qs = params.toString()
  return request(`/events${qs ? `?${qs}` : ''}`)
}

export async function getEvent(id) {
  return request(`/events/${id}`)
}

export async function createEvent(payload) {
  return request('/events', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateEvent(id, payload) {
  return request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function deleteEvent(id) {
  return request(`/events/${id}`, { method: 'DELETE' })
}

export async function addEventParticipant(eventId, studentId) {
  return request(`/events/${eventId}/participants`, { method: 'POST', body: JSON.stringify({ studentId }) })
}

export async function removeEventParticipant(eventId, studentId) {
  return request(`/events/${eventId}/participants/${studentId}`, { method: 'DELETE' })
}

export async function updateEventParticipant(eventId, studentId, payload) {
  return request(`/events/${eventId}/participants/${studentId}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function getMyEvents() {
  return request('/events/me')
}

export async function requestPasswordReset(email) {
  return request('/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) })
}

export async function getPasswordResetRequests() {
  return request('/password-reset')
}

export async function approvePasswordReset(id) {
  return request(`/password-reset/${id}/approve`, { method: 'PUT' })
}

export async function rejectPasswordReset(id) {
  return request(`/password-reset/${id}/reject`, { method: 'PUT' })
}

export async function resetPassword(token, password) {
  return request('/password-reset/reset', { method: 'POST', body: JSON.stringify({ token, password }) })
}

export async function checkResetToken(token) {
  return request(`/password-reset/check?token=${token}`)
}

export async function getBranchPackages(branchId) {
  return request(`/branch-packages/public${branchId ? `?branchId=${branchId}` : ''}`)
}

export async function getAllBranchPackages() {
  return request('/branch-packages')
}

export async function updateBranchPackage(id, price) {
  return request(`/branch-packages/${id}`, { method: 'PUT', body: JSON.stringify({ price }) })
}

export async function createBranchPackage(data) {
  return request('/branch-packages', { method: 'POST', body: JSON.stringify(data) })
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


function buildQuery(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params.set(k, v) })
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export async function getPemasukan(filters) {
  return request(`/ledger/pemasukan${buildQuery(filters)}`)
}

export async function getPengeluaran(filters) {
  return request(`/ledger/pengeluaran${buildQuery(filters)}`)
}

export async function getLaba(filters) {
  return request(`/ledger/laba${buildQuery(filters)}`)
}

export async function createLedgerEntry(payload) {
  return request('/ledger', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateLedgerEntry(id, payload) {
  return request(`/ledger/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function deleteLedgerEntry(id) {
  return request(`/ledger/${id}`, { method: 'DELETE' })
}

export async function getLedgerTrend(filters) {
  return request(`/ledger/trend${buildQuery(filters)}`)
}
