const API_URL = 'http://localhost:3001/api'

function getToken() {
  return localStorage.getItem('ssb_token')
}

function setToken(token) {
  localStorage.setItem('ssb_token', token)
}

function clearToken() {
  localStorage.removeItem('ssb_token')
  localStorage.removeItem('ssb_coach_session')
  localStorage.removeItem('ssb_parent_session')
  localStorage.removeItem('ssb_admin_session')
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

export async function register(email, password, name, role = 'parent', childData = {}) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, role, ...childData }),
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

// -- Students --
export async function getStudents() {
  return request('/students')
}

export async function getStudent(id) {
  return request(`/students/${id}`)
}

export async function lookupStudent(code) {
  return request(`/students/lookup/${encodeURIComponent(code)}`)
}

export async function createStudent(data) {
  return request('/students', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateStudent(id, data) {
  return request(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteStudent(id) {
  return request(`/students/${id}`, { method: 'DELETE' })
}

// -- Metrics --
export async function getMetrics(studentId) {
  return request(`/metrics/student/${studentId}`)
}

export async function updateMetrics(studentId, data) {
  return request(`/metrics/student/${studentId}`, { method: 'PUT', body: JSON.stringify(data) })
}

// -- Attendance --
export async function getSessions() {
  return request('/attendance/sessions')
}

export async function getAttendanceReport(params = {}) {
  const qs = new URLSearchParams(params).toString()
  return request('/attendance/report' + (qs ? '?' + qs : ''))
}

export async function createSession(data) {
  return request('/attendance/sessions', { method: 'POST', body: JSON.stringify(data) })
}

export async function coachCheckIn(sessionId) {
  return request('/attendance/checkin', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) })
}

export async function getSessionAttendance(sessionId) {
  return request(`/attendance/session/${sessionId}`)
}

export async function markAttendance(studentId, sessionId, status) {
  return request('/attendance', {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId, session_id: sessionId, status }),
  })
}

export async function submitReport(sessionId, attendanceMap, coachCheckIn) {
  return request('/attendance/report', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, attendance_map: attendanceMap, coach_check_in: coachCheckIn }),
  })
}

// -- Schedules --
export async function getSchedules() {
  return request('/schedules')
}

export async function createSchedule(data) {
  return request('/schedules', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateSchedule(id, data) {
  return request(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteSchedule(id) {
  return request(`/schedules/${id}`, { method: 'DELETE' })
}

// -- Positions --
export async function getPositions() {
  return request('/positions')
}

export async function createPosition(data) {
  return request('/positions', { method: 'POST', body: JSON.stringify(data) })
}

export async function updatePosition(id, data) {
  return request(`/positions/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deletePosition(id) {
  return request(`/positions/${id}`, { method: 'DELETE' })
}

// -- Age Groups --
export async function getAgeGroups() {
  return request('/age-groups')
}

export async function createAgeGroup(data) {
  return request('/age-groups', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateAgeGroup(id, data) {
  return request(`/age-groups/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteAgeGroup(id) {
  return request(`/age-groups/${id}`, { method: 'DELETE' })
}

// -- Parents --
export async function getMyChild() {
  return request('/parents/child')
}

// -- Payments --
export async function getPayments() {
  return request('/payments')
}

export async function updatePaymentStatus(id, status) {
  return request(`/payments/${id}`, { method: 'PUT', body: JSON.stringify({ status }) })
}

export async function uploadProof(paymentId, proofUrl) {
  return request('/payments/upload-proof', { method: 'POST', body: JSON.stringify({ payment_id: paymentId, proof_url: proofUrl }) })
}

// -- Coach --
export async function getCoachProfile() {
  return request('/coaches/profile')
}

export async function updateCoachProfile(data) {
  return request('/coaches/profile', { method: 'PUT', body: JSON.stringify(data) })
}

// -- Content (public) --
export async function getSiteContent(section) {
  return request(`/content/public/${section}`)
}

export async function getAllSiteContent() {
  return request('/content/public')
}

export async function updateSiteContent(section, data) {
  return request(`/content/${section}`, { method: 'PUT', body: JSON.stringify({ data }) })
}

// -- Admin --
export async function getProfiles() {
  return request('/admin/profiles')
}

export async function getAdminStudents() {
  return request('/admin/students')
}

export async function createProfile(data) {
  return request('/admin/profiles', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateProfile(id, data) {
  return request(`/admin/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteProfile(id) {
  return request(`/admin/profiles/${id}`, { method: 'DELETE' })
}

// -- Upload --
export async function uploadFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  const token = getToken()
  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}

export { getToken, setToken }
