import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Courses from './pages/Courses.jsx';
import CourseDetail from './pages/CourseDetail.jsx';
import Testimonials from './pages/Testimonials.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import Dashboard from './pages/student/Dashboard.jsx';
import CoursePlayer from './pages/student/CoursePlayer.jsx';
import PayCourse from './pages/student/PayCourse.jsx';
import MyPayments from './pages/student/MyPayments.jsx';
import BookLive from './pages/student/BookLive.jsx';
import MyBookings from './pages/student/MyBookings.jsx';
import SubmitTestimonial from './pages/student/SubmitTestimonial.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminCourses from './pages/admin/AdminCourses.jsx';
import AdminCourseEditor from './pages/admin/AdminCourseEditor.jsx';
import AdminPayments from './pages/admin/AdminPayments.jsx';
import AdminLiveSessions from './pages/admin/AdminLiveSessions.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminTestimonials from './pages/admin/AdminTestimonials.jsx';
import AdminWhatsapp from './pages/admin/AdminWhatsapp.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:courseId" element={<CourseDetail />} />
        <Route path="/testimonials" element={<Testimonials />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/learn/:courseId" element={<CoursePlayer />} />
          <Route path="/learn/:courseId/:lessonId" element={<CoursePlayer />} />
          <Route path="/pay/:enrollmentId" element={<PayCourse />} />
          <Route path="/payments" element={<MyPayments />} />
          <Route path="/book-live" element={<BookLive />} />
          <Route path="/bookings" element={<MyBookings />} />
          <Route path="/submit-testimonial" element={<SubmitTestimonial />} />
        </Route>

        <Route element={<ProtectedRoute requireAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="courses" element={<AdminCourses />} />
            <Route path="courses/:courseId" element={<AdminCourseEditor />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="live-sessions" element={<AdminLiveSessions />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="testimonials" element={<AdminTestimonials />} />
            <Route path="whatsapp" element={<AdminWhatsapp />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
        <Route path="/dashboard-redirect" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
