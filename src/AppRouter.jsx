import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// 📦 Páginas públicas
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import UpdatePassword from "./pages/UpdatePassword.jsx";

// 📦 Páginas privadas
import Dashboard from "./pages/Dashboard.jsx";
import BusinessSetup from "./pages/BusinessSetup.jsx";
import Services from "./pages/Services.jsx";
import Schedule from "./pages/Schedule.jsx";
import ScheduleBlocks from "./pages/ScheduleBlocks.jsx";
import Bookings from "./pages/Bookings.jsx";
import Billing from "./pages/Billing.jsx";

// 📦 Booking público
import PublicBooking from "./pages/PublicBooking.jsx";
import BookingSuccess from "./pages/BookingSuccess.jsx";
import PaymentSuccess from "./pages/PaymentSuccess.jsx";

// 🔐 Middleware
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import RequireActiveAccess from "./components/RequireActiveAccess.jsx";

export default function AppRouter() {
  return (
    <Router>
      <Routes>
        {/* 🌟 Página principal */}
        <Route path="/" element={<Landing />} />

        {/* 🌐 Públicas */}
        <Route path="/success" element={<BookingSuccess />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />

        {/* 🔐 Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/reset-password" element={<UpdatePassword />} />

        {/* 🔒 Privadas */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RequireActiveAccess>
                <Dashboard />
              </RequireActiveAccess>
            </ProtectedRoute>
          }
        />

        {/* ✅ Billing SIEMPRE accesible (logueado) para poder pagar */}
        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <Billing />
            </ProtectedRoute>
          }
        />

        <Route
          path="/setup"
          element={
            <ProtectedRoute>
              <RequireActiveAccess>
                <BusinessSetup />
              </RequireActiveAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/services"
          element={
            <ProtectedRoute>
              <RequireActiveAccess>
                <Services />
              </RequireActiveAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/schedule"
          element={
            <ProtectedRoute>
              <RequireActiveAccess>
                <Schedule />
              </RequireActiveAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/schedule-blocks"
          element={
            <ProtectedRoute>
              <RequireActiveAccess>
                <ScheduleBlocks />
              </RequireActiveAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
              <RequireActiveAccess>
                <Bookings />
              </RequireActiveAccess>
            </ProtectedRoute>
          }
        />

        {/* 🔁 Legacy */}
        <Route path="/book/:slug" element={<PublicBooking />} />

        {/* 🌍 Booking público limpio */}
        <Route path="/:slug" element={<PublicBooking />} />

        {/* 🚧 Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
