/* ═══════════ CAPA DE DATOS ═══════════
   Si config.js tiene credenciales → Supabase.
   Si no → modo demo con imágenes de prueba.  */

let sb = null;
const MODO_DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;
if (!MODO_DEMO) {
  try { sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); }
  catch (err) { console.error('No se pudo inicializar Supabase:', err); }
}

/* estado global */
const DATOS = { lugares: [], galerias: [], fotos: [] };
let SESION = null;

/* ─── datos de demostración (picsum) ─── */
const _P = (id, w = 1200, h = 900) => `https://picsum.photos/id/${id}/${w}/${h}`;
function datosDemo() {
  const L = (id, nombre, region, lat, lng) => ({ id, nombre, region, lat, lng });
  const G = (id, nombre, anio, lugar_id, portada_url, orden) => ({ id, nombre, anio, lugar_id, portada_url, orden });
  const F = (id, galeria_id, pic, titulo, vertical, exif, lugar_id = null, fecha = null) => ({
    id, galeria_id, lugar_id, titulo, vertical, exif, fecha,
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
    G("g1", "Benidorm", "2025", "benidorm", _P(1069, 900, 1100), 1),
    G("g2", "Cartucho", "2025", "benidorm", _P(1025, 900, 1100), 2),
    G("g3", "Niebla temprana", "2024", "pirineos", _P(1018, 900, 1100), 3),
    G("g4", "Gente que pasa", "2023", "lisboa", _P(1011, 900, 1100), 4),
    G("g5", "Zoco y polvo", "2023", "marrakech", _P(1074, 900, 1100), 5),
    G("g6", "Última luz", "2021", "patagonia", _P(1050, 900, 1100), 6),
  ];
  DATOS.fotos = [
    F("f1", "g1", 1069, "IMG_0272.jpg", 1, "f/2.8 · 1/640 · ISO 100 · 35mm", null, "2025-06-14"),
    F("f2", "g1", 1043, "IMG_0268.jpg", 1, "f/4 · 1/250 · ISO 200 · 24mm", null, "2025-06-14"),
    F("f3", "g1", 164, "IMG_0553.jpg", 1, "f/5.6 · 1/320 · ISO 100 · 50mm", null, "2025-06-14"),
    F("f4", "g1", 1039, "IMG_0276.jpg", 0, "f/8 · 1/500 · ISO 100 · 24mm", null, "2025-06-14"),
    F("f5", "g1", 1015, "IMG_0275.jpg", 0, "f/7.1 · 1/400 · ISO 100 · 28mm", null, "2025-06-14"),
    F("f6", "g2", 1025, "IMG_0590.jpg", 1, "f/1.8 · 1/1000 · ISO 100 · 85mm", null, "2025-08-02"),
    F("f7", "g2", 237, "IMG_0598.jpg", 1, "f/2 · 1/800 · ISO 125 · 85mm", null, "2025-08-02"),
    F("f8", "g3", 1018, "IMG_0102.jpg", 0, "f/8 · 1/125 · ISO 100 · 24mm", null, "2024-03-09"),
    F("f9", "g3", 1036, "IMG_0107.jpg", 0, "f/11 · 1/60 · ISO 100 · 35mm", null, "2024-03-09"),
    F("f10", "g3", 1016, "IMG_0113.jpg", 0, "f/9 · 1/200 · ISO 100 · 24mm", null, "2024-03-09"),
    F("f11", "g4", 1011, "IMG_0334.jpg", 0, "f/2.8 · 1/500 · ISO 200 · 35mm", null, "2023-05-21"),
    F("f12", "g4", 1005, "IMG_0341.jpg", 0, "f/2 · 1/320 · ISO 100 · 50mm", null, "2023-05-21"),
    F("f13", "g4", 64, "IMG_0357.jpg", 1, "f/1.8 · 1/640 · ISO 100 · 85mm", "marrakech", "2023-05-23"),
    F("f14", "g5", 1074, "IMG_0402.jpg", 0, "f/5.6 · 1/800 · ISO 100 · 35mm", null, "2023-11-03"),
    F("f15", "g5", 1080, "IMG_0411.jpg", 0, "f/8 · 1/640 · ISO 100 · 24mm", null, "2023-11-03"),
    F("f16", "g6", 1050, "IMG_0021.jpg", 0, "f/11 · 1/250 · ISO 100 · 24mm", null, "2021-01-17"),
    F("f17", "g6", 1057, "IMG_0027.jpg", 0, "f/9 · 1/320 · ISO 100 · 35mm", null, "2021-01-17"),
    /* segunda visita a Benidorm, mismo lugar, fecha distinta — demuestra el timelapse */
    F("f18", "g1", 1041, "IMG_0410.jpg", 0, "f/5.6 · 1/500 · ISO 100 · 24mm", "benidorm", "2026-03-22"),
    /* foto suelta sin galería, directamente en un lugar */
    F("f19", null, 1080, "IMG_0500.jpg", 0, "f/8 · 1/400 · ISO 100 · 24mm", "pirineos", "2026-06-01"),
  ];
}

/* ─── carga desde Supabase ─── */
async function cargarDatos() {
  if (MODO_DEMO) { datosDemo(); return; }
  if (!sb) {
    toast('No se pudo conectar con Supabase — revisa tu conexión y recarga la página', 5000);
    return;
  }
  const [l, f] = await Promise.all([
    sb.from("lugares").select("*").order("nombre"),
    sb.from("fotos").select("*").order("orden", { ascending: true }),
  ]);
  let g = await sb.from("galerias").select("*").order("orden", { ascending: true, nullsFirst: false });
  if (g.error) {
    /* probablemente falta ejecutar la migración que añade la columna "orden" — reintenta sin ella */
    g = await sb.from("galerias").select("*").order("anio", { ascending: false });
    if (!g.error) toast('Ejecuta la migración pendiente (ver INSTRUCCIONES.md) para poder reordenar galerías', 5000);
  }
  if (l.error || g.error || f.error) {
    console.error(l.error || g.error || f.error);
    /* IMPORTANTE: si Supabase está configurado de verdad, jamás sustituimos tus datos reales
       por los de prueba — eso solo confundiría, haciendo parecer que se perdió contenido. */
    toast('No se han podido cargar tus datos de Supabase: ' + (l.error || g.error || f.error).message, 6000);
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
function fechaEfectivaFoto(f){
  return f.fecha || null;
}
function fechaMostrar(fechaISO, anioTexto){
  if (fechaISO){
    const d = new Date(fechaISO + 'T00:00:00');
    if (!isNaN(d)) return d.toLocaleDateString('es', { day:'numeric', month:'short', year:'numeric' });
  }
  return anioTexto || '';
}
const fotosDeGaleria = gid => DATOS.fotos.filter(f => f.galeria_id === gid)
  .map(f => ({ ...f, galeria: (galeriaDe(gid) || {}).nombre, fechaEfectiva: fechaEfectivaFoto(f) }));
function lugarEfectivo(f) { const g = galeriaDe(f.galeria_id); return f.lugar_id || (g ? g.lugar_id : null); }
function fotosDeLugar(lid) {
  return DATOS.fotos.filter(f => lugarEfectivo(f) === lid)
    .map(f => ({ ...f, galeria: (galeriaDe(f.galeria_id) || {}).nombre, fechaEfectiva: fechaEfectivaFoto(f) }))
    .sort((a, b) => {
      if (a.fechaEfectiva && b.fechaEfectiva) return a.fechaEfectiva < b.fechaEfectiva ? -1 : 1;
      if (a.fechaEfectiva) return -1;
      if (b.fechaEfectiva) return 1;
      return 0;
    });
}
const miniDe = f => f.miniatura || f.url;
const portadaDeGaleria = g => g.portada_url || (fotosDeGaleria(g.id)[0] || {}).url || "";

/* ─── todas las fotos, de cualquier galería o lugar, en orden cronológico (más recientes primero) ─── */
function todasLasFotosOrdenadas() {
  return DATOS.fotos.map(f => {
    const lid = lugarEfectivo(f);
    const l = lid ? lugarDe(lid) : null;
    const g = galeriaDe(f.galeria_id);
    return {
      ...f,
      galeria: g ? g.nombre : null,
      fechaEfectiva: fechaEfectivaFoto(f),
      lugarNombre: l ? l.nombre : null,
      lugarId: lid || null,
    };
  }).sort((a, b) => {
    /* 1º fecha (recientes primero), 2º lugar (agrupadas), 3º orden de subida */
    if (a.fechaEfectiva !== b.fechaEfectiva) {
      if (a.fechaEfectiva && b.fechaEfectiva) return a.fechaEfectiva > b.fechaEfectiva ? -1 : 1;
      return a.fechaEfectiva ? -1 : 1;
    }
    const la = a.lugarNombre || '', lb = b.lugarNombre || '';
    if (la !== lb) return la < lb ? -1 : 1;
    return (a.orden || 0) - (b.orden || 0);
  });
}
function fechaRelativa(fechaISO) {
  if (!fechaISO) return 'Sin fecha';
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const d = new Date(fechaISO + 'T00:00:00');
  const dias = Math.round((hoy - d) / 86400000);
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  return fechaMostrar(fechaISO);
}
function agruparPorVisita(fotos) {
  const grupos = new Map();
  fotos.forEach(f => {
    const fecha = f.fechaEfectiva || null;
    const clave = (f.galeria_id || 'suelto') + '|' + (fecha || 'sin-fecha');
    if (!grupos.has(clave)) {
      const g = f.galeria_id ? galeriaDe(f.galeria_id) : null;
      grupos.set(clave, {
        clave,
        titulo: g ? g.nombre : 'Fotos sueltas',
        fecha,
        galeriaId: f.galeria_id || null,
        fotos: [],
      });
    }
    grupos.get(clave).fotos.push(f);
  });
  return [...grupos.values()].sort((a, b) => {
    if (a.fecha && b.fecha) return a.fecha < b.fecha ? -1 : 1;
    if (a.fecha) return -1;
    if (b.fecha) return 1;
    return 0;
  });
}

/* ─── distancia entre coordenadas (para evitar lugares duplicados) ─── */
function distanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function buscarLugarSimilar(nombre, lat, lng, excluirId = null) {
  const n = (nombre || '').trim().toLowerCase();
  return DATOS.lugares.find(l => {
    if (l.id === excluirId) return false;
    if (n && l.nombre.trim().toLowerCase() === n) return true;
    if (lat != null && lng != null && l.lat != null && l.lng != null) {
      return distanciaKm(lat, lng, l.lat, l.lng) < 1.5;
    }
    return false;
  }) || null;
}

/* ─── buscar dirección (geocodificación con OpenStreetMap Nominatim, gratuita) ─── */
async function buscarDireccion(consulta) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(consulta)}`;
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return data.map(r => {
      const partes = r.display_name.split(',').map(s => s.trim());
      return { nombre: partes[0], region: partes.slice(1, 4).join(', '), lat: parseFloat(r.lat), lng: parseFloat(r.lon), display: r.display_name };
    });
  } catch (err) {
    console.error(err);
    toast('No se pudo buscar la dirección: ' + err.message, 4000);
    return [];
  }
}

/* ─── genera una miniatura ligera (para grids, mapa, listas) separada de la foto grande ─── */
function generarMiniatura(file, maxDim = 480, calidad = 0.72) {
  return new Promise(resolve => {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') { resolve(null); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      const escala = Math.min(1, maxDim / Math.max(w, h));
      w = Math.round(w * escala); h = Math.round(h * escala);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      cv.toBlob(blob => {
        if (!blob) { resolve(null); return; }
        resolve(new File([blob], 'mini_' + file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
      }, 'image/jpeg', calidad);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}
async function _subirUnArchivo(archivo, carpeta, sufijo) {
  const ext = (archivo.name.split(".").pop() || "jpg").toLowerCase();
  const ruta = `${carpeta}/${crypto.randomUUID()}${sufijo}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(ruta, archivo, { upsert: false });
  if (error) { console.error(error); toast("Error al subir: " + error.message, 4500); return null; }
  return sb.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
}
/* sube la foto grande (comprimida) Y una miniatura ligera — la miniatura es la clave
   de la velocidad: sin ella, cada rejilla de fotos tendría que cargar la imagen
   completa solo para mostrarla del tamaño de un sello. */
async function subirArchivoConMiniatura(file, carpeta) {
  const [grande, mini] = await Promise.all([comprimirImagen(file), generarMiniatura(file)]);
  const [url, miniatura] = await Promise.all([
    _subirUnArchivo(grande, carpeta, ''),
    mini ? _subirUnArchivo(mini, carpeta, '_mini') : Promise.resolve(null),
  ]);
  return { url, miniatura };
}
async function subirVariosConMiniatura(files, carpeta, onProgreso) {
  const CONCURRENCIA = 3;
  const resultados = new Array(files.length).fill(null);
  let hechos = 0, cursor = 0;
  async function siguiente() {
    while (cursor < files.length) {
      const i = cursor++;
      resultados[i] = await subirArchivoConMiniatura(files[i], carpeta);
      hechos++;
      if (onProgreso) onProgreso(hechos, files.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, files.length) }, siguiente));
  return resultados;
}
function comprimirImagen(file, maxDim = 2400, calidad = 0.85) {
  return new Promise(resolve => {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') { resolve(file); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      if (w <= maxDim && h <= maxDim && file.size < 2 * 1024 * 1024) { resolve(file); return; }
      const escala = Math.min(1, maxDim / Math.max(w, h));
      w = Math.round(w * escala); h = Math.round(h * escala);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      cv.toBlob(blob => {
        if (!blob) { resolve(file); return; }
        resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
      }, 'image/jpeg', calidad);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/* ─── escritura (solo con sesión) ─── */
function requiereAdmin() {
  if (MODO_DEMO) { toast("Configura Supabase en js/config.js para activar la administración"); return false; }
  if (!SESION) { toast("Inicia sesión como administrador"); return false; }
  return true;
}
async function dbInsert(tabla, fila) {
  const { data, error } = await sb.from(tabla).insert(fila).select().single();
  if (error) { console.error(error); toast("Error al guardar: " + error.message, 4500); return null; }
  return data;
}
async function dbUpdate(tabla, id, cambios) {
  const { error } = await sb.from(tabla).update(cambios).eq("id", id);
  if (error) { console.error(error); toast("Error al actualizar: " + error.message, 4500); return false; }
  return true;
}
async function dbDelete(tabla, id) {
  const { error } = await sb.from(tabla).delete().eq("id", id);
  if (error) { console.error(error); toast("Error al eliminar: " + error.message, 4500); return false; }
  return true;
}
async function subirArchivo(file, carpeta) {
  const archivo = await comprimirImagen(file);
  const ext = (archivo.name.split(".").pop() || "jpg").toLowerCase();
  const ruta = `${carpeta}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(ruta, archivo, { upsert: false });
  if (error) { console.error(error); toast("Error al subir: " + error.message, 4500); return null; }
  return sb.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
}

/* ─── subir varios archivos a la vez (más rápido que uno a uno) ─── */
async function subirVarios(files, carpeta, onProgreso) {
  const CONCURRENCIA = 3;
  const urls = new Array(files.length).fill(null);
  let hechos = 0, cursor = 0;
  async function siguiente() {
    while (cursor < files.length) {
      const i = cursor++;
      urls[i] = await subirArchivo(files[i], carpeta);
      hechos++;
      if (onProgreso) onProgreso(hechos, files.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, files.length) }, siguiente));
  return urls;
}
