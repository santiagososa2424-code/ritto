import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import BusinessSetup from "./pages/BusinessSetup";
import Schedule from "./pages/Schedule";
import Services from "./pages/Services";
import PublicBooking from "./pages/PublicBooking";
import UpdatePassword from "./pages/UpdatePassword"; // 👈 IMPORT NECESARIO

import ProtectedRoute from "./components/ProtectedRoute";

export default function AppRouter() {
  return (
    <Router>
      <Routes>
        {/* Página pública por slug */}
        <Route path="/:slug" element={<PublicBooking />} />

        {/* Autenticación */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Recuperar contraseña */}
        <Route path="/update-password" element={<UpdatePassword />} /> 
        {/* 👆 AGREGADA ESTA RUTA */}

        {/* ZONA PRIVADA */}
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

        {/* Default */}
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  );
}
