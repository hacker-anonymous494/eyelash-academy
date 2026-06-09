import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';

// Public pages
const LandingPage = lazy(() => import('@/features/landing/LandingPage'));
const LoginPage = lazy(() => import('@/features/auth/components/LoginPage'));
const SignupPage = lazy(() => import('@/features/auth/components/SignupPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/components/ForgotPasswordPage'));

// Course pages
const CatalogPage = lazy(() => import('@/features/courses/catalog/CatalogPage'));
const CourseDetailPage = lazy(() => import('@/features/courses/catalog/CourseDetailPage'));

// Protected pages (student)
const ProtectedRoute = lazy(() => import('@/features/auth/components/ProtectedRoute'));
const DashboardPage = lazy(() => import('@/features/dashboard/student/DashboardPage'));
const LearnPage = lazy(() => import('@/features/courses/player/LearnPage'));
const CertificatesPage = lazy(() => import('@/features/dashboard/student/CertificatesPage'));
const MyCoursesPage = lazy(() => import('@/features/dashboard/student/MyCoursesPage'));

// Call‑related pages
const BookCallPage = lazy(() => import('@/features/calls/BookCallPage'));
const CallRoomPage = lazy(() => import('@/features/calls/CallRoomPage'));
const AdminCallsPage = lazy(() => import('@/features/calls/AdminCallsPage'));
const StudentCallsPage = lazy(() => import('@/features/calls/StudentCallsPage'));

// Admin pages
const AdminRoute = lazy(() => import('@/features/auth/components/AdminRoute'));
const AdminDashboard = lazy(() => import('@/features/dashboard/admin/AdminDashboardPage'));
const AdminCourses = lazy(() => import('@/features/dashboard/admin/AdminCoursesPage'));
const AdminCourseEditor = lazy(() => import('@/features/dashboard/admin/AdminCourseEditorPage'));
const AdminStudents = lazy(() => import('@/features/dashboard/admin/AdminStudentsPage'));
const AdminOrders = lazy(() => import('@/features/dashboard/admin/AdminOrdersPage'));
const AdminChat = lazy(() => import('@/features/chat/AdminChatPage'));

const VerifyCertificatePage = lazy(() => import('@/features/certificates/VerifyCertificatePage'));

// Global call notification components (placed inside ProtectedRoute)
import CallNotificationProvider from '@/features/calls/CallNotificationProvider';
import CallToast from '@/features/calls/CallToast';

import PublicLayout from '@/shared/layouts/PublicLayout';

export default function App() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fff6f9] to-[#fff0f4]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-rose-200 border-t-brand-rose-600" />
      </div>
    }>
      {/* Global toast for call invites – visible on any page */}
      <CallToast />

      <Routes>
        {/* ─── Public routes (with Navbar + background) ── */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/courses" element={<CatalogPage />} />
          <Route path="/courses/:slug" element={<CourseDetailPage />} />
          {/* Verification routes */}
          <Route path="/verify" element={<VerifyCertificatePage />} />
          <Route path="/verify/:code" element={<VerifyCertificatePage />} />
        </Route>

        {/* ─── Admin routes ────────────────────────────── */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/courses" element={<AdminCourses />} />
          <Route path="/admin/courses/new" element={<AdminCourseEditor />} />
          <Route path="/admin/courses/:id" element={<AdminCourseEditor />} />
          <Route path="/admin/students" element={<AdminStudents />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/chat" element={<AdminChat />} />
          <Route path="/admin/calls" element={<AdminCallsPage />} />
        </Route>

        {/* ─── Student protected routes ────────────────── */}
        <Route element={<ProtectedRoute />}>
          {/* Call notification provider wraps all student pages */}
          <Route element={<CallNotificationProvider />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/courses" element={<MyCoursesPage />} />
            <Route path="/dashboard/certificates" element={<CertificatesPage />} />
            <Route path="/dashboard/book-call" element={<BookCallPage />} />
            <Route path="/dashboard/calls" element={<StudentCallsPage />} />
            <Route path="/call/:sessionId" element={<CallRoomPage />} />
            <Route path="/learn/:slug" element={<LearnPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}