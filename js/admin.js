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
  if($('btn-miniaturas'))$('btn-miniaturas').style.display=SESION?'block':'none';
  if(window.__diagActualizar)window.__diagActualizar(!!SESION);
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
      <div class="cab-hoja"><b>${lid?'Editar lugar':'Nuevo lugar'}</b><span>Busca una dirección, o cierra esto y toca el mapa directamente</span></div>
      <div class="campo">
        <label>Buscar dirección</label>
        <div class="doble">
          <input id="in-lug-buscar" placeholder="Alicante, España" onkeydown="if(event.key==='Enter'){event.preventDefault();buscarDireccionForm();}">
          <button class="principal" style="width:auto;margin:0;padding:12px 18px" onclick="buscarDireccionForm()">Buscar</button>
        </div>
        <div id="resultados-direccion"></div>
      </div>
      <div class="campo"><label>Nombre</label><input id="in-lug-nombre" value="${l.nombre||''}" placeholder="Benidorm"></div>
      <div class="campo"><label>Región / país</label><input id="in-lug-region" value="${l.region||''}" placeholder="Alicante, España"></div>
      <div class="campo"><label>Coordenadas (lat, lng)</label>
        <div class="doble">
          <input id="in-lug-lat" inputmode="decimal" value="${l.lat??''}" placeholder="38.5342">
          <input id="in-lug-lng" inputmode="decimal" value="${l.lng??''}" placeholder="-0.1314">
        </div>
      </div>
      <button class="principal" onclick="guardarLugar('${lid||''}')">Guardar lugar</button>
      <p class="nota-form">La búsqueda de dirección rellena nombre, región y coordenadas automáticamente — puedes editarlas después.</p>
    </div>
    <button class="cancelar" onclick="cerrarHoja()">Cancelar</button>`);
}
async function buscarDireccionForm(){
  const q=$('in-lug-buscar').value.trim();
  if(!q){toast('Escribe una dirección o lugar para buscar');return;}
  const cont=$('resultados-direccion');
  cont.innerHTML='<div class="resultado-dir cargando">Buscando…</div>';
  const resultados=await buscarDireccion(q);
  if(!resultados.length){cont.innerHTML='<div class="resultado-dir cargando">Sin resultados — prueba con otro texto</div>';return;}
  cont.innerHTML=resultados.map((r,i)=>`
    <button class="resultado-dir" onclick="elegirDireccion(${i})">
      <b>${r.nombre}</b><span>${r.region}</span>
    </button>`).join('');
  window.__resultadosDir=resultados;
}
function elegirDireccion(i){
  const r=window.__resultadosDir[i];
  if(!$('in-lug-nombre').value.trim())$('in-lug-nombre').value=r.nombre;
  $('in-lug-region').value=r.region;
  $('in-lug-lat').value=r.lat.toFixed(6);
  $('in-lug-lng').value=r.lng.toFixed(6);
  $('resultados-direccion').innerHTML='';
  toast('Coordenadas rellenadas — revisa y guarda');
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
  if(!lid){
    const parecido=buscarLugarSimilar(nombre,lat,lng);
    if(parecido){
      cerrarHoja();
      hoja(`
        <div class="grupo">
          <div class="cab-hoja"><b>Ya existe un lugar parecido</b><span>${parecido.nombre} · ${parecido.region||''}</span></div>
          <button class="opcion" onclick="cerrarHoja();abrirLugar('${parecido.id}')">Usar «${parecido.nombre}» (recomendado)</button>
          <button class="opcion" onclick="continuarGuardarLugar('${nombre.replace(/'/g,"\\'")}','${region.replace(/'/g,"\\'")}',${lat},${lng})">Crear de todas formas un lugar nuevo</button>
        </div>
        <button class="cancelar" onclick="cerrarHoja()">Cancelar</button>`);
      return;
    }
  }
  await continuarGuardarLugar(nombre,region,lat,lng,lid);
}
async function continuarGuardarLugar(nombre,region,lat,lng,lid=''){
  const fila={nombre,region,lat,lng};
  cerrarHoja();subiendo('Guardando lugar…');
  let ok,nuevo=null;
  if(lid)ok=await dbUpdate('lugares',lid,fila);
  else {nuevo=await dbInsert('lugares',fila);ok=!!nuevo;}
  subidaLista();
  if(!ok)return;
  await cargarDatos();renderTodo();
  if(nuevo){
    hoja(`
      <div class="grupo">
        <div class="cab-hoja"><b>Lugar creado</b><span>${nombre}</span></div>
        <button class="opcion" onclick="cerrarHoja();subirFotosALugar('${nuevo.id}')">Añadir fotos ahora</button>
        <button class="opcion" onclick="cerrarHoja();abrirLugar('${nuevo.id}')">Ver el lugar</button>
      </div>
      <button class="cancelar" onclick="cerrarHoja()">Ahora no</button>`);
  }else toast(lat!=null&&lng!=null?'Lugar guardado y ubicado en el mapa':'Lugar guardado — sin coordenadas, no aparecerá en el mapa hasta que se las añadas');
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
let _lugarNuevoGaleria=null,_lugarGaleriaTimer=null;
function formGaleria(gid){
  const g=gid?galeriaDe(gid):{nombre:'',anio:'',lugar_id:''};
  const lugarActual=g.lugar_id?lugarDe(g.lugar_id):null;
  _lugarNuevoGaleria=null;
  hoja(`
    <div class="grupo">
      <div class="cab-hoja"><b>${gid?'Editar galería':'Nueva galería'}</b><span>Las fechas se ponen en cada foto — aquí no hace falta</span></div>
      <div class="campo"><label>Nombre</label><input id="in-gal-nombre" value="${g.nombre||''}" placeholder="Benidorm"></div>
      <div class="campo"><label>Año (opcional, solo de referencia)</label><input id="in-gal-anio" inputmode="numeric" value="${g.anio||''}" placeholder="2026"></div>
      <div class="campo">
        <label>Lugar</label>
        <input id="in-gal-lugar-buscar" placeholder="Busca uno existente o escribe una dirección…" autocomplete="off"
          value="${lugarActual?lugarActual.nombre:''}"
          oninput="buscarLugarGaleria(this.value)" onfocus="buscarLugarGaleria(this.value)">
        <input type="hidden" id="in-gal-lugar-id" value="${g.lugar_id||''}">
        <div id="resultados-lugar-galeria"></div>
      </div>
      ${gid?`<button class="principal" style="background:var(--fondo2);color:var(--tinta)" onclick="cambiarPortada('${gid}')">Cambiar portada (subir imagen)</button>`:''}
      <button class="principal" onclick="guardarGaleria('${gid||''}')">Guardar galería</button>
    </div>
    <button class="cancelar" onclick="cerrarHoja()">Cancelar</button>`);
}
function buscarLugarGaleria(q){
  clearTimeout(_lugarGaleriaTimer);
  const texto=(q||'').trim().toLowerCase();
  const cont=$('resultados-lugar-galeria');
  const locales=DATOS.lugares.filter(l=>!texto||l.nombre.toLowerCase().includes(texto)||(l.region||'').toLowerCase().includes(texto)).slice(0,6);
  let html='';
  if(locales.length){
    html+='<div class="resultado-cab">Tus lugares</div>'+
      locales.map(l=>`<button class="resultado-dir" onclick="elegirLugarGaleria('${l.id}','${l.nombre.replace(/'/g,"\\'")}')"><b>${l.nombre}</b><span>${l.region||''}</span></button>`).join('');
  }
  if(texto&&!locales.length){
    html+='<div class="resultado-dir cargando">Sin lugares que coincidan — sigue escribiendo para buscar una dirección</div>';
  }
  cont.innerHTML=html;
  if(texto.length<3)return;
  _lugarGaleriaTimer=setTimeout(async()=>{
    const resultados=await buscarDireccion(texto);
    const nuevos=resultados.filter(r=>!DATOS.lugares.some(l=>l.nombre.toLowerCase()===r.nombre.toLowerCase()));
    if(!nuevos.length)return;
    window.__nuevosLugarGaleria=nuevos;
    cont.innerHTML+='<div class="resultado-cab">Crear lugar nuevo</div>'+
      nuevos.map((r,i)=>`<button class="resultado-dir" onclick="elegirLugarNuevoGaleria(${i})"><b>${r.nombre}</b><span>${r.region}</span></button>`).join('');
  },450);
}
function elegirLugarGaleria(id,nombre){
  $('in-gal-lugar-buscar').value=nombre;
  $('in-gal-lugar-id').value=id;
  _lugarNuevoGaleria=null;
  $('resultados-lugar-galeria').innerHTML='';
}
function elegirLugarNuevoGaleria(i){
  const r=window.__nuevosLugarGaleria[i];
  $('in-gal-lugar-buscar').value=r.nombre;
  $('in-gal-lugar-id').value='';
  _lugarNuevoGaleria=r;
  $('resultados-lugar-galeria').innerHTML='';
}
async function guardarGaleria(gid){
  if(!requiereAdmin())return;
  let lugarId=$('in-gal-lugar-id').value||null;
  if(!$('in-gal-lugar-buscar').value.trim()){lugarId=null;_lugarNuevoGaleria=null;}
  if(!lugarId&&_lugarNuevoGaleria){
    const r=_lugarNuevoGaleria;
    const parecido=buscarLugarSimilar(r.nombre,r.lat,r.lng);
    if(parecido)lugarId=parecido.id;
    else{
      const nuevo=await dbInsert('lugares',{nombre:r.nombre,region:r.region,lat:r.lat,lng:r.lng});
      if(!nuevo)return;
      lugarId=nuevo.id;
    }
  }
  const fila={
    nombre:$('in-gal-nombre').value.trim(),
    anio:$('in-gal-anio').value.trim(),
    lugar_id:lugarId,
  };
  if(!fila.nombre){toast('La galería necesita un nombre');return;}
  if(!gid)fila.orden=Date.now();
  cerrarHoja();subiendo('Guardando galería…');
  let nueva=null;
  if(gid)await dbUpdate('galerias',gid,fila);
  else nueva=await dbInsert('galerias',fila);
  await cargarDatos();renderTodo();subidaLista();
  if(coleccion&&$('p-colec').classList.contains('abierta'))refrescarColeccion();
  if(nueva){abrirGaleria(nueva.id);toast('Galería creada — usa + para subir fotos');}
  else toast('Galería guardada');
}
/* reordenar galerías: intercambia el valor "orden" con la vecina */
async function moverGaleria(gid,dir){
  if(!requiereAdmin())return;
  const idx=DATOS.galerias.findIndex(g=>g.id===gid);
  const idx2=idx+dir;
  if(idx<0||idx2<0||idx2>=DATOS.galerias.length)return;
  const a=DATOS.galerias[idx],b=DATOS.galerias[idx2];
  const ordenA=a.orden??0,ordenB=b.orden??0;
  const ok1=await dbUpdate('galerias',a.id,{orden:ordenB});
  const ok2=await dbUpdate('galerias',b.id,{orden:ordenA});
  if(!ok1||!ok2)return;
  await cargarDatos();renderTodo();
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
    if(esFormatoNoVisible(file.name)){
      toast('Ese archivo es RAW y ningún navegador puede mostrarlo. Expórtalo a JPG primero.',6500);
      return;
    }
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
let _fechaLoteActual=null,_alContinuarLote=null;
function pedirFechaLote(fechaSugerida,alContinuar){
  _alContinuarLote=alContinuar;
  hoja(`
    <div class="grupo">
      <div class="cab-hoja"><b>Fecha de estas fotos</b><span>Se aplica a todo lo que subas ahora — puedes cambiarla luego foto a foto</span></div>
      <div class="campo"><label>Fecha</label><input id="in-lote-fecha" type="date" value="${fechaSugerida||''}"></div>
      <button class="principal" onclick="continuarLoteFecha()">Elegir fotos…</button>
    </div>
    <button class="cancelar" onclick="cerrarHoja()">Cancelar</button>`);
}
function continuarLoteFecha(){
  _fechaLoteActual=$('in-lote-fecha').value||null;
  cerrarHoja();
  if(_alContinuarLote)_alContinuarLote();
}
function subirFotosAGaleria(){
  if(!requiereAdmin())return;
  if(!coleccion)return;
  if(coleccion.tipo==='lugar'){subirFotosALugar(coleccion.id);return;}
  const hoy=new Date().toISOString().slice(0,10);
  pedirFechaLote(hoy,()=>{
    const input=$('input-fotos');
    input.onchange=async()=>{
      const todos=[...input.files];input.value='';
      if(!todos.length)return;
      const files=todos.filter(f=>!esFormatoNoVisible(f.name));
      if(todos.length>files.length){
        toast(`${todos.length-files.length} archivo(s) RAW omitido(s) — ningún navegador puede mostrarlos. Expórtalos a JPG primero.`,6500);
      }
      if(!files.length)return;
      const gid=coleccion.id;
      subiendo(`Subiendo 0 de ${files.length}…`);
      const resultados=await subirVariosConMiniatura(files,gid,(hechos,total)=>subiendo(`Subiendo ${hechos} de ${total}…`));
      let creadas=0;
      for(let i=0;i<files.length;i++){
        const r=resultados[i];
        if(!r||!r.url)continue;
        const ok=await dbInsert('fotos',{
          galeria_id:gid,titulo:files[i].name,url:r.url,miniatura:r.miniatura,
          vertical:null,exif:'',orden:Date.now()+i,fecha:_fechaLoteActual||hoy,
        });
        if(ok)creadas++;
      }
      await cargarDatos();renderTodo();refrescarColeccion();subidaLista();
      const fallidas=files.length-creadas;
      toast(`${creadas} foto${creadas!==1?'s':''} subida${creadas!==1?'s':''}${fallidas?` — ${fallidas} fallaron`:''}`);
    };
    input.click();
  });
}
function subirFotosALugar(lugarId){
  if(!requiereAdmin())return;
  const hoy=new Date().toISOString().slice(0,10);
  pedirFechaLote(hoy,()=>{
    const input=$('input-fotos');
    input.onchange=async()=>{
      const todos=[...input.files];input.value='';
      if(!todos.length)return;
      const files=todos.filter(f=>!esFormatoNoVisible(f.name));
      if(todos.length>files.length){
        toast(`${todos.length-files.length} archivo(s) RAW omitido(s) — ningún navegador puede mostrarlos. Expórtalos a JPG primero.`,6500);
      }
      if(!files.length)return;
      subiendo(`Subiendo 0 de ${files.length}…`);
      const resultados=await subirVariosConMiniatura(files,'lugar-'+lugarId,(hechos,total)=>subiendo(`Subiendo ${hechos} de ${total}…`));
      let creadas=0;
      for(let i=0;i<files.length;i++){
        const r=resultados[i];
        if(!r||!r.url)continue;
        const ok=await dbInsert('fotos',{
          galeria_id:null,lugar_id:lugarId,titulo:files[i].name,url:r.url,miniatura:r.miniatura,
          vertical:null,exif:'',orden:Date.now()+i,fecha:_fechaLoteActual||hoy,
        });
        if(ok)creadas++;
      }
      await cargarDatos();renderTodo();
      if(coleccion&&coleccion.id===lugarId)refrescarColeccion();
      else abrirLugar(lugarId);
      subidaLista();
      const fallidas=files.length-creadas;
      toast(`${creadas} foto${creadas!==1?'s':''} añadida${creadas!==1?'s':''} a este lugar${fallidas?` — ${fallidas} fallaron`:''}`);
    };
    input.click();
  });
}
/* reordenar: intercambia el valor "orden" con la foto vecina */
async function moverFoto(fid,dir){
  if(!requiereAdmin())return;
  const idx=coleccion.fotos.findIndex(f=>f.id===fid);
  const idx2=idx+dir;
  if(idx<0||idx2<0||idx2>=coleccion.fotos.length)return;
  const a=coleccion.fotos[idx],b=coleccion.fotos[idx2];
  const ordenA=a.orden??0,ordenB=b.orden??0;
  const ok1=await dbUpdate('fotos',a.id,{orden:ordenB});
  const ok2=await dbUpdate('fotos',b.id,{orden:ordenA});
  if(!ok1||!ok2)return;
  await cargarDatos();
  refrescarColeccion();
}
function formFoto(fid){
  const f=DATOS.fotos.find(x=>x.id===fid);
  const ops=DATOS.lugares.map(l=>`<option value="${l.id}" ${l.id===f.lugar_id?'selected':''}>${l.nombre}</option>`).join('');
  hoja(`
    <div class="grupo">
      <div class="cab-hoja"><b>Editar foto</b><span>${f.titulo||''}</span></div>
      <div class="campo"><label>Título / archivo</label><input id="in-f-titulo" value="${f.titulo||''}"></div>
      <div class="campo"><label>Fecha</label><input id="in-f-fecha" type="date" value="${f.fecha||''}"></div>
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
    fecha:$('in-f-fecha').value||null,
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
    if(esFormatoNoVisible(file.name)){
      const ext=file.name.split('.').pop().toUpperCase();
      toast(`Ese archivo es un RAW (.${ext}) y ningún navegador puede mostrarlo. Expórtalo como JPG (desde Lightroom, Photos o tu editor) y súbelo así.`,7000);
      return;
    }
    subiendo('Subiendo original…');
    const f=DATOS.fotos.find(x=>x.id===fid);
    const carpeta=f.galeria_id?f.galeria_id+'/originales':'lugar-'+f.lugar_id+'/originales';
    const url=await subirArchivo(file,carpeta);
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

/* ── mantenimiento: generar miniaturas para fotos subidas antes de esta función ── */
async function generarMiniaturasFaltantes(){
  if(!requiereAdmin())return;
  const faltan=DATOS.fotos.filter(f=>!f.miniatura);
  if(!faltan.length){toast('Todas las fotos ya tienen miniatura — nada que hacer');return;}
  if(!confirm(`Se generarán miniaturas ligeras para ${faltan.length} foto(s) antiguas, para que carguen mucho más rápido. Puede tardar un rato. ¿Continuar?`))return;
  let hechas=0,fallidas=0;
  for(const f of faltan){
    subiendo(`Generando miniaturas… ${hechas+fallidas} de ${faltan.length}`);
    try{
      const res=await fetch(f.url);
      if(!res.ok)throw new Error('HTTP '+res.status);
      const blob=await res.blob();
      const file=new File([blob],'foto.jpg',{type:blob.type||'image/jpeg'});
      const mini=await generarMiniatura(file);
      if(!mini)throw new Error('no se pudo generar');
      const carpeta=f.galeria_id?f.galeria_id:('lugar-'+(f.lugar_id||'suelto'));
      const url=await _subirUnArchivo(mini,carpeta,'_mini');
      if(!url)throw new Error('no se pudo subir');
      const ok=await dbUpdate('fotos',f.id,{miniatura:url});
      ok?hechas++:fallidas++;
    }catch(err){
      console.error('miniatura fallida para',f.id,err);
      fallidas++;
    }
  }
  await cargarDatos();renderTodo();
  subidaLista();
  toast(`Miniaturas generadas: ${hechas}${fallidas?` — ${fallidas} fallaron`:''}`,5000);
}

/* restaurar sesión al abrir */
restaurarSesion();
