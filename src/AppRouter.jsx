import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Public pages
import Landing from "./pages/Landing.jsx";
import PublicBooking from "./pages/PublicBooking.jsx";
import BookingSuccess from "./pages/BookingSuccess.jsx";
import PaymentSuccess from "./pages/PaymentSuccess.jsx";

// Auth pages
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import UpdatePassword from "./pages/UpdatePassword.jsx";

// Private pages
import Dashboard from "./pages/Dashboard.jsx";
import BusinessSetup from "./pages/BusinessSetup.jsx";
import Services from "./pages/Services.jsx";
import Schedule from "./pages/Schedule.jsx";
import ScheduleBlocks from "./pages/ScheduleBlocks.jsx";

// Security wrapper
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function AppRouter() {
  return (
    <Router>
      <Routes>

        {/* ──────────────────────────────────────── */}
        {/* LANDING PRINCIPAL */}
        {/* ──────────────────────────────────────── */}
        <Route path="/" element={<Landing />} />

        {/* ──────────────────────────────────────── */}
        {/* PÁGINAS PÚBLICAS */}
        {/* ──────────────────────────────────────── */}
        <Route path="/success" element={<BookingSuccess />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />

        {/* Página pública para clientes con el slug del negocio */}
        <Route path="/:slug" element={<PublicBooking />} />

        {/* ──────────────────────────────────────── */}
        {/* AUTENTICACIÓN */}
        {/* ──────────────────────────────────────── */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />

        {/* ──────────────────────────────────────── */}
        {/* RUTAS PRIVADAS */}
        {/* ──────────────────────────────────────── */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
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

        {/* ──────────────────────────────────────── */}
        {/* DEFAULT 404 → redirige a landing */}
        {/* ──────────────────────────────────────── */}
        <Route path="*" element={<Landing />} />

      </Routes>
    </Router>
  );
}
