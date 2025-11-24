import { BrowserRouter, Routes, Route } from "react-router-dom";

// Páginas
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import BusinessSetup from "./pages/BusinessSetup";
import Services from "./pages/Services";
import Schedule from "./pages/Schedule";
import PublicBooking from "./pages/PublicBooking";
import Subscription from "./pages/Subscription";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/setup" element={<BusinessSetup />} />
        <Route path="/services" element={<Services />} />
        <Route path="/schedule" element={<Schedule />} />

        {/* Link público de reservas */}
        <Route path="/booking/:slug" element={<PublicBooking />} />

        {/* Suscripciones */}
        <Route path="/subscription" element={<Subscription />} />

        {/* Recuperar contraseña */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
      </Routes>
    </BrowserRouter>
  );
}
