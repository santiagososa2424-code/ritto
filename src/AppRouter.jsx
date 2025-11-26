import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import BusinessSetup from "./pages/BusinessSetup.jsx";
import Schedule from "./pages/Schedule.jsx";
import Services from "./pages/Services.jsx";
import PublicBooking from "./pages/PublicBooking.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import UpdatePassword from "./pages/UpdatePassword.jsx";
import ScheduleBlocks from "./pages/ScheduleBlocks.jsx";

import BookingSuccess from "./pages/BookingSuccess.jsx";
import PaymentSuccess from "./pages/PaymentSuccess.jsx";

import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function AppRouter() {
  return (
    <Router>
      <Routes>

        {/* Páginas públicas */}
        <Route path="/success" element={<BookingSuccess />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/:slug" element={<PublicBooking />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />

        {/* Privadas */}
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

        {/* Default */}
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  );
}
