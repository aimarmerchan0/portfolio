/* ═══════════════════════════════════════════════════════
   CONFIGURACIÓN — rellena estos dos valores con los datos
   de tu proyecto de Supabase (Settings → API):
   · Project URL  → SUPABASE_URL
   · anon public  → SUPABASE_ANON_KEY
   Mientras estén vacíos, la web funciona en MODO DEMO con
   fotos de prueba y el panel de administración desactivado.
   ═══════════════════════════════════════════════════════ */

const SUPABASE_URL = "https://srhgxijzqlkijlrczova.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyaGd4aWp6cWxraWpscmN6b3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMjU0NjEsImV4cCI6MjA5ODYwMTQ2MX0.NPtFWhdGr5jcVHO_pbpBgR_v781qnNI58o-dBcOFtHc";

/* Nombre del bucket de Storage donde se guardan las imágenes */
const BUCKET = "fotos";

/* Datos del propietario que se muestran en la interfaz */
const PERFIL = {
  nombre: "Aimar Merchán",
  subtitulo: "Archivo expuesto",
  instagram: "aimarmerchan",   // ← tu usuario de Instagram, SIN la @
};
