import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Programs from './pages/Programs'
import Schedule from './pages/Schedule'
import Gallery from './pages/Gallery'
import Sponsors from './pages/Sponsors'
import Auth from './pages/Auth'
import DashboardLayout from './components/DashboardLayout'
import StudentDashboard from './pages/StudentDashboard'
import DashboardProfile from './pages/DashboardProfile'
import DashboardSchedule from './pages/DashboardSchedule'
import DashboardPayment from './pages/DashboardPayment'
import CoachDashboard from './pages/CoachDashboard'
import AdminDashboard from './pages/AdminDashboard'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/sponsors" element={<Sponsors />} />
        <Route path="/login" element={<Auth />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<StudentDashboard />} />
        <Route path="profil" element={<DashboardProfile />} />
        <Route path="jadwal" element={<DashboardSchedule />} />
        <Route path="pembayaran" element={<DashboardPayment />} />
      </Route>
      <Route path="/coach" element={<CoachDashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  )
}
