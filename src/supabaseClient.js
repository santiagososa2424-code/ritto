import { createClient } from "@supabase/supabase-js";

// 🔥 Usamos DIRECTAMENTE tus datos de Supabase
const supabaseUrl = "https://rvdfxayovbvtefhntkxr.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2ZGZ4YXlvdmJ2dGVmaG50a3hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzUwNjIsImV4cCI6MjA3OTYxMTA2Mn0.j91RIKtfxriusDguUc-g7Wc-j-Hhv7wpUmgqzA6vpow";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase URL o ANON KEY faltan. Revisá supabaseClient.js");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
  },
});
