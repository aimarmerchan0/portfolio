/* ═══════════ APP: interfaz y navegación ═══════════ */

/* ── utilidades ── */
const $ = id => document.getElementById(id);
function toast(m,duracion=2400){
  const t=$('toast');t.textContent=m;t.classList.add('visible');
  clearTimeout(t._to);t._to=setTimeout(()=>t.classList.remove('visible'),duracion);
}
function hoja(html){$('hoja').innerHTML=html;$('hoja').classList.add('abierta');$('velo-hoja').classList.add('abierto');}
function cerrarHoja(){$('hoja').classList.remove('abierta');$('velo-hoja').classList.remove('abierto');}
function subiendo(txt){$('progreso-txt').textContent=txt;$('progreso-subida').classList.add('visible');}
function subidaLista(){$('progreso-subida').classList.remove('visible');}

/* ── arranque ── */
setTimeout(()=>$('arranque').classList.add('disparo'),1150);
setTimeout(()=>$('arranque').classList.add('fuera'),1400);

/* ── perfil ── */
$('menu-nombre').textContent=PERFIL.nombre;
$('menu-sub').textContent=PERFIL.subtitulo;
$('menu-lema').textContent=PERFIL.lema;
$('menu-copy').textContent=PERFIL.nombre;
$('lema-pie-txt').textContent='Mirar despacio también es un oficio';

/* ── navegación raíz ── */
const raices={inicio:$('p-inicio'),galerias:$('p-galerias'),mapa:$('p-mapa')};
let raizActual='inicio';
function irRaiz(n){
  raices[raizActual].style.display='none';
  raices[n].style.display='flex';
  raizActual=n;
  document.querySelectorAll('#menu nav button').forEach(b=>b.classList.toggle('activo',b.dataset.ir===n));
  raices[n].querySelectorAll('.entra').forEach((el,i)=>{
    el.style.animation='none';void el.offsetHeight;
    el.style.animation='';el.style.animationDelay=(i*.06+.05)+'s';
  });
  if(n==='mapa')setTimeout(iniciarMapa,120);
  cerrarMenu();
}
document.querySelectorAll('#menu nav button').forEach(b=>b.onclick=()=>irRaiz(b.dataset.ir));
function abrirMenu(){$('menu').classList.add('abierto');$('velo-menu').classList.add('abierto');}
function cerrarMenu(){$('menu').classList.remove('abierto');$('velo-menu').classList.remove('abierto');}

/* ═══ RENDER GLOBAL (se llama al cargar y tras cada cambio del admin) ═══ */
function renderTodo(){
  renderInicio();
  renderGalerias();
  renderMapaCartas();
  if(mapa)renderMarcadores();
}

/* ── INICIO ── */
function renderInicio(){
  const hora=new Date().getHours();
  $('saludo').textContent=(hora<12?'Buenos días':hora<20?'Buenas tardes':'Buenas noches')
    +' · '+new Date().toLocaleDateString('es',{day:'numeric',month:'long',year:'numeric'});
  $('menu-num-gal').textContent=DATOS.galerias.length;
  $('menu-num-lug').textContent=DATOS.lugares.length;
  $('cifras').innerHTML=`
    <div class="c"><b>${DATOS.galerias.length}</b><span>Galerías</span></div>
    <div class="c"><b>${DATOS.fotos.length}</b><span>Fotos</span></div>
    <div class="c"><b>${DATOS.lugares.length}</b><span>Lugares</span></div>`;
  $('btn-mapa-sub').textContent=`${DATOS.lugares.length} lugares · ${DATOS.fotos.length} fotos`;

  const rec=$('recientes');rec.innerHTML='';
  if(!DATOS.galerias.length)rec.innerHTML='<p class="vacio">Aún no hay galerías.</p>';
  DATOS.galerias.forEach(g=>{
    const d=document.createElement('div');
    d.className='tarjeta-mini';
    d.innerHTML=`<div class="marco"><img loading="lazy" src="${portadaDeGaleria(g)}" alt="${g.nombre}"><b>${g.nombre}</b></div>`;
    d.onclick=()=>abrirGaleria(g.id);
    rec.appendChild(d);
  });

  const il=$('inicio-lugares');il.innerHTML='';
  if(!DATOS.lugares.length)il.innerHTML='<p class="vacio">Aún no hay lugares.</p>';
  DATOS.lugares.slice(0,3).forEach(l=>il.appendChild(filaLugar(l)));
}
function filaLugar(l){
  const fotos=fotosDeLugar(l.id);
  const d=document.createElement('div');
  d.className='fila-lugar';
  d.innerHTML=`<div class="marco">${fotos[0]?`<img loading="lazy" src="${miniDe(fotos[0])}" alt="">`:''}</div>
    <div><b>${l.nombre}</b><span>${l.region||''} · ${fotos.length} fotos</span></div>
    <svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>`;
  d.onclick=()=>abrirLugar(l.id);
  return d;
}

