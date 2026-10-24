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

export async function getPackages(branchId) {
  return request(`/packages${branchId ? `?branchId=${branchId}` : ''}`)
}

export async function getMyChild() {
  return request('/students/me')
}

export async function getSchedules(branchId) {
  return request(`/schedules${branchId ? `?branchId=${branchId}` : ''}`)
}

// Read-only head_coach list for the schedule "coach" dropdown — usable by
// both admin and head_coach, unlike /admin/users which is admin-only.
export async function getHeadCoaches() {
  return request('/schedules/head-coaches')
}

export async function getMyPayments() {
  return request('/payments/me')
}

export async function getPaymentMethods() {
  return request('/payments/methods')
}

// Actively asks Rintisan whether this payment has been paid yet, instead of
// only waiting for their webhook — used while polling on the payment screen.
export async function syncPayment(id) {
  return request(`/payments/${id}/sync`)
}

export async function createEventPayment(payload) {
  return request('/payments/event', { method: 'POST', body: JSON.stringify(payload) })
}

// Cancels a still-pending payment (parent changed their mind) — deletes it,
// only allowed while status is 'pending'.
export async function cancelPayment(id) {
  return request(`/payments/${id}`, { method: 'DELETE' })
}

// Admin/head coach membatalkan pembayaran parent yang menggantung (pending).
export async function cancelPaymentAsStaff(id) {
  return request(`/payments/${id}/cancel`, { method: 'POST' })
}

// BPJS periode berjalan untuk parent + tambah sendiri ke keranjang.
export async function getMyBpjs() {
  return request('/cart/bpjs/me')
}

export async function addMyBpjs() {
  return request('/cart/bpjs/me', { method: 'POST' })
}

// Keranjang belanja parent: item (perpanjangan paket, BPJS, merchandise) yang
// digabung jadi satu checkout.
export async function getMyCart() {
  return request('/cart/me')
}

export async function getStudentCart(studentId) {
  return request(`/cart/student/${studentId}`)
}

export async function addCartItem(payload) {
  return request('/cart', { method: 'POST', body: JSON.stringify(payload) })
}

export async function deleteCartItem(id) {
  return request(`/cart/${id}`, { method: 'DELETE' })
}

