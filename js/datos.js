/* ═══════════ CAPA DE DATOS ═══════════
   Si config.js tiene credenciales → Supabase.
   Si no → modo demo con imágenes de prueba.  */

let sb = null;
const MODO_DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;
if (!MODO_DEMO) sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* estado global */
const DATOS = { lugares: [], galerias: [], fotos: [] };
let SESION = null;

/* ─── datos de demostración (picsum) ─── */
const _P = (id, w = 1200, h = 900) => `https://picsum.photos/id/${id}/${w}/${h}`;
function datosDemo() {
  const L = (id, nombre, region, lat, lng) => ({ id, nombre, region, lat, lng });
  const G = (id, nombre, anio, lugar_id, portada_url) => ({ id, nombre, anio, lugar_id, portada_url });
  const F = (id, galeria_id, pic, titulo, vertical, exif, lugar_id = null) => ({
    id, galeria_id, lugar_id, titulo, vertical, exif,
    url: vertical ? _P(pic, 900, 1200) : _P(pic, 1400, 1000),
    miniatura: _P(pic, 300, 300),
    url_original: null, _pic: pic,
  });
  DATOS.lugares = [
    L("benidorm", "Benidorm", "Alicante, España", 38.5342, -0.1314),
    L("pirineos", "Pirineos", "Huesca, España", 42.662, 0.03),
    L("lisboa", "Lisboa", "Portugal", 38.7223, -9.1393),
    L("marrakech", "Marrakech", "Marruecos", 31.6295, -7.9811),
    L("patagonia", "Patagonia", "Argentina", -49.3315, -72.8863),
  ];
  DATOS.galerias = [
    G("g1", "Benidorm", "2025", "benidorm", _P(1069, 900, 1100)),
    G("g2", "Cartucho", "2025", "benidorm", _P(1025, 900, 1100)),
    G("g3", "Niebla temprana", "2024", "pirineos", _P(1018, 900, 1100)),
    G("g4", "Gente que pasa", "2023", "lisboa", _P(1011, 900, 1100)),
    G("g5", "Zoco y polvo", "2023", "marrakech", _P(1074, 900, 1100)),
    G("g6", "Última luz", "2021", "patagonia", _P(1050, 900, 1100)),
  ];
  DATOS.fotos = [
    F("f1", "g1", 1069, "IMG_0272.jpg", 1, "f/2.8 · 1/640 · ISO 100 · 35mm"),
    F("f2", "g1", 1043, "IMG_0268.jpg", 1, "f/4 · 1/250 · ISO 200 · 24mm"),
    F("f3", "g1", 164, "IMG_0553.jpg", 1, "f/5.6 · 1/320 · ISO 100 · 50mm"),
    F("f4", "g1", 1039, "IMG_0276.jpg", 0, "f/8 · 1/500 · ISO 100 · 24mm"),
    F("f5", "g1", 1015, "IMG_0275.jpg", 0, "f/7.1 · 1/400 · ISO 100 · 28mm"),
    F("f6", "g2", 1025, "IMG_0590.jpg", 1, "f/1.8 · 1/1000 · ISO 100 · 85mm"),
    F("f7", "g2", 237, "IMG_0598.jpg", 1, "f/2 · 1/800 · ISO 125 · 85mm"),
    F("f8", "g3", 1018, "IMG_0102.jpg", 0, "f/8 · 1/125 · ISO 100 · 24mm"),
    F("f9", "g3", 1036, "IMG_0107.jpg", 0, "f/11 · 1/60 · ISO 100 · 35mm"),
    F("f10", "g3", 1016, "IMG_0113.jpg", 0, "f/9 · 1/200 · ISO 100 · 24mm"),
    F("f11", "g4", 1011, "IMG_0334.jpg", 0, "f/2.8 · 1/500 · ISO 200 · 35mm"),
    F("f12", "g4", 1005, "IMG_0341.jpg", 0, "f/2 · 1/320 · ISO 100 · 50mm"),
    F("f13", "g4", 64, "IMG_0357.jpg", 1, "f/1.8 · 1/640 · ISO 100 · 85mm", "marrakech"),
    F("f14", "g5", 1074, "IMG_0402.jpg", 0, "f/5.6 · 1/800 · ISO 100 · 35mm"),
    F("f15", "g5", 1080, "IMG_0411.jpg", 0, "f/8 · 1/640 · ISO 100 · 24mm"),
    F("f16", "g6", 1050, "IMG_0021.jpg", 0, "f/11 · 1/250 · ISO 100 · 24mm"),
    F("f17", "g6", 1057, "IMG_0027.jpg", 0, "f/9 · 1/320 · ISO 100 · 35mm"),
  ];
}

/* ─── carga desde Supabase ─── */
async function cargarDatos() {
  if (MODO_DEMO) { datosDemo(); return; }
  const [l, g, f] = await Promise.all([
    sb.from("lugares").select("*").order("nombre"),
    sb.from("galerias").select("*").order("anio", { ascending: false }),
    sb.from("fotos").select("*").order("orden", { ascending: true }),
  ]);
  if (l.error || g.error || f.error) {
    console.error(l.error || g.error || f.error);
    toast("Error cargando datos — revisa las tablas de Supabase");
    datosDemo();
    return;
  }
  DATOS.lugares = l.data; DATOS.galerias = g.data; DATOS.fotos = f.data;
  if (!DATOS.galerias.length && !DATOS.lugares.length) {
    toast("Sin contenido todavía — entra como administrador para crearlo");
  }
}

/* ─── consultas ─── */
const lugarDe = id => DATOS.lugares.find(l => l.id === id);
const galeriaDe = id => DATOS.galerias.find(g => g.id === id);
const fotosDeGaleria = gid => DATOS.fotos.filter(f => f.galeria_id === gid)
  .map(f => ({ ...f, galeria: (galeriaDe(gid) || {}).nombre }));
function lugarEfectivo(f) { const g = galeriaDe(f.galeria_id); return f.lugar_id || (g ? g.lugar_id : null); }
function fotosDeLugar(lid) {
  return DATOS.fotos.filter(f => lugarEfectivo(f) === lid)
    .map(f => ({ ...f, galeria: (galeriaDe(f.galeria_id) || {}).nombre }));
}
const miniDe = f => f.miniatura || f.url;
const portadaDeGaleria = g => g.portada_url || (fotosDeGaleria(g.id)[0] || {}).url || "";

/* ─── escritura (solo con sesión) ─── */
function requiereAdmin() {
  if (MODO_DEMO) { toast("Configura Supabase en js/config.js para activar la administración"); return false; }
  if (!SESION) { toast("Inicia sesión como administrador"); return false; }
  return true;
}
async function dbInsert(tabla, fila) {
  const { data, error } = await sb.from(tabla).insert(fila).select().single();
  if (error) { console.error(error); toast("Error al guardar: " + error.message); return null; }
  return data;
}
async function dbUpdate(tabla, id, cambios) {
  const { error } = await sb.from(tabla).update(cambios).eq("id", id);
  if (error) { console.error(error); toast("Error al actualizar: " + error.message); return false; }
  return true;
}
async function dbDelete(tabla, id) {
  const { error } = await sb.from(tabla).delete().eq("id", id);
  if (error) { console.error(error); toast("Error al eliminar: " + error.message); return false; }
  return true;
}
async function subirArchivo(file, carpeta) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const ruta = `${carpeta}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(ruta, file, { upsert: false });
  if (error) { console.error(error); toast("Error al subir: " + error.message); return null; }
  return sb.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
}