/* ── GALERÍAS ── */
function renderGalerias(){
  const cont=$('lista-galerias');cont.innerHTML='';
  if(!DATOS.galerias.length)cont.innerHTML='<p class="vacio">Aún no hay galerías. '+(SESION?'Usa el botón + para crear la primera.':'')+'</p>';
  DATOS.galerias.forEach((g,i)=>{
    const l=lugarDe(g.lugar_id)||{};
    const n=fotosDeGaleria(g.id).length;
    const d=document.createElement('div');
    d.className='tarjeta-galeria entra';
    d.style.animationDelay=(i*.09+.06)+'s';
    d.innerHTML=`<img loading="lazy" src="${portadaDeGaleria(g)}" alt="${g.nombre}">
      <span class="indice">${String(i+1).padStart(2,'0')} — ${String(DATOS.galerias.length).padStart(2,'0')}</span>
      <div class="datos"><b>${g.nombre}</b><span>${n} fotos${l.nombre?' · '+l.nombre:''}${g.anio?' · '+g.anio:''}</span></div>
      <div class="puntos">···</div>`;
    d.onclick=e=>{
      if(e.target.closest('.puntos')){hojaGaleria(g.id);return;}
      abrirGaleria(g.id);
    };
    cont.appendChild(d);
  });
}

