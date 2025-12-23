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
import Billing from "./pages/Billing.jsx"; // ✅ NUEVO

// 📦 Booking público
import PublicBooking from "./pages/PublicBooking.jsx";
import BookingSuccess from "./pages/BookingSuccess.jsx";
import PaymentSuccess from "./pages/PaymentSuccess.jsx";

// 🔐 Middleware
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function AppRouter() {
  return (
    <Router>
      <Routes>

        {/* 🌟 Página principal */}
        <Route path="/" element={<Landing />} />

        {/* 🌐 Páginas públicas */}
        <Route path="/success" element={<BookingSuccess />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/book/:slug" element={<PublicBooking />} />

        {/* 🔐 Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />

        {/* 🔒 Privadas */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* ✅ NUEVA RUTA BILLING */}
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
              <BusinessSetup />
            </ProtectedRoute>
          }
        />

        <Route
          path="/services"
          element={
            <ProtectedRoute>
              <Services />
            </ProtectedRoute>
          }
        />

        <Route
          path="/schedule"
          element={
            <ProtectedRoute>
              <Schedule />
            </ProtectedRoute>
          }
        />

        <Route
          path="/schedule-blocks"
          element={
            <ProtectedRoute>
              <ScheduleBlocks />
            </ProtectedRoute>
          }
        />

        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
              <Bookings />
            </ProtectedRoute>
          }
        />

        {/* 🚧 Cualquier ruta → Landing */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </Router>
  );
}