// Ubah item tagihan yang belum dibayar (harga/keterangan). Admin/head_coach.
export async function updateCartItem(id, payload) {
  return request(`/cart/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

// Tandai lunas manual (cash / transfer pribadi) oleh admin/head_coach.
export async function markCartPaid(payload) {
  return request('/cart/mark-paid', { method: 'POST', body: JSON.stringify(payload) })
}

// Semua tagihan yang belum dibayar (belum jadi pendapatan) — panel Keuangan.
export async function getOutstandingCart() {
  return request('/cart/outstanding')
}

export async function checkoutCart(paymentMethod) {
  return request('/cart/checkout', { method: 'POST', body: JSON.stringify({ paymentMethod }) })
}

// Katalog merchandise: admin mengelola (`/products/all`), parent melihat yang
// aktif saja (`/products`).
export async function getProducts() {
  return request('/products')
}

export async function getAllProducts() {
  return request('/products/all')
}

export async function createProduct(payload) {
  return request('/products', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateProduct(id, payload) {
  return request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function getProductNumbers(id) {
  return request(`/products/${id}/numbers`)
}

export async function setBlockedNumbers(id, fieldKey, numbers) {
  return request(`/products/${id}/blocked-numbers`, { method: 'PUT', body: JSON.stringify({ fieldKey, numbers }) })
}

export async function getMerchOrders(filters) {
  return request(`/products/orders/list${buildQuery(filters)}`)
}

export async function setOrderFulfillment(itemId, fulfillment) {
  return request(`/products/orders/${itemId}/fulfillment`, { method: 'PATCH', body: JSON.stringify({ fulfillment }) })
}

export async function deleteProduct(id) {
  return request(`/products/${id}`, { method: 'DELETE' })
}

// Payroll coach (admin) — honor harian x hari hadir (dari absen).
export async function getPayroll(month, year) {
  return request(`/payroll?month=${month}&year=${year}`)
}

export async function setCoachDailyRate(userId, dailyRate, month, year) {
  return request(`/payroll/rate/${userId}`, { method: 'PUT', body: JSON.stringify({ dailyRate, month, year }) })
}

export async function setBulkDailyRate(rates, month, year) {
  return request('/payroll/rate', { method: 'PUT', body: JSON.stringify({ ...rates, month, year }) })
}

export async function generatePayroll(month, year) {
  return request('/payroll/generate', { method: 'POST', body: JSON.stringify({ month, year }) })
}

export async function updatePayroll(id, payload) {
  return request(`/payroll/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function payPayroll(id) {
  return request(`/payroll/${id}/pay`, { method: 'POST' })
}

export async function deletePayroll(id) {
  return request(`/payroll/${id}`, { method: 'DELETE' })
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

export async function resetAllStudentSessions(branchId) {
  return request('/students/sessions/reset-all', {
    method: 'POST',
    body: JSON.stringify({ branchId: branchId || undefined }),
  })
}

export async function renewStudent(id, payload) {
  return request(`/students/${id}/renew`, { method: 'POST', body: JSON.stringify(payload) })
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

export async function getAssessment(studentId, month, year, endMonth, endYear) {
  const end = endMonth && endYear ? `&endMonth=${endMonth}&endYear=${endYear}` : ''
  return request(`/assessments?studentId=${studentId}&month=${month}&year=${year}${end}`)
}

export async function saveAssessment(payload) {
  return request('/assessments', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getMyAssessment(month, year, endMonth, endYear) {
  const qs = month && year ? `?month=${month}&year=${year}${endMonth && endYear ? `&endMonth=${endMonth}&endYear=${endYear}` : ''}` : ''
  return request(`/assessments/me${qs}`)
}

// Unduh invoice PDF sebuah pembayaran lunas (parent: miliknya; admin/head coach: semua).
export async function downloadInvoice(paymentId) {
  const token = getToken()
  const res = await fetch(`${API_URL}/payments/${paymentId}/invoice`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) {
    let message = 'Gagal mengunduh invoice'
    try { message = (await res.json()).error || message } catch {}
    throw new Error(message)
  }
  const blob = await res.blob()
  const match = /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') || '')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = match ? match[1] : 'invoice.pdf'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
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

export async function getReport(studentId, month, year, endMonth, endYear) {
  const end = endMonth && endYear ? `&endMonth=${endMonth}&endYear=${endYear}` : ''
  return request(`/reports?studentId=${studentId}&month=${month}&year=${year}${end}`)
}

export async function generateReport(studentId, month, year, endMonth, endYear) {
  return request('/reports/generate', { method: 'POST', body: JSON.stringify({ studentId, month, year, endMonth, endYear }) })
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

export async function deletePaymentAdmin(id) {
  return request(`/payments/admin/${id}`, { method: 'DELETE' })
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

export async function createPackage(payload) {
  return request('/packages', { method: 'POST', body: JSON.stringify(payload) })
}

export async function deletePackage(id) {
  return request(`/packages/${id}`, { method: 'DELETE' })
}

export async function getSettings() {
  return request('/settings')
}

export async function updateSettings(payload) {
  return request('/settings', { method: 'PUT', body: JSON.stringify(payload) })
}

// Billing BPJS otomatis (nominal global, ditagih bulanan ke semua anak).
export async function getBpjsStatus(month, year) {
  const params = new URLSearchParams()
  if (month) params.set('month', month)
  if (year) params.set('year', year)
  const qs = params.toString()
  return request(`/settings/bpjs/status${qs ? `?${qs}` : ''}`)
}

// Simpan setelan BPJS saja (halaman BPJS admin & head coach).
export async function updateBpjsSettings(payload) {
  return request('/settings/bpjs', { method: 'PUT', body: JSON.stringify(payload) })
}

// Semua anak + status BPJS (dikecualikan / sudah ditagih) untuk periode terpilih.
export async function getBpjsStudents(month, year) {
  const params = new URLSearchParams()
  if (month) params.set('month', month)
  if (year) params.set('year', year)
  return request(`/settings/bpjs/students?${params.toString()}`)
}

// { exemptIds: [...], includeIds: [...] } — kecualikan / tagih lagi.
export async function updateBpjsStudents(payload) {
  return request('/settings/bpjs/students', { method: 'PUT', body: JSON.stringify(payload) })
}

export async function runBpjsBilling(payload = {}) {
  return request('/settings/bpjs/run', { method: 'POST', body: JSON.stringify(payload) })
}

// Penugasan coach ke cabang oleh head coach/admin.
export async function getCoachAssignments() {
  return request('/branches/assignments')
}

export async function updateCoachAssignment(userId, branchIds) {
  return request(`/branches/assignments/${userId}`, { method: 'PUT', body: JSON.stringify({ branchIds }) })
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

// Buat cabang baru hanya dari nama (opsi "ketik manual" di form).
export async function quickCreateBranch(name) {
  return request('/branches/quick', { method: 'POST', body: JSON.stringify({ name }) })
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

export async function checkoutStaff(payload) {
  return request('/staff-attendance/checkout', { method: 'POST', body: JSON.stringify(payload) })
}

export async function approveStaffCheckout(id) {
  return request(`/staff-attendance/${id}/checkout/approve`, { method: 'PUT' })
}

export async function rejectStaffCheckout(id, reason) {
  return request(`/staff-attendance/${id}/checkout/reject`, { method: 'PUT', body: JSON.stringify({ reason }) })
}

export async function getMyStaffAttendance(date) {
  return request(`/staff-attendance/me${date ? `?date=${date}` : ''}`)
}

export async function getTodayEventStaffAttendance() {
  return request('/event-staff-attendance/today')
}

export async function checkinEventStaff(payload) {
  return request('/event-staff-attendance/checkin', { method: 'POST', body: JSON.stringify(payload) })
}

export async function checkoutEventStaff(payload) {
  return request('/event-staff-attendance/checkout', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getEventStaffAttendance(params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null))
  return request(`/event-staff-attendance${query.size ? `?${query}` : ''}`)
}

export async function approveEventStaffAttendance(id) {
  return request(`/event-staff-attendance/${id}/approve`, { method: 'PUT' })
}

export async function rejectEventStaffAttendance(id, reason) {
  return request(`/event-staff-attendance/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) })
}

export async function approveEventStaffCheckout(id) {
  return request(`/event-staff-attendance/${id}/checkout/approve`, { method: 'PUT' })
}

export async function rejectEventStaffCheckout(id, reason) {
  return request(`/event-staff-attendance/${id}/checkout/reject`, { method: 'PUT', body: JSON.stringify({ reason }) })
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

// Rekap kehadiran coach sebulan (menu Absensi Coach).
export async function getCoachAttendanceRecap(month, year, branchId) {
  const params = new URLSearchParams({ month: String(month), year: String(year) })
  if (branchId) params.set('branchId', branchId)
  return request(`/staff-attendance/recap?${params.toString()}`)
}

// Jadwal & jendela waktu absensi coach (menu Absensi Coach > Jadwal & Waktu).
export async function getCoachAttendanceSessions(params = {}) {
  const query = new URLSearchParams()
  if (params.date) query.set('date', params.date)
  if (params.month) query.set('month', params.month)
  if (params.year) query.set('year', params.year)
  if (params.branchId) query.set('branchId', params.branchId)
  if (params.type) query.set('type', params.type)
  if (params.status) query.set('status', params.status)
  return request(`/coach-attendance-sessions${query.size ? `?${query}` : ''}`)
}

export async function getCoachAttendanceSessionSources(date) {
  return request(`/coach-attendance-sessions/sources?date=${date}`)
}

export async function getCoachAttendanceCoaches(branchId) {
  return request(`/coach-attendance-sessions/coaches${branchId ? `?branchId=${branchId}` : ''}`)
}

export async function getTodayCoachSessions() {
  return request('/coach-attendance-sessions/today')
}

export async function createCoachAttendanceSession(payload) {
  return request('/coach-attendance-sessions', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateCoachAttendanceSession(id, payload) {
  return request(`/coach-attendance-sessions/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function deleteCoachAttendanceSession(id) {
  return request(`/coach-attendance-sessions/${id}`, { method: 'DELETE' })
}

export async function generateCoachAttendanceSessions(month, year) {
  return request('/coach-attendance-sessions/generate', { method: 'POST', body: JSON.stringify({ month, year }) })
}

// Atur jam absen untuk semua jadwal pada bulan/cabang terpilih sekaligus.
export async function setCoachAttendanceSessionWindow(payload) {
  return request('/coach-attendance-sessions/window', { method: 'PUT', body: JSON.stringify(payload) })
}

// Atur coach bertugas untuk semua event/tournament pada bulan/cabang terpilih.
export async function setCoachAttendanceSessionCoaches(payload) {
  return request('/coach-attendance-sessions/coaches', { method: 'PUT', body: JSON.stringify(payload) })
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

// Lampirkan bukti pembayaran (foto/screenshot) ke satu pembayaran. Bukti wajib
// ada supaya pembayaran dihitung di laporan keuangan.
export async function uploadPaymentProof(id, proofUrl, proofNote) {
  return request(`/payments/${id}/proof`, { method: 'POST', body: JSON.stringify({ proofUrl, proofNote }) })
}

// Pantau tagihan parent yang belum lunas (admin & head coach).
export async function getUnpaidParents(filters) {
  return request(`/billing/unpaid${buildQuery(filters)}`)
}

export async function deleteUnpaidItems(itemIds) {
  return request('/billing/delete', { method: 'POST', body: JSON.stringify({ itemIds }) })
}

export async function logPaymentReminder(studentIds, amount) {
  return request('/billing/remind', { method: 'POST', body: JSON.stringify({ studentIds, amount }) })
}

export async function confirmPaymentWithoutProof(id) {
  return request(`/payments/${id}/confirm-no-proof`, { method: 'POST' })
}

// Daftar pembayaran lunas yang belum ada bukti (admin & head coach).
export async function getMissingProof(filters) {
  return request(`/ledger/belum-bukti${buildQuery(filters)}`)
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

export async function updateStudentPackagePeriod(id, payload) {
  return request(`/students/${id}/package-period`, { method: 'PUT', body: JSON.stringify(payload) })
}