/* ── MAPA ── */
let mapa=null,capaMarcadores=null,intentosMapa=0;
function fallbackMapa(txt){
  const f=$('mapa-fallback');
  if(txt){ $('mapa-fallback-txt').textContent=txt; f.classList.add('visible'); }
  else f.classList.remove('visible');
}
function iniciarMapa(){
  if(mapa){mapa.invalidateSize();return;}
  if(typeof L==='undefined'){
    intentosMapa++;
    if(intentosMapa<=8){setTimeout(iniciarMapa,400);return;}
    fallbackMapa('La librería del mapa (Leaflet) no ha podido cargarse. Revisa tu conexión a internet y recarga.');
    return;
  }
  const cont=$('mapa-zona');
  const r=cont.getBoundingClientRect();
  if(r.height<40){
    /* el contenedor aún no tiene alto real: reintenta antes de rendirte */
    intentosMapa++;
    if(intentosMapa<=8){setTimeout(iniciarMapa,300);return;}
    fallbackMapa('El contenedor del mapa no tiene tamaño ('+Math.round(r.width)+'×'+Math.round(r.height)+'px). Es probable que css/estilos.css no se haya subido completo a GitHub — revisa que el archivo no esté cortado.');
    return;
  }
  try{
    mapa=L.map('mapa',{zoomControl:false,attributionControl:true,tap:true});
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
      attribution:'© OpenStreetMap · © CARTO',maxZoom:19,detectRetina:true
    }).addTo(mapa);
    capaMarcadores=L.layerGroup().addTo(mapa);
    mapa.on('click',e=>{ if(typeof clickMapaAdmin==='function')clickMapaAdmin(e); });
    renderMarcadores(true);
    fallbackMapa(null);
    [0,250,600,1200].forEach(ms=>setTimeout(()=>mapa&&mapa.invalidateSize(),ms));
    window.addEventListener('resize',()=>mapa&&mapa.invalidateSize());
    window.addEventListener('orientationchange',()=>setTimeout(()=>mapa&&mapa.invalidateSize(),300));
  }catch(err){
    console.error(err);
    fallbackMapa('Error al crear el mapa: '+err.message);
  }
}
function renderMarcadores(encuadrar=false){
  if(!mapa)return;
  try{
    capaMarcadores.clearLayers();
    const limites=[];
    DATOS.lugares.forEach((l,i)=>{
      if(l.lat==null||l.lng==null)return;
      const fotos=fotosDeLugar(l.id);
      const icono=L.divIcon({
        className:'',
        html:`<div class="pin" id="pin-${l.id}" style="animation-delay:${i*.09+.15}s">
                <div class="foto-pin">${fotos[0]?`<img src="${miniDe(fotos[0])}" alt="">`:''}</div>
                <span class="cuenta">${fotos.length}</span>
              </div>`,
        iconSize:[52,52],iconAnchor:[26,26]
      });
      const m=L.marker([l.lat,l.lng],{icon:icono}).addTo(capaMarcadores);
      m.on('click',()=>seleccionarLugar(l.id,true));
      limites.push([l.lat,l.lng]);
    });
    if(encuadrar&&limites.length)mapa.fitBounds(limites,{padding:[60,60],maxZoom:8});
  }catch(err){
    console.error(err);
    toast('Error al pintar los marcadores: '+err.message,4500);
  }
}
function renderMapaCartas(){
  try{
    const cont=$('mapa-cartas');cont.innerHTML='';
    DATOS.lugares.forEach(l=>{
      const fotos=fotosDeLugar(l.id);
      const gals=[...new Set(fotos.map(f=>f.galeria))].filter(Boolean);
      const d=document.createElement('div');
      d.className='carta-lugar';
      d.id='carta-'+l.id;
      d.innerHTML=`<div class="marco">${fotos[0]?`<img loading="lazy" src="${miniDe(fotos[0])}" alt="">`:''}</div>
        <div class="datos"><b>${l.nombre}</b><span>${fotos.length} fotos${gals.length?' · '+gals.length+' galería'+(gals.length>1?'s':''):''}</span></div>
        <button class="ver">Ver</button>`;
      d.querySelector('.ver').onclick=e=>{e.stopPropagation();abrirLugar(l.id);};
      d.onclick=()=>seleccionarLugar(l.id);
      d.oncontextmenu=e=>{e.preventDefault();};
      cont.appendChild(d);
    });
  }catch(err){
    console.error(err);
    toast('Error al listar lugares: '+err.message,4500);
  }
}
function seleccionarLugar(id,desdePin=false){
  document.querySelectorAll('.carta-lugar').forEach(c=>c.classList.toggle('viva',c.id==='carta-'+id));
  document.querySelectorAll('.pin').forEach(p=>p.classList.toggle('activo',p.id==='pin-'+id));
  const l=lugarDe(id);
  if(mapa&&l&&l.lat!=null)mapa.flyTo([l.lat,l.lng],7,{duration:1.1});
  const carta=$('carta-'+id);
  if(carta)carta.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
  if(desdePin&&SESION){hojaLugar(id);return;}
  if(desdePin)toast(`${l.nombre} — toca “Ver” para abrir sus fotos`);
}

