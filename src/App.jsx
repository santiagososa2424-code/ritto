import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

// Páginas
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Services from "./pages/Services";
import Schedule from "./pages/Schedule";
import ScheduleBlocks from "./pages/ScheduleBlocks";
import BusinessSetup from "./pages/BusinessSetup";
import Bookings from "./pages/Bookings";
import PublicBooking from "./pages/PublicBooking";

// -------------------------------------
// PROTECCIÓN DE RUTA (solo usuarios logeados)
// -------------------------------------
function ProtectedRoute({ children }) {
  const session = supabase.auth.getSession();

  // IMPORTANTE: esto es async, así que simplificamos redirección
  // Si no hay token → forzamos login igual
  const token = supabase.auth.getAuthToken();

  if (!token) {
    return <Navigate to="/login" />;
  }

  return children;
}

// -------------------------------------
// APP PRINCIPAL
// -------------------------------------
export default function App() {
  return (
    <BrowserRouter>

      {/* FONDO GLOBAL ESTILO APPLE */}
      <div className="min-h-screen bg-[#0A0F1F] text-white">

        <Routes>

          {/* AUTH */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* PANEL PRIVADO */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
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
            path="/setup"
            element={
              <ProtectedRoute>
                <BusinessSetup />
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

          {/* LINK PÚBLICO */}
          <Route path="/:slug" element={<PublicBooking />} />

          {/* ROOT → LOGIN */}
          <Route path="*" element={<Navigate to="/login" />} />

        </Routes>

      </div>
    </BrowserRouter>
  );
}
