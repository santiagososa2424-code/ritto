import { createClient } from "@supabase/supabase-js";

// ⚠️ VALIDACIÓN DE VARIABLES DE ENTORNO (para evitar errores silenciosos)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERROR: Supabase URL o ANON KEY faltan en .env");
}

// 🔥 CLIENTE SUPABASE PRODUCTION-READY
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,          // Mantener login entre recargas
    autoRefreshToken: true,        // Renovar token automáticamente
    detectSessionInUrl: true,      // Necesario después de reset-password
    storage: localStorage,         // Fuerza persistencia (Vercel lo necesita)
  },
});