/* ═══ COLECCIÓN (galería o lugar) ═══ */
let coleccion=null;
function abrirGaleria(gid){
  const g=galeriaDe(gid);if(!g)return;
  const l=lugarDe(g.lugar_id)||{};
  abrirColeccion({
    id:gid,tipo:'galeria',titulo:g.nombre,
    sub:[l.nombre,g.anio].filter(Boolean).join(' · '),
    portada:portadaDeGaleria(g),
    fotos:fotosDeGaleria(gid),
    mostrarOrigen:false,
  });
}
function abrirLugar(lid){
  const l=lugarDe(lid);if(!l)return;
  const fotos=fotosDeLugar(lid);
  const nG=[...new Set(fotos.map(f=>f.galeria))].filter(Boolean).length;
  abrirColeccion({
    id:lid,tipo:'lugar',titulo:l.nombre,
    sub:`${l.region||''} · ${fotos.length} fotos${nG?` de ${nG} galería${nG>1?'s':''}`:''}`,
    portada:fotos[0]?fotos[0].url:'',
    fotos,mostrarOrigen:true,
  });
}
function abrirColeccion(c){
  coleccion=c;
  $('col-cover').src=c.portada||'';
  $('col-nombre').textContent=c.titulo;
  $('col-sub').textContent=c.sub;
  $('col-titulo-mini').textContent=c.titulo;
  $('col-n').textContent=c.fotos.length;
  $('fab-colec').classList.toggle('visible',c.tipo==='galeria');
  const grid=$('col-grid');grid.innerHTML='';
  if(!c.fotos.length)grid.innerHTML='<p class="vacio" style="columns:1">Sin fotos todavía.</p>';
  c.fotos.forEach((f,j)=>{
    const cel=document.createElement('div');
    cel.className='celda';
    cel.style.animationDelay=(j*.05+.15)+'s';
    cel.innerHTML=`<img loading="lazy" src="${f.url}" alt="${f.titulo||''}">
      ${c.mostrarOrigen&&f.galeria?`<span class="de">${f.galeria}</span>`:''}`;
    cel.onclick=()=>abrirFoto(j);
    grid.appendChild(cel);
  });
  $('col-scroll').scrollTop=0;
  $('col-topbar').classList.remove('solida');
  $('p-colec').classList.add('abierta');
  document.body.classList.add('empujada');
}
function refrescarColeccion(){
  if(!coleccion)return;
  if(coleccion.tipo==='galeria')abrirGaleria(coleccion.id);
  else abrirLugar(coleccion.id);
}
function volverDeColec(){
  $('p-colec').classList.remove('abierta');
  document.body.classList.remove('empujada');
}
$('col-scroll').addEventListener('scroll',()=>{
  const y=$('col-scroll').scrollTop;
  $('col-topbar').classList.toggle('solida',y>140);
  $('col-cover').style.transform=`translateY(${y*.35}px)`;
},{passive:true});

function hojaGaleria(gid){
  const g=galeriaDe(gid), l=lugarDe(g.lugar_id)||{};
  const n=fotosDeGaleria(gid).length;
  hoja(`
    <div class="grupo">
      <div class="cab-hoja"><b>${g.nombre}</b><span>${n} fotos${l.nombre?' · '+l.nombre:''}${g.anio?' · '+g.anio:''}</span></div>
      <button class="opcion" onclick="cerrarHoja();abrirGaleria('${gid}')">Abrir galería</button>
      ${l.id?`<button class="opcion" onclick="cerrarHoja();abrirLugar('${l.id}')">Ver todo lo de ${l.nombre}</button>`:''}
      ${SESION?`
        <button class="opcion" onclick="cerrarHoja();formGaleria('${gid}')">Editar galería</button>
        <button class="opcion peligro" onclick="eliminarGaleria('${gid}')">Eliminar galería</button>`:''}
    </div>
    <button class="cancelar" onclick="cerrarHoja()">Cancelar</button>`);
}
function abrirHojaColec(){
  if(coleccion.tipo==='galeria'){hojaGaleria(coleccion.id);return;}
  hojaLugar(coleccion.id);
}
function hojaLugar(lid){
  const l=lugarDe(lid);
  const n=fotosDeLugar(lid).length;
  hoja(`
    <div class="grupo">
      <div class="cab-hoja"><b>${l.nombre}</b><span>${l.region||''} · ${n} fotos · ${(+l.lat).toFixed(4)}, ${(+l.lng).toFixed(4)}</span></div>
      <button class="opcion" onclick="cerrarHoja();abrirLugar('${lid}')">Ver las ${n} fotos</button>
      ${SESION?`
        <button class="opcion" onclick="cerrarHoja();formLugar('${lid}')">Editar lugar</button>
        <button class="opcion" onclick="cerrarHoja();reubicarLugar('${lid}')">Cambiar ubicación en el mapa</button>
        <button class="opcion peligro" onclick="eliminarLugar('${lid}')">Eliminar lugar</button>`:''}
    </div>
    <button class="cancelar" onclick="cerrarHoja()">Cancelar</button>`);
}

