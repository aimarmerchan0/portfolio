/* ═══════════ ADMINISTRACIÓN ═══════════
   Inicio de sesión con tu usuario de Supabase (email + contraseña)
   y gestión completa: lugares, galerías, fotos, portadas y originales. */

/* ── sesión ── */
async function restaurarSesion(){
  if(MODO_DEMO)return;
  const {data}=await sb.auth.getSession();
  SESION=data.session||null;
  pintarEstadoAdmin();
}
function pintarEstadoAdmin(){
  document.body.classList.toggle('admin',!!SESION);
  $('admin-estado').textContent=SESION?('Administrador · '+SESION.user.email):'Visitante';
  $('btn-admin').textContent=SESION?'Cerrar sesión':'Acceso administrador';
  renderTodo();
  if(coleccion&&$('p-colec').classList.contains('abierta'))refrescarColeccion();
}
function accionAdmin(){
  if(MODO_DEMO){toast('Configura Supabase en js/config.js para activar el panel');return;}
  if(SESION){cerrarSesion();return;}
  cerrarMenu();
  hoja(`
    <div class="grupo">
      <div class="cab-hoja"><b>Acceso administrador</b><span>Entra con tu usuario de Supabase</span></div>
      <div class="campo"><label>Correo</label><input id="in-email" type="email" autocomplete="email" placeholder="tu@correo.com"></div>
      <div class="campo"><label>Contraseña</label><input id="in-pass" type="password" autocomplete="current-password" placeholder="••••••••"></div>
      <button class="principal" id="btn-entrar" onclick="iniciarSesion()">Entrar</button>
    </div>
    <button class="cancelar" onclick="cerrarHoja()">Cancelar</button>`);
}
async function iniciarSesion(){
  const email=$('in-email').value.trim(),pass=$('in-pass').value;
  if(!email||!pass){toast('Escribe correo y contraseña');return;}
  $('btn-entrar').disabled=true;
  const {data,error}=await sb.auth.signInWithPassword({email,password:pass});
  $('btn-entrar').disabled=false;
  if(error){toast('No se pudo entrar: '+error.message);return;}
  SESION=data.session;
  cerrarHoja();
  pintarEstadoAdmin();
  toast('Sesión iniciada — panel de administración activo');
}
async function cerrarSesion(){
  await sb.auth.signOut();
  SESION=null;
  pintarEstadoAdmin();
  toast('Sesión cerrada');
}