/* ═══ VISOR ═══ */
let fotoIdx=0,slides=[],pulgs=[],cmpActivo=false;
const carro=$('foto-carro'),tira=$('tira');
function abrirFoto(j){
  fotoIdx=j;
  carro.innerHTML='';tira.innerHTML='';
  coleccion.fotos.forEach((f,k)=>{
    const s=document.createElement('div');
    s.className='foto-slide';
    s.innerHTML=`<img class="eco" src="${miniDe(f)}" alt="">
      <div class="marco"><img src="${f.url}" alt="${f.titulo||''}"></div>`;
    carro.appendChild(s);
    const t=document.createElement('button');
    t.className='pulg';
    t.innerHTML=`<img loading="lazy" src="${miniDe(f)}" alt="">`;
    t.onclick=()=>{quitarComparador();irAFoto(k);};
    tira.appendChild(t);
  });
  slides=[...carro.children];pulgs=[...tira.children];
  irAFoto(j,true);
  $('p-foto').classList.add('abierta');
  document.body.classList.add('nivel2');
}
function volverDeFoto(){
  quitarComparador();
  $('p-foto').classList.remove('abierta');
  document.body.classList.remove('nivel2');
}
function irAFoto(k,inmediato=false){
  fotoIdx=k;
  if(inmediato)carro.style.transition='none';
  carro.style.transform=`translateX(${-k*100}%)`;
  if(inmediato)requestAnimationFrame(()=>carro.style.transition='');
  const f=coleccion.fotos[k];
  $('foto-archivo').textContent=f.titulo||'Sin título';
  $('foto-num').textContent=`${k+1} de ${coleccion.fotos.length} · ${coleccion.titulo}`;
  pulgs.forEach((p,x)=>p.classList.toggle('viva',x===k));
  if(pulgs[k])pulgs[k].scrollIntoView({behavior:inmediato?'auto':'smooth',inline:'center',block:'nearest'});
}
let sx=null,sy=null;
const zona=$('foto-zona');
zona.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;},{passive:true});
zona.addEventListener('touchend',e=>{
  if(sx===null||cmpActivo)return;
  const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;
  if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)){
    const n=fotoIdx+(dx<0?1:-1);
    if(n>=0&&n<slides.length)irAFoto(n);
  }
  sx=sy=null;
},{passive:true});
/* pulsación larga: ver original */
let pulsoTimer=null;
zona.addEventListener('touchstart',()=>{
  if(cmpActivo)return;
  pulsoTimer=setTimeout(()=>{
    const f=coleccion.fotos[fotoIdx];
    const img=slides[fotoIdx].querySelector('.marco > img');
    if(f.url_original){img.dataset.editada=img.src;img.src=f.url_original;}
    else img.classList.add('filtro-raw');
    $('peek').classList.add('visible');
  },260);
},{passive:true});
['touchend','touchmove','touchcancel'].forEach(ev=>zona.addEventListener(ev,()=>{
  clearTimeout(pulsoTimer);
  slides.forEach(s=>{
    const img=s.querySelector('.marco > img');
    if(img.dataset.editada){img.src=img.dataset.editada;delete img.dataset.editada;}
    img.classList.remove('filtro-raw');
  });
  $('peek').classList.remove('visible');
},{passive:true}));