/* ── LUGARES ── */
let lugarPendiente=null; /* {id?} cuando se está fijando en el mapa */
function formLugar(lid){
  const l=lid?lugarDe(lid):{nombre:'',region:'',lat:'',lng:''};
  hoja(`
    <div class="grupo">
      <div class="cab-hoja"><b>${lid?'Editar lugar':'Nuevo lugar'}</b><span>También puedes cerrar esto y tocar el mapa directamente</span></div>
      <div class="campo"><label>Nombre</label><input id="in-lug-nombre" value="${l.nombre||''}" placeholder="Benidorm"></div>
      <div class="campo"><label>Región / país</label><input id="in-lug-region" value="${l.region||''}" placeholder="Alicante, España"></div>
      <div class="campo"><label>Coordenadas (lat, lng)</label>
        <div class="doble">
          <input id="in-lug-lat" inputmode="decimal" value="${l.lat??''}" placeholder="38.5342">
          <input id="in-lug-lng" inputmode="decimal" value="${l.lng??''}" placeholder="-0.1314">
        </div>
      </div>
      <button class="principal" onclick="guardarLugar('${lid||''}')">Guardar lugar</button>
      <p class="nota-form">Consejo: busca el sitio en Google Maps, mantén pulsado sobre el punto y copia las coordenadas que aparecen (usa punto decimal, no coma).</p>
    </div>
    <button class="cancelar" onclick="cerrarHoja()">Cancelar</button>`);
}
async function guardarLugar(lid){
  if(!requiereAdmin())return;
  const nombre=$('in-lug-nombre').value.trim();
  const region=$('in-lug-region').value.trim();
  const latTxt=$('in-lug-lat').value.trim().replace(',','.');
  const lngTxt=$('in-lug-lng').value.trim().replace(',','.');
  const lat=latTxt?parseFloat(latTxt):null;
  const lng=lngTxt?parseFloat(lngTxt):null;
  if(!nombre){toast('El lugar necesita un nombre');return;}
  if((latTxt&&isNaN(lat))||(lngTxt&&isNaN(lng))){
    toast('Revisa el formato de las coordenadas — usa punto decimal, ej. 38.5342',4000);
    return;
  }
  const fila={nombre,region,lat,lng};
  cerrarHoja();subiendo('Guardando lugar…');
  let ok;
  if(lid)ok=await dbUpdate('lugares',lid,fila);
  else ok=await dbInsert('lugares',fila);
  subidaLista();
  if(!ok)return; /* el error concreto ya se mostró en toast */
  await cargarDatos();renderTodo();
  toast(lat!=null&&lng!=null?'Lugar guardado y ubicado en el mapa':'Lugar guardado — sin coordenadas, no aparecerá en el mapa hasta que se las añadas');
}
function fijarEnMapa(lid){
  lugarPendiente={
    id:lid||null,
    nombre:$('in-lug-nombre').value.trim(),
    region:$('in-lug-region').value.trim(),
  };
  cerrarHoja();
  irRaiz('mapa');
  document.body.classList.add('fijando');
}
function reubicarLugar(lid){
  const l=lugarDe(lid);
  lugarPendiente={id:lid,nombre:l.nombre,region:l.region};
  irRaiz('mapa');
  document.body.classList.add('fijando');
}
function cancelarFijado(){
  lugarPendiente=null;
  document.body.classList.remove('fijando');
  toast('Cancelado');
}
async function clickMapaAdmin(e){
  if(!SESION)return; /* los visitantes no pueden crear lugares */
  const {lat,lng}=e.latlng;

  /* modo "reposicionar" armado desde el formulario de editar/crear lugar */
  if(lugarPendiente){
    document.body.classList.remove('fijando');
    const p=lugarPendiente;lugarPendiente=null;
    subiendo('Guardando ubicación…');
    let ok;
    if(p.id){
      ok=await dbUpdate('lugares',p.id,{lat,lng});
    }else{
      ok=await dbInsert('lugares',{nombre:p.nombre||'Nuevo lugar',region:p.region||'',lat,lng});
    }
    subidaLista();
    if(!ok)return; /* el error ya se mostró */
    await cargarDatos();renderTodo();
    toast(`Ubicación guardada: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    return;
  }

  /* modo simple: CUALQUIER toque en el mapa, sin pasos previos, ofrece crear un lugar ahí */
  hoja(`
    <div class="grupo">
      <div class="cab-hoja"><b>Nuevo lugar aquí</b><span>${lat.toFixed(4)}, ${lng.toFixed(4)}</span></div>
      <div class="campo"><label>Nombre</label><input id="in-lug-nombre" placeholder="Nombre del lugar"></div>
      <div class="campo"><label>Región / país (opcional)</label><input id="in-lug-region" placeholder="Región, país"></div>
      <input type="hidden" id="in-lug-lat" value="${lat}">
      <input type="hidden" id="in-lug-lng" value="${lng}">
      <button class="principal" onclick="guardarLugar('')">Guardar lugar</button>
    </div>
    <button class="cancelar" onclick="cerrarHoja()">Cancelar</button>`);
}
async function eliminarLugar(lid){
  if(!requiereAdmin())return;
  const l=lugarDe(lid);
  if(!confirm(`¿Eliminar el lugar “${l.nombre}”? Las galerías y fotos no se borran, pero quedarán sin lugar.`))return;
  cerrarHoja();subiendo('Eliminando…');
  await dbDelete('lugares',lid);
  await cargarDatos();renderTodo();subidaLista();
}

/* ── GALERÍAS ── */
function formGaleria(gid){
  const g=gid?galeriaDe(gid):{nombre:'',anio:new Date().getFullYear()+'',lugar_id:''};
  const ops=DATOS.lugares.map(l=>`<option value="${l.id}" ${l.id===g.lugar_id?'selected':''}>${l.nombre}</option>`).join('');
  hoja(`
    <div class="grupo">
      <div class="cab-hoja"><b>${gid?'Editar galería':'Nueva galería'}</b><span>Después podrás subir fotos desde dentro</span></div>
      <div class="campo"><label>Nombre</label><input id="in-gal-nombre" value="${g.nombre||''}" placeholder="Benidorm"></div>
      <div class="campo"><label>Año</label><input id="in-gal-anio" inputmode="numeric" value="${g.anio||''}" placeholder="2026"></div>
      <div class="campo"><label>Lugar</label>
        <select id="in-gal-lugar"><option value="">— Sin lugar —</option>${ops}</select>
      </div>
      ${gid?`<button class="principal" style="background:var(--fondo2);color:var(--tinta)" onclick="cambiarPortada('${gid}')">Cambiar portada (subir imagen)</button>`:''}
      <button class="principal" onclick="guardarGaleria('${gid||''}')">Guardar galería</button>
      ${DATOS.lugares.length?'':'<p class="nota-form">Aún no hay lugares: crea uno desde el Mapa (+) para poder asignarlo.</p>'}
    </div>
    <button class="cancelar" onclick="cerrarHoja()">Cancelar</button>`);
}
async function guardarGaleria(gid){
  if(!requiereAdmin())return;
  const fila={
    nombre:$('in-gal-nombre').value.trim(),
    anio:$('in-gal-anio').value.trim(),
    lugar_id:$('in-gal-lugar').value||null,
  };
  if(!fila.nombre){toast('La galería necesita un nombre');return;}
  cerrarHoja();subiendo('Guardando galería…');
  let nueva=null;
  if(gid)await dbUpdate('galerias',gid,fila);
  else nueva=await dbInsert('galerias',fila);
  await cargarDatos();renderTodo();subidaLista();
  if(coleccion&&$('p-colec').classList.contains('abierta'))refrescarColeccion();
  if(nueva){abrirGaleria(nueva.id);toast('Galería creada — usa + para subir fotos');}
  else toast('Galería guardada');
}
async function eliminarGaleria(gid){
  if(!requiereAdmin())return;
  const g=galeriaDe(gid);
  const n=fotosDeGaleria(gid).length;
  if(!confirm(`¿Eliminar “${g.nombre}” y sus ${n} fotos? Esta acción no se puede deshacer.`))return;
  cerrarHoja();subiendo('Eliminando galería…');
  for(const f of fotosDeGaleria(gid))await dbDelete('fotos',f.id);
  await dbDelete('galerias',gid);
  await cargarDatos();renderTodo();subidaLista();
  volverDeColec();
}
function cambiarPortada(gid){
  if(!requiereAdmin())return;
  const input=$('input-portada');
  input.onchange=async()=>{
    const file=input.files[0];input.value='';
    if(!file)return;
    cerrarHoja();subiendo('Subiendo portada…');
    const url=await subirArchivo(file,gid);
    if(url){await dbUpdate('galerias',gid,{portada_url:url});await cargarDatos();renderTodo();refrescarColeccion();}
    subidaLista();
  };
  input.click();
}
async function usarComoPortada(fid){
  if(!requiereAdmin())return;
  const f=DATOS.fotos.find(x=>x.id===fid);
  subiendo('Actualizando portada…');
  await dbUpdate('galerias',f.galeria_id,{portada_url:f.url});
  await cargarDatos();renderTodo();subidaLista();
  toast('Portada actualizada');
}

/* ── FOTOS ── */
function subirFotosAGaleria(){
  if(!requiereAdmin())return;
  if(!coleccion||coleccion.tipo!=='galeria')return;
  const input=$('input-fotos');
  input.onchange=async()=>{
    const files=[...input.files];input.value='';
    if(!files.length)return;
    const gid=coleccion.id;
    let i=0;
    for(const file of files){
      i++;subiendo(`Subiendo foto ${i} de ${files.length}…`);
      const url=await subirArchivo(file,gid);
      if(!url)continue;
      await dbInsert('fotos',{
        galeria_id:gid,titulo:file.name,url,
        vertical:null,exif:'',orden:Date.now()+i,
      });
    }
    await cargarDatos();renderTodo();refrescarColeccion();subidaLista();
    toast(`${i} foto${i>1?'s':''} subida${i>1?'s':''}`);
  };
  input.click();
}
function formFoto(fid){
  const f=DATOS.fotos.find(x=>x.id===fid);
  const ops=DATOS.lugares.map(l=>`<option value="${l.id}" ${l.id===f.lugar_id?'selected':''}>${l.nombre}</option>`).join('');
  hoja(`
    <div class="grupo">
      <div class="cab-hoja"><b>Editar foto</b><span>${f.titulo||''}</span></div>
      <div class="campo"><label>Título / archivo</label><input id="in-f-titulo" value="${f.titulo||''}"></div>
      <div class="campo"><label>EXIF (opcional)</label><input id="in-f-exif" value="${f.exif||''}" placeholder="f/2.8 · 1/640 · ISO 100 · 35mm"></div>
      <div class="campo"><label>Lugar propio (si es distinto al de la galería)</label>
        <select id="in-f-lugar"><option value="">— El de la galería —</option>${ops}</select>
      </div>
      <button class="principal" onclick="guardarFoto('${fid}')">Guardar cambios</button>
    </div>
    <button class="cancelar" onclick="cerrarHoja()">Cancelar</button>`);
}
async function guardarFoto(fid){
  if(!requiereAdmin())return;
  cerrarHoja();subiendo('Guardando…');
  await dbUpdate('fotos',fid,{
    titulo:$('in-f-titulo').value.trim(),
    exif:$('in-f-exif').value.trim(),
    lugar_id:$('in-f-lugar').value||null,
  });
  await cargarDatos();renderTodo();refrescarColeccion();subidaLista();
  toast('Foto actualizada');
}
function subirOriginal(fid){
  if(!requiereAdmin())return;
  const input=$('input-original');
  input.onchange=async()=>{
    const file=input.files[0];input.value='';
    if(!file)return;
    subiendo('Subiendo original…');
    const f=DATOS.fotos.find(x=>x.id===fid);
    const url=await subirArchivo(file,f.galeria_id+'/originales');
    if(url){await dbUpdate('fotos',fid,{url_original:url});await cargarDatos();refrescarColeccion();}
    subidaLista();
    toast('Original guardado — Antes/Después usará la foto real');
  };
  input.click();
}
async function eliminarFoto(fid){
  if(!requiereAdmin())return;
  if(!confirm('¿Eliminar esta foto? No se puede deshacer.'))return;
  cerrarHoja();subiendo('Eliminando…');
  await dbDelete('fotos',fid);
  await cargarDatos();renderTodo();
  volverDeFoto();refrescarColeccion();subidaLista();
}

/* restaurar sesión al abrir */
restaurarSesion();