/* comparador antes/después: usa el original real si existe */
function alternarComparador(){cmpActivo?quitarComparador():ponerComparador();}
function ponerComparador(){
  cmpActivo=true;
  $('btn-cmp').classList.add('activo');
  const f=coleccion.fotos[fotoIdx];
  const marco=slides[fotoIdx].querySelector('.marco');
  const base=marco.querySelector('img');
  if(f.url_original){base.dataset.editada=base.src;base.src=f.url_original;}
  else base.classList.add('filtro-raw');
  marco.insertAdjacentHTML('beforeend',`
    <div class="cmp-capa" style="--pos:50%"><img src="${f.url}" alt=""></div>
    <div class="cmp-div" style="--pos:50%"><div class="asa">⟨⟩</div></div>
    <span class="cmp-tag a">Antes</span><span class="cmp-tag b">Después</span>`);
  const capa=marco.querySelector('.cmp-capa'),divi=marco.querySelector('.cmp-div');
  let arr=false;
  const mover=x=>{
    const r=marco.getBoundingClientRect();
    const pos=Math.min(96,Math.max(4,(x-r.left)/r.width*100))+'%';
    capa.style.setProperty('--pos',pos);divi.style.setProperty('--pos',pos);
  };
  marco.onpointerdown=e=>{arr=true;marco.setPointerCapture(e.pointerId);mover(e.clientX);};
  marco.onpointermove=e=>{if(arr)mover(e.clientX);};
  marco.onpointerup=marco.onpointercancel=()=>arr=false;
  toast(f.url_original?'Comparando con el archivo original':'Arrastra el divisor para comparar');
}
function quitarComparador(){
  if(!cmpActivo)return;
  cmpActivo=false;
  $('btn-cmp').classList.remove('activo');
  slides.forEach(s=>{
    const m=s.querySelector('.marco');
    m.querySelectorAll('.cmp-capa,.cmp-div,.cmp-tag').forEach(x=>x.remove());
    const img=m.querySelector('img');
    if(img.dataset.editada){img.src=img.dataset.editada;delete img.dataset.editada;}
    img.classList.remove('filtro-raw');
    m.onpointerdown=m.onpointermove=m.onpointerup=null;
  });
}
function compartirFoto(){
  const f=coleccion.fotos[fotoIdx];
  if(navigator.share){navigator.share({title:f.titulo||PERFIL.nombre,url:f.url}).catch(()=>{});}
  else{toast('Compartir no está disponible en este navegador');}
}
function abrirHojaInfo(){
  const f=coleccion.fotos[fotoIdx];
  hoja(`
    <div class="grupo">
      <div class="cab-hoja"><b>${f.titulo||'Sin título'}</b><span>${coleccion.titulo}${f.galeria&&coleccion.tipo==='lugar'?' · Galería '+f.galeria:''}</span></div>
      ${f.exif?`<div class="dato">Ajustes <span>${f.exif}</span></div>`:''}
      <div class="dato">Original (antes) <span>${f.url_original?'Sí — se usa al comparar':'No subido (se simula)'}</span></div>
      ${SESION?`
        <button class="opcion" onclick="cerrarHoja();formFoto('${f.id}')">Editar título / EXIF / lugar</button>
        <button class="opcion" onclick="cerrarHoja();subirOriginal('${f.id}')">Subir foto original (antes)</button>
        <button class="opcion" onclick="cerrarHoja();usarComoPortada('${f.id}')">Usar como portada de la galería</button>
        <button class="opcion peligro" onclick="eliminarFoto('${f.id}')">Eliminar foto</button>`:''}
    </div>
    <button class="cancelar" onclick="cerrarHoja()">Cerrar</button>`);
}
document.addEventListener('keydown',e=>{
  if(!$('p-foto').classList.contains('abierta'))return;
  if(e.key==='ArrowRight'&&fotoIdx<slides.length-1)irAFoto(fotoIdx+1);
  if(e.key==='ArrowLeft'&&fotoIdx>0)irAFoto(fotoIdx-1);
  if(e.key==='Escape')volverDeFoto();
});

/* ═══ FABs ═══ */
function fabGalerias(){
  if(!SESION){toast('Modo exposición — inicia sesión para añadir galerías');return;}
  formGaleria(null);
}
function fabMapa(){
  if(!SESION){toast('Modo exposición — inicia sesión para añadir lugares');return;}
  hoja(`
    <div class="grupo">
      <div class="cab-hoja"><b>Añadir lugar</b><span>Elige cómo quieres crearlo</span></div>
      <button class="opcion" onclick="cerrarHoja();toast('Toca cualquier punto del mapa para crear ahí un lugar',3200)">Tocar el mapa (recomendado)</button>
      <button class="opcion" onclick="cerrarHoja();formLugar(null)">Escribir coordenadas a mano</button>
    </div>
    <button class="cancelar" onclick="cerrarHoja()">Cancelar</button>`);
}

/* ═══ arranque de datos ═══ */
(async()=>{
  try{
    await cargarDatos();
    renderTodo();
  }catch(err){
    console.error(err);
    document.dispatchEvent(new Event('DOMContentLoaded')); /* asegura que el diagnóstico se pinte */
    toast('Error cargando la app: '+err.message,6000);
  }
})();
