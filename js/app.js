/* ═══════════ APP: interfaz y navegación ═══════════ */

/* ── escala fija, como una app nativa: iOS ignora user-scalable, así que se bloquea aquí ── */
['gesturestart','gesturechange','gestureend'].forEach(ev=>
  document.addEventListener(ev,e=>e.preventDefault(),{passive:false})
);

/* ── utilidades ── */
const $ = id => {
  const el = document.getElementById(id);
  if (!el) console.warn('Elemento no encontrado en el HTML: #'+id);
  return el;
};
function toast(m,duracion=2400){
  const t=$('toast');t.textContent=m;t.classList.add('visible');
  clearTimeout(t._to);t._to=setTimeout(()=>t.classList.remove('visible'),duracion);
}
function hoja(html){$('hoja').innerHTML=html;$('hoja').classList.add('abierta');$('velo-hoja').classList.add('abierto');}
function cerrarHoja(){$('hoja').classList.remove('abierta');$('velo-hoja').classList.remove('abierto');}
function subiendo(txt){$('progreso-txt').textContent=txt;$('progreso-subida').classList.add('visible');}
function subidaLista(){$('progreso-subida').classList.remove('visible');}

/* ── arranque ── */
function esperar(ms){return new Promise(r=>setTimeout(r,ms));}

/* ── perfil ── */
$('menu-nombre').textContent=PERFIL.nombre;
$('menu-sub').textContent=PERFIL.subtitulo;
$('menu-copy').textContent=PERFIL.nombre;
if(PERFIL.instagram){
  $('enlace-instagram').href='https://ig.me/m/'+PERFIL.instagram;
  $('enlace-instagram-txt').textContent='@'+PERFIL.instagram;
}else{
  $('enlace-instagram').style.display='none';
}
$('lema-pie-txt').textContent='Mirar despacio también es un oficio';

/* ── navegación raíz ── */
const raices={inicio:$('p-inicio'),galerias:$('p-galerias'),mapa:$('p-mapa'),cronologia:$('p-cronologia')};
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
  if(n==='mapa')iniciarMapa();
  if(n==='cronologia')renderCronologia();
  cerrarMenu();
}
document.querySelectorAll('#menu nav button').forEach(b=>b.onclick=()=>irRaiz(b.dataset.ir));
function abrirMenu(){$('menu').classList.add('abierto');$('velo-menu').classList.add('abierto');}
function cerrarMenu(){$('menu').classList.remove('abierto');$('velo-menu').classList.remove('abierto');}

/* ═══ RENDER GLOBAL (se llama al cargar y tras cada cambio del admin) ═══ */
function renderTodo(){
  intentar(renderInicio);
  intentar(renderGalerias);
  intentar(renderMapaCartas);
  if(mapa)intentar(renderMarcadores);
  if(raizActual==='cronologia')intentar(renderCronologia);
}
function intentar(fn){
  try{fn();}
  catch(err){
    console.error(err);
    toastAdmin('Error visual en '+fn.name+': '+err.message,5000);
  }
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
  const portadasUsadas=new Set();
  const galeriasDestacadas=DATOS.galerias.filter(g=>g.destacada);
  const galeriasResto=DATOS.galerias.filter(g=>!g.destacada);
  [...galeriasDestacadas,...galeriasResto].slice(0,8).forEach(g=>{
    const d=document.createElement('div');
    d.className='tarjeta-mini';
    const portada=portadaDeGaleria(g);
    portadasUsadas.add(portada);
    d.innerHTML=`<div class="marco">${g.destacada?'<span class="estrella">★</span>':''}<img loading="lazy" src="${portada}" alt="${g.nombre}"><b>${g.nombre}</b></div>`;
    d.onclick=()=>abrirGaleria(g.id);
    rec.appendChild(d);
  });

  const il=$('inicio-lugares');il.innerHTML='';
  if(!DATOS.lugares.length)il.innerHTML='<p class="vacio">Aún no hay lugares.</p>';
  DATOS.lugares.slice(0,3).forEach(l=>il.appendChild(filaLugar(l)));

  renderCronologiaPreview(portadasUsadas);
}
function renderCronologiaPreview(excluirUrls=new Set()){
  const cont=$('inicio-cronologia');cont.innerHTML='';
  const todas=todasLasFotosOrdenadas().filter(f=>!excluirUrls.has(f.url));
  const destacadas=todas.filter(f=>f.destacada);
  const resto=todas.filter(f=>!f.destacada);
  const finales=[...destacadas,...resto].slice(0,10);
  if(!finales.length){cont.innerHTML='<p class="vacio">Aún no hay fotos.</p>';return;}
  finales.forEach((f,j)=>{
    const d=document.createElement('button');
    d.className='foto-mini-cron';
    d.innerHTML=`${f.destacada?'<span class="estrella">★</span>':''}<img loading="lazy" src="${miniDe(f)}" alt="">
      ${f.lugarNombre?`<span>${f.lugarNombre}</span>`:''}`;
    d.onclick=e=>abrirFotoCronologia(todasLasFotosOrdenadas().findIndex(x=>x.id===f.id),e.currentTarget);
    cont.appendChild(d);
  });
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
let modoReordenarGalerias=false;
function alternarReordenarGalerias(){
  modoReordenarGalerias=!modoReordenarGalerias;
  renderGalerias();
}
function renderGalerias(){
  const cont=$('lista-galerias');cont.innerHTML='';
  const btnR=$('btn-reordenar-gal');
  if(btnR){
    btnR.style.display=(SESION&&DATOS.galerias.length>1)?'inline-flex':'none';
    btnR.textContent=modoReordenarGalerias?'Listo':'Reordenar';
  }
  if(!DATOS.galerias.length){cont.innerHTML='<p class="vacio">Aún no hay galerías. '+(SESION?'Usa el botón + para crear la primera.':'')+'</p>';return;}

  if(modoReordenarGalerias){
    DATOS.galerias.forEach((g,j)=>{
      const l=lugarDe(g.lugar_id)||{};
      const n=fotosDeGaleria(g.id).length;
      const fila=document.createElement('div');
      fila.className='fila-reordenar';
      fila.innerHTML=`
        <div class="marco"><img loading="lazy" src="${portadaDeGaleria(g)}" alt=""></div>
        <div class="datos"><b>${g.nombre}</b><span>${n} fotos${l.nombre?' · '+l.nombre:''}</span></div>
        <div class="mover">
          <button ${j===0?'disabled':''} onclick="moverGaleria('${g.id}',-1)" aria-label="Subir"><svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg></button>
          <button ${j===DATOS.galerias.length-1?'disabled':''} onclick="moverGaleria('${g.id}',1)" aria-label="Bajar"><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button>
        </div>`;
      cont.appendChild(fila);
    });
    return;
  }

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
let mapa=null,capaTerreno=null,capaSatelite=null,capaMarcadores=null,intentosMapa=0,tilesFallidos=0,tilesOk=0,vistaMapa='satelite';
let _leafletCargando=null;
function cargarLeaflet(){
  if(window.L)return Promise.resolve();
  if(_leafletCargando)return _leafletCargando;
  _leafletCargando=new Promise((resolve,reject)=>{
    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
    script.crossOrigin='anonymous';
    script.onload=()=>resolve();
    script.onerror=()=>reject(new Error('no se pudo descargar'));
    document.body.appendChild(script);
  });
  return _leafletCargando;
}
function fallbackMapa(txt){
  const f=$('mapa-fallback');
  if(txt){
    $('mapa-fallback-txt').textContent=SESION?txt:'El mapa no está disponible en este momento. Vuelve a intentarlo más tarde.';
    f.classList.add('visible');
  }
  else f.classList.remove('visible');
}
function iniciarMapa(){
  if(mapa){mapa.invalidateSize();return;}
  cargarLeaflet().then(iniciarMapaReal).catch(err=>{
    console.error(err);
    fallbackMapa('La librería del mapa no ha podido cargarse ('+err.message+'). Revisa tu conexión y recarga.');
  });
}
/* lugares con al menos una foto fechada, ordenados por su primera visita —
   se usa tanto para la línea de ruta como para el recorrido cinemático */
function lugaresOrdenadosPorFecha(){
  return DATOS.lugares.map(l=>{
    if(l.lat==null||l.lng==null)return null;
    const todasFotos=fotosDeLugar(l.id);
    if(!todasFotos.length)return null;
    const conFecha=todasFotos.filter(f=>f.fechaEfectiva);
    if(!conFecha.length)return null; /* sin ninguna fecha no se puede ubicar en el orden del recorrido */
    const fechaMin=conFecha.reduce((min,f)=>f.fechaEfectiva<min?f.fechaEfectiva:min,conFecha[0].fechaEfectiva);
    return {...l,fechaMin,fotos:todasFotos}; /* pero se muestran TODAS sus fotos, tengan fecha o no */
  }).filter(Boolean).sort((a,b)=>a.fechaMin<b.fechaMin?-1:(a.fechaMin>b.fechaMin?1:0));
}

function iniciarMapaReal(){
  const cont=$('mapa-zona');
  const r=cont.getBoundingClientRect();
  if(r.height<40){
    intentosMapa++;
    if(intentosMapa<=8){setTimeout(iniciarMapaReal,300);return;}
    fallbackMapa('El contenedor del mapa no tiene tamaño ('+Math.round(r.width)+'×'+Math.round(r.height)+'px). Es probable que css/estilos.css no se haya subido completo a GitHub.');
    return;
  }
  try{
    mapa=L.map('mapa',{zoomControl:false,attributionControl:true,tap:true});
    /* vista inicial SIEMPRE definida — sin esto Leaflet no sabe qué tiles pedir y no carga nada */
    mapa.setView([20,0],2);

    capaTerreno=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',{
      attribution:'Tiles © Esri — Esri, HERE, Garmin, FAO, NOAA, USGS',maxZoom:19
    });
    capaSatelite=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{
      attribution:'Tiles © Esri — Esri, Maxar, Earthstar Geographics',maxZoom:19
    });
    (vistaMapa==='satelite'?capaSatelite:capaTerreno).addTo(mapa);
    const marcarCarga=capa=>{
      capa.on('tileerror',()=>{
        tilesFallidos++;
        if(tilesFallidos>=6&&tilesOk===0){
          fallbackMapa('Las imágenes del mapa no se están cargando en esta red. Prueba con otra red / sin VPN, o recarga.');
        }
      });
      capa.on('tileload',()=>{ tilesOk++; if(tilesOk===1)fallbackMapa(null); });
    };
    marcarCarga(capaTerreno);marcarCarga(capaSatelite);

    capaMarcadores=L.layerGroup().addTo(mapa);
    mapa.on('click',e=>{ if(typeof clickMapaAdmin==='function')clickMapaAdmin(e); });
    renderMarcadores(true);
    [0,250,600,1200].forEach(ms=>setTimeout(()=>mapa&&mapa.invalidateSize(),ms));
    window.addEventListener('resize',()=>mapa&&mapa.invalidateSize());
    window.addEventListener('orientationchange',()=>setTimeout(()=>mapa&&mapa.invalidateSize(),300));
    setTimeout(()=>{
      if(tilesOk===0&&tilesFallidos===0){
        fallbackMapa('El mapa lleva varios segundos sin recibir respuesta. Puede ser tu red. Toca "Recargar".');
      }
    },5000);
  }catch(err){
    console.error(err);
    fallbackMapa('Error al crear el mapa: '+err.message);
  }
}
function alternarVistaMapa(){
  if(!mapa)return;
  if(vistaMapa==='terreno'){
    mapa.removeLayer(capaTerreno);capaSatelite.addTo(mapa);vistaMapa='satelite';
  }else{
    mapa.removeLayer(capaSatelite);capaTerreno.addTo(mapa);vistaMapa='terreno';
  }
  $('btn-vista-mapa').textContent=vistaMapa==='terreno'?'Satélite':'Terreno';
}

/* ═══ recorrido cinemático: la cámara vuela de lugar en lugar en orden cronológico ═══ */
let reproduciendoViaje=false,viajeEnPausa=false,_resolverPausaViaje=null;
function esperarSiPausado(){
  return new Promise(resolve=>{
    if(!viajeEnPausa){resolve();return;}
    _resolverPausaViaje=resolve;
  });
}
function pausarViaje(){ viajeEnPausa=true; }
function reanudarViaje(){
  if(!viajeEnPausa)return;
  viajeEnPausa=false;
  if(_resolverPausaViaje){const r=_resolverPausaViaje;_resolverPausaViaje=null;r();}
}
async function reproducirViaje(){
  if(!mapa||reproduciendoViaje)return;
  const ruta=lugaresOrdenadosPorFecha();
  if(ruta.length<2){toast('Necesitas al menos 2 lugares con fecha para reproducir el viaje',4000);return;}
  reproduciendoViaje=true;
  $('btn-viaje').style.display='none';
  $('btn-detener-viaje').style.display='inline-flex';
  if($('mapa-cartas'))$('mapa-cartas').classList.add('oculta');
  for(const l of ruta){
    if(!reproduciendoViaje)break;
    await volarAlugar(l);
    if(!reproduciendoViaje)break;
    await mostrarTarjetaViaje(l);
    await esperar(1700);
    await esperarSiPausado(); /* si se abrió una foto, esperamos aquí hasta que se cierre */
    if(!reproduciendoViaje)break;
    ocultarTarjetaViaje();
    await esperar(280);
  }
  detenerViaje();
}
function volarAlugar(l){
  return new Promise(resolve=>{
    mapa.flyTo([l.lat,l.lng],13,{duration:1.5});
    setTimeout(resolve,1550);
  });
}
function mostrarTarjetaViaje(l){
  return new Promise(resolve=>{
    const nombreEl=$('tarjeta-viaje-nombre'),fechaEl=$('tarjeta-viaje-fecha'),grid=$('tarjeta-viaje-grid'),tarjetaEl=$('tarjeta-viaje');
    if(!nombreEl||!fechaEl||!grid||!tarjetaEl){
      console.warn('Faltan elementos de la tarjeta de viaje en el HTML — revisa que index.html esté actualizado');
      setTimeout(resolve,900);
      return;
    }
    nombreEl.textContent=l.nombre;
    fechaEl.textContent=fechaMostrar(l.fechaMin);
    grid.innerHTML='';
    const MAX_VISIBLE=15;
    const fotos=l.fotos.slice(0,MAX_VISIBLE);
    const restantes=l.fotos.length-fotos.length;
    const n=fotos.length+(restantes>0?1:0);
    const paso=n>1?900/(n-1):0;
    fotos.forEach((f,i)=>{
      const img=document.createElement('img');
      img.className='foto-viaje-item';
      img.loading='eager';
      img.src=miniDe(f);
      img.style.animationDelay=Math.round(i*paso)+'ms';
      img.onclick=()=>abrirFotoDeViaje(l,i);
      grid.appendChild(img);
    });
    if(restantes>0){
      const mas=document.createElement('button');
      mas.className='foto-viaje-mas';
      mas.textContent='+'+restantes;
      mas.style.animationDelay=Math.round((n-1)*paso)+'ms';
      mas.onclick=()=>abrirFotoDeViaje(l,fotos.length);
      grid.appendChild(mas);
    }
    tarjetaEl.classList.add('visible');
    setTimeout(resolve,950);
  });
}
/* al tocar una foto durante el recorrido: se pausa el viaje, se ve la foto a
   pantalla completa con esquinas redondeadas, se puede pasar entre las fotos
   de ese mismo lugar, y al cerrar se reanuda el recorrido automáticamente */
function abrirFotoDeViaje(l,idx){
  pausarViaje();
  coleccion={tipo:'viaje-lugar',titulo:l.nombre,fotos:l.fotos,mostrarOrigen:false};
  celdasColeccion=new Array(l.fotos.length).fill(null);
  pFotoEl.classList.add('desde-viaje');
  abrirFoto(idx);
}
function ocultarTarjetaViaje(){
  const el=$('tarjeta-viaje');
  if(el)el.classList.remove('visible');
}
function detenerViaje(){
  reproduciendoViaje=false;
  $('btn-viaje').style.display='';
  $('btn-detener-viaje').style.display='none';
  if($('mapa-cartas'))$('mapa-cartas').classList.remove('oculta');
  ocultarTarjetaViaje();
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
    renderRutaMapa();
    if(encuadrar&&limites.length)mapa.fitBounds(limites,{padding:[60,60],maxZoom:8});
  }catch(err){
    console.error(err);
    toast('Error al pintar los marcadores: '+err.message,4500);
  }
}
let capaRuta=null;
function renderRutaMapa(){
  if(!mapa)return;
  if(capaRuta){mapa.removeLayer(capaRuta);capaRuta=null;}
  const ruta=lugaresOrdenadosPorFecha();
  if(ruta.length<2)return;
  capaRuta=L.polyline(ruta.map(l=>[l.lat,l.lng]),{
    color:'#141412',weight:2,opacity:.45,dashArray:'1,9',lineCap:'round',
  }).addTo(mapa);
  capaRuta.bringToBack();
}
function renderMapaCartas(){
  try{
    const btnV=$('btn-viaje');
    if(btnV&&!reproduciendoViaje)btnV.style.display=lugaresOrdenadosPorFecha().length>=2?'':'none';
    const cont=$('mapa-cartas');cont.innerHTML='';
    if(!DATOS.lugares.length){
      cont.innerHTML=`<div class="carta-lugar" style="justify-content:center;text-align:center">
        <div class="datos"><b>Aún no hay lugares</b><span>${SESION?'Toca el mapa para crear el primero':'El fotógrafo aún no ha añadido lugares'}</span></div>
      </div>`;
      return;
    }
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
    portada:urlSegura(fotos[0]?fotos[0].url:''),
    fotos,mostrarOrigen:true,
  });
}
/* ═══ URLs directas: se puede compartir el enlace de una galería, lugar o foto ═══
   Se usa el hash (#/...) porque no requiere ninguna configuración en Vercel:
   el navegador nunca envía esa parte al servidor, siempre se sirve la misma página. */
function hashDeColeccion(c){
  if(!c)return '';
  if(c.tipo==='galeria')return 'galeria/'+c.id;
  if(c.tipo==='lugar')return 'lugar/'+c.id;
  return '';
}
function actualizarURL(hash){
  const nueva=hash?('#'+hash):(location.pathname+location.search);
  history.replaceState(null,'',nueva);
}
function compartirEnlace(hash,titulo){
  cerrarHoja();
  const url=location.origin+location.pathname+'#'+hash;
  if(navigator.share){
    navigator.share({title:titulo,url}).catch(()=>{});
  }else if(navigator.clipboard){
    navigator.clipboard.writeText(url).then(()=>toast('Enlace copiado')).catch(()=>toast('Compartir no está disponible en este navegador'));
  }else{
    toast('Compartir no está disponible en este navegador');
  }
}
/* al cargar la app, si la URL trae un enlace directo, abre eso en vez de quedarse en Inicio */
function resolverHashInicial(){
  const partes=(location.hash||'').replace(/^#\/?/,'').split('/').filter(Boolean);
  if(!partes.length)return;
  try{
    if(partes[0]==='galeria'&&partes[1]&&galeriaDe(partes[1])){
      abrirGaleria(partes[1]);
      if(partes[2]==='foto'&&partes[3]){
        const idx=coleccion.fotos.findIndex(f=>f.id===partes[3]);
        if(idx>=0)abrirFoto(idx);
      }
    }else if(partes[0]==='lugar'&&partes[1]&&lugarDe(partes[1])){
      abrirLugar(partes[1]);
      if(partes[2]==='foto'&&partes[3]){
        const idx=coleccion.fotos.findIndex(f=>f.id===partes[3]);
        if(idx>=0)abrirFoto(idx);
      }
    }else if(partes[0]==='foto'&&partes[1]){
      const f=DATOS.fotos.find(x=>x.id===partes[1]);
      if(!f)return;
      if(f.galeria_id&&galeriaDe(f.galeria_id))abrirGaleria(f.galeria_id);
      else{
        const lid=lugarEfectivo(f);
        if(lid&&lugarDe(lid))abrirLugar(lid);
        else return;
      }
      const idx=coleccion.fotos.findIndex(x=>x.id===f.id);
      if(idx>=0)abrirFoto(idx);
    }
  }catch(err){console.error('No se pudo abrir el enlace directo',err);}
}

function abrirColeccion(c){
  const mismaColeccion=coleccion&&coleccion.tipo===c.tipo&&coleccion.id===c.id;
  coleccion=c;
  if(!mismaColeccion)modoReordenar=false;
  $('col-cover').src=c.portada||'';
  $('col-nombre').textContent=c.titulo;
  $('col-sub').textContent=c.sub;
  $('col-titulo-mini').textContent=c.titulo;
  $('col-n').textContent=c.fotos.length;
  $('fab-colec').classList.toggle('visible',(c.tipo==='galeria'||c.tipo==='lugar')&&!modoReordenar);
  const btnRF=$('btn-reordenar');
  if(btnRF){
    btnRF.style.display=(SESION&&c.tipo==='galeria'&&c.fotos.length>1)?'inline-flex':'none';
    btnRF.textContent=modoReordenar?'Listo':'Reordenar';
  }
  pintarGridColeccion();
  $('col-scroll').scrollTop=0;
  $('col-topbar').classList.remove('solida');
  $('p-colec').classList.add('abierta');
  document.body.classList.add('empujada');
  actualizarURL(hashDeColeccion(c));
}
let modoReordenar=false,celdasColeccion=[];
function alternarReordenar(){
  modoReordenar=!modoReordenar;
  $('fab-colec').classList.toggle('visible',(coleccion.tipo==='galeria'||coleccion.tipo==='lugar')&&!modoReordenar);
  if($('btn-reordenar'))$('btn-reordenar').textContent=modoReordenar?'Listo':'Reordenar';
  pintarGridColeccion();
}
function pintarGridColeccion(){
  const grid=$('col-grid');
  grid.innerHTML='';
  grid.classList.toggle('modo-lista',modoReordenar);
  celdasColeccion=new Array(coleccion.fotos.length).fill(null);
  if(!coleccion.fotos.length){grid.innerHTML='<p class="vacio" style="columns:1">Sin fotos todavía.</p>';return;}

  if(modoReordenar){
    coleccion.fotos.forEach((f,j)=>{
      const fecha=f.fechaEfectiva?fechaMostrar(f.fechaEfectiva):'Sin fecha';
      const fila=document.createElement('div');
      fila.className='fila-reordenar';
      fila.innerHTML=`
        <div class="marco"><img loading="lazy" src="${miniDe(f)}" alt=""></div>
        <div class="datos"><b>${f.titulo||'Sin título'}</b><span>${fecha}</span></div>
        <div class="mover">
          <button ${j===0?'disabled':''} onclick="moverFoto('${f.id}',-1)" aria-label="Subir"><svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg></button>
          <button ${j===coleccion.fotos.length-1?'disabled':''} onclick="moverFoto('${f.id}',1)" aria-label="Bajar"><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button>
        </div>`;
      grid.appendChild(fila);
    });
    return;
  }

  if(coleccion.tipo==='lugar'&&coleccion.mostrarOrigen){
    agruparPorVisita(coleccion.fotos).forEach(grp=>{
      const cab=document.createElement('div');
      cab.className='cab-visita';
      if(grp.fecha){
        cab.innerHTML=`<b>${fechaMostrar(grp.fecha)}</b><span>${grp.titulo} · ${grp.fotos.length} foto${grp.fotos.length!==1?'s':''}</span>`;
      }else{
        cab.innerHTML=`<b>${grp.titulo}</b><span>${grp.fotos.length} foto${grp.fotos.length!==1?'s':''}</span>`;
      }
      grid.appendChild(cab);
      const subgrid=document.createElement('div');
      subgrid.className='subgrid-visita';
      grp.fotos.forEach(f=>{
        const jGlobal=coleccion.fotos.indexOf(f);
        const cel=document.createElement('div');
        cel.className='celda';
        cel.innerHTML=`<img loading="lazy" src="${miniDe(f)}" alt="${f.titulo||''}">`;
        cel.onclick=e=>abrirFoto(jGlobal,e.currentTarget);
        subgrid.appendChild(cel);
        celdasColeccion[jGlobal]=cel;
      });
      grid.appendChild(subgrid);
    });
    return;
  }

  /* si una galería mezcla fotos de varios lugares distintos (varias direcciones),
     se agrupan visualmente por dirección en vez de mostrarse todas juntas */
  if(coleccion.tipo==='galeria'){
    const distintos=new Set(coleccion.fotos.map(f=>lugarEfectivo(f)).filter(Boolean));
    if(distintos.size>=2){
      agruparPorLugarSimple(coleccion.fotos).forEach(grp=>{
        if(grp.nombre){
          const cab=document.createElement('div');
          cab.className='cab-visita';
          cab.innerHTML=`<b>${grp.nombre}</b><span>${grp.fotos.length} foto${grp.fotos.length!==1?'s':''}</span>`;
          grid.appendChild(cab);
        }
        const subgrid=document.createElement('div');
        subgrid.className='subgrid-visita';
        grp.fotos.forEach(f=>{
          const jGlobal=coleccion.fotos.indexOf(f);
          const cel=document.createElement('div');
          cel.className='celda';
          cel.innerHTML=`<img loading="lazy" src="${miniDe(f)}" alt="${f.titulo||''}">`;
          cel.onclick=e=>abrirFoto(jGlobal,e.currentTarget);
          subgrid.appendChild(cel);
          celdasColeccion[jGlobal]=cel;
        });
        grid.appendChild(subgrid);
      });
      return;
    }
  }

  coleccion.fotos.forEach((f,j)=>{
    const cel=document.createElement('div');
    cel.className='celda';
    cel.style.animationDelay=(j*.05+.15)+'s';
    const fecha=f.fechaEfectiva?fechaMostrar(f.fechaEfectiva):'';
    const etiqueta=coleccion.mostrarOrigen?[f.galeria,fecha].filter(Boolean).join(' · '):'';
    cel.innerHTML=`<img loading="lazy" src="${miniDe(f)}" alt="${f.titulo||''}">
      ${etiqueta?`<span class="de">${etiqueta}</span>`:''}`;
    cel.onclick=e=>abrirFoto(j,e.currentTarget);
    grid.appendChild(cel);
    celdasColeccion[j]=cel;
  });
}
function refrescarColeccion(){
  if(!coleccion)return;
  if(coleccion.tipo==='galeria')abrirGaleria(coleccion.id);
  else if(coleccion.tipo==='lugar')abrirLugar(coleccion.id);
  else if(coleccion.tipo==='cronologia'){coleccion.fotos=todasLasFotosOrdenadas();renderCronologia();}
}
function volverDeColec(){
  $('p-colec').classList.remove('abierta');
  document.body.classList.remove('empujada');
  actualizarURL('');
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
      <button class="opcion" onclick="compartirEnlace('galeria/${gid}','${g.nombre.replace(/'/g,"\\'")}')">Compartir enlace</button>
      ${l.id?`<button class="opcion" onclick="cerrarHoja();abrirLugar('${l.id}')">Ver todo lo de ${l.nombre}</button>`:''}
      ${SESION?`
        <button class="opcion" onclick="cerrarHoja();formGaleria('${gid}')">Editar galería</button>
        <button class="opcion" onclick="alternarDestacadaGaleria('${gid}')">${g.destacada?'★ Quitar de destacadas':'☆ Marcar como destacada'}</button>
        ${n?`<button class="opcion" onclick="cerrarHoja();abrirDisenadorAlbum('galeria','${gid}')">📖 Diseñar álbum (PDF)</button>`:''}
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
      <button class="opcion" onclick="compartirEnlace('lugar/${lid}','${l.nombre.replace(/'/g,"\\'")}')">Compartir enlace</button>
      ${SESION?`
        <button class="opcion" onclick="cerrarHoja();subirFotosALugar('${lid}')">Añadir fotos a este lugar</button>
        <button class="opcion" onclick="cerrarHoja();formLugar('${lid}')">Editar lugar</button>
        <button class="opcion" onclick="cerrarHoja();reubicarLugar('${lid}')">Cambiar ubicación en el mapa</button>
        ${n?`<button class="opcion" onclick="cerrarHoja();abrirDisenadorAlbum('lugar','${lid}')">📖 Diseñar álbum (PDF)</button>`:''}
        <button class="opcion peligro" onclick="eliminarLugar('${lid}')">Eliminar lugar</button>`:''}
    </div>
    <button class="cancelar" onclick="cerrarHoja()">Cancelar</button>`);
}

/* rect donde realmente aterriza el panel — en iPad es una columna centrada, no toda la pantalla */
function rectPanelDestino(){
  const w=innerWidth,h=innerHeight;
  if(w>=700){
    const pw=Math.min(520,w);
    return {left:(w-pw)/2,top:0,width:pw,height:h};
  }
  return {left:0,top:0,width:w,height:h};
}

/* ═══ CRONOLOGÍA: mes → lugar → rejilla de fotos, más recientes primero ═══
   Se agrupa por MES (no por día exacto) para que se vea "Junio 2025" una
   sola vez aunque haya varias fechas distintas dentro del mismo mes.
   El orden interno sigue usando la fecha completa guardada. */
let celdasCronologia=[];
function renderCronologia(){
  const cont=$('cronologia-lista');
  cont.innerHTML='';
  const todas=todasLasFotosOrdenadas();
  celdasCronologia=new Array(todas.length).fill(null);
  if(!todas.length){cont.innerHTML='<p class="vacio">Aún no hay fotos. '+(SESION?'Sube alguna desde una galería o un lugar.':'')+'</p>';return;}

  let contadorUI=0;
  const retraso=()=>Math.min(contadorUI++,12)*0.05+'s';

  let mesActual=undefined,lugarActual=undefined,subgrid=null;
  todas.forEach((f,j)=>{
    const clave=f.fechaEfectiva?f.fechaEfectiva.slice(0,7):'sin-fecha';
    if(clave!==mesActual){
      mesActual=clave;
      lugarActual=undefined;
      if(f.fechaEfectiva){ /* sin fecha: no ponemos ninguna cabecera, pero la foto se ve igual */
        const cab=document.createElement('div');
        cab.className='cab-cronologia entra-cron';
        cab.style.transitionDelay=retraso();
        cab.textContent=fechaMes(f.fechaEfectiva);
        cont.appendChild(cab);
      }
    }
    const claveLugar=f.lugarId||'sin';
    if(claveLugar!==lugarActual||!subgrid){
      lugarActual=claveLugar;
      if(f.lugarId){ /* sin ubicación: no ponemos etiqueta, pero la foto se ve igual */
        const sub=document.createElement('div');
        sub.className='lugar-cronologia entra-cron';
        sub.style.transitionDelay=retraso();
        sub.innerHTML=`<svg viewBox="0 0 24 24"><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>
          <span>${f.lugarNombre}</span>`;
        cont.appendChild(sub);
      }
      subgrid=document.createElement('div');
      subgrid.className='grid-cronologia entra-cron';
      subgrid.style.transitionDelay=retraso();
      cont.appendChild(subgrid);
    }
    const cel=document.createElement('button');
    cel.className='celda-cron';
    cel.innerHTML=`<img loading="lazy" src="${miniDe(f)}" alt="${f.titulo||''}">`;
    cel.onclick=e=>abrirFotoCronologia(j,e.currentTarget);
    subgrid.appendChild(cel);
    celdasCronologia[j]=cel;
  });
  activarRevelado();
}
function abrirFotoCronologia(j,origenEl){
  coleccion={tipo:'cronologia',titulo:'Cronología',fotos:todasLasFotosOrdenadas(),mostrarOrigen:true};
  celdasColeccion=celdasCronologia;
  abrirFoto(j,origenEl);
}
/* revelado suave al hacer scroll — "efectos con sentido" en vez de aparición brusca */
function activarRevelado(){
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(en=>{
      if(en.isIntersecting){en.target.classList.add('visible');obs.unobserve(en.target);}
    });
  },{threshold:.08,rootMargin:'0px 0px -30px 0px'});
  document.querySelectorAll('.entra-cron:not(.visible)').forEach(el=>obs.observe(el));
}

/* el nombre de archivo (IMG_1234.jpg) nunca debe verlo un visitante — en su
   lugar se muestra el nombre del lugar asignado, si lo tiene. El admin sí
   ve el nombre real, porque le sirve para identificar y gestionar la foto. */
function tituloMostrable(f){
  if(SESION)return f.titulo||'Sin título';
  const lid=lugarEfectivo(f);
  const l=lid?lugarDe(lid):null;
  return l?l.nombre:'';
}

/* ═══ VISOR ═══ */
let fotoIdx=0,slides=[],pulgs=[],celdas=[],cmpActivo=false;
const carro=$('foto-carro'),tira=$('tira'),pFotoEl=$('p-foto');
function abrirFoto(j,origenEl=null){
  fotoIdx=j;
  carro.innerHTML='';tira.innerHTML='';
  coleccion.fotos.forEach((f,k)=>{
    const s=document.createElement('div');
    s.className='foto-slide';
    s.innerHTML=`<img class="eco" src="${miniDe(f)}" alt="">
      <div class="marco"><img src="${urlSegura(f.url)}" alt="${f.titulo||''}" crossorigin="anonymous"></div>`;
    carro.appendChild(s);
    const t=document.createElement('button');
    t.className='pulg';
    t.innerHTML=`<img loading="lazy" src="${miniDe(f)}" alt="">`;
    t.onclick=()=>{quitarComparador();irAFoto(k);};
    tira.appendChild(t);
  });
  slides=[...carro.children];pulgs=[...tira.children];
  celdas=celdasColeccion;
  irAFoto(j,true);

  /* deslizamiento simple: el mismo patrón fiable que usan el resto de paneles */
  pFotoEl.classList.add('abierta');
  document.body.classList.add('nivel2');
  const f=coleccion.fotos[j];
  const baseHash=hashDeColeccion(coleccion);
  actualizarURL(baseHash?baseHash+'/foto/'+f.id:'foto/'+f.id);
}
function volverDeFoto(){
  quitarComparador();
  pFotoEl.classList.remove('abierta');
  document.body.classList.remove('nivel2');
  actualizarURL(hashDeColeccion(coleccion));
  if(pFotoEl.classList.contains('desde-viaje')){
    pFotoEl.classList.remove('desde-viaje');
    reanudarViaje();
  }
}
function irAFoto(k,inmediato=false){
  fotoIdx=k;
  if(inmediato)carro.style.transition='none';
  carro.style.transform=`translateX(${-k*100}%)`;
  if(inmediato)requestAnimationFrame(()=>carro.style.transition='');
  const f=coleccion.fotos[k];
  $('foto-archivo').textContent=tituloMostrable(f);
  $('foto-num').textContent=`${k+1} de ${coleccion.fotos.length} · ${coleccion.titulo}`;
  pulgs.forEach((p,x)=>p.classList.toggle('viva',x===k));
  if(pulgs[k])pulgs[k].scrollIntoView({behavior:inmediato?'auto':'smooth',inline:'center',block:'nearest'});
  /* el botón Antes/Después solo aparece si hay original Y el navegador puede mostrarlo */
  const tieneOriginal=!!f.url_original&&!esFormatoNoVisible(f.url_original);
  $('btn-cmp').style.display=tieneOriginal?'':'none';
  $('sep-cmp').style.display=tieneOriginal?'':'none';
  aplicarColorAmbiente(slides[k].querySelector('.marco > img'));
}
/* colores dominantes dinámicos: tiñe suavemente el fondo del visor con el
   color medio de la foto activa, como hace Spotify con las portadas */
function extraerColorDominante(imgEl,cb){
  try{
    const cv=document.createElement('canvas');
    const w=16,h=16;
    cv.width=w;cv.height=h;
    const ctx=cv.getContext('2d');
    ctx.drawImage(imgEl,0,0,w,h);
    const data=ctx.getImageData(0,0,w,h).data;
    let r=0,g=0,b=0,n=0;
    for(let i=0;i<data.length;i+=4){r+=data[i];g+=data[i+1];b+=data[i+2];n++;}
    cb(`rgb(${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)})`);
  }catch(e){ /* CORS u otro fallo: se ignora, simplemente no habrá tinte */ }
}
function aplicarColorAmbiente(imgEl){
  if(!imgEl)return;
  const ir=()=>extraerColorDominante(imgEl,color=>pFotoEl.style.setProperty('--color-ambiente',color));
  if(imgEl.complete&&imgEl.naturalWidth)ir();
  else imgEl.addEventListener('load',ir,{once:true});
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
    if(cmpActivo)return;
    const f=coleccion.fotos[fotoIdx];
    const marco=slides[fotoIdx].querySelector('.marco');
    if(f.url_original){
      marco.insertAdjacentHTML('beforeend',`<img class="peek-antes" src="${f.url_original}" alt="">`);
    }else{
      marco.querySelector('img').classList.add('filtro-raw');
    }
    $('peek').classList.add('visible');
  },260);
},{passive:true});
['touchend','touchmove','touchcancel'].forEach(ev=>zona.addEventListener(ev,()=>{
  clearTimeout(pulsoTimer);
  if(cmpActivo)return; /* jamás interferir con el comparador */
  slides.forEach(s=>{
    s.querySelectorAll('.peek-antes').forEach(x=>x.remove());
    s.querySelector('.marco > img').classList.remove('filtro-raw');
  });
  $('peek').classList.remove('visible');
},{passive:true}));

/* comparador antes/después.
   La foto editada (base) NUNCA se toca: el "antes" va en una capa propia
   superpuesta, recortada por la izquierda. Así ningún otro gesto puede
   romper el estado, y ambas se ven exactamente al mismo tamaño. */
function alternarComparador(){cmpActivo?quitarComparador():ponerComparador();}
function ponerComparador(){
  const f=coleccion.fotos[fotoIdx];
  if(!f.url_original){toastAdmin('Esta foto no tiene original subido');return;}
  if(esFormatoNoVisible(f.url_original)){
    toastAdmin('El original guardado es un archivo RAW y los navegadores no pueden mostrarlo. Súbelo de nuevo en JPG desde Info.',6500);
    return;
  }
  cmpActivo=true;
  $('btn-cmp').classList.add('activo');
  const marco=slides[fotoIdx].querySelector('.marco');

  /* fija el tamaño actual del marco en píxeles para que nada lo mueva */
  const r=marco.getBoundingClientRect();
  marco.style.width=r.width+'px';
  marco.style.height=r.height+'px';

  marco.insertAdjacentHTML('beforeend',`
    <div class="cmp-antes" style="--pos:0%"><img alt=""></div>
    <div class="cmp-div" style="--pos:0%"><div class="asa">⟨⟩</div></div>
    <span class="cmp-tag a">Antes</span><span class="cmp-tag b">Después</span>`);
  const capa=marco.querySelector('.cmp-antes'),divi=marco.querySelector('.cmp-div');
  const imgAntes=capa.querySelector('img');
  imgAntes.onerror=()=>{toastAdmin('No se pudo cargar la foto original — vuelve a subirla desde Info',5000);quitarComparador();};
  imgAntes.src=f.url_original;

  /* barrido de entrada suave, de 0% a 50% */
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    capa.classList.add('animando');divi.classList.add('animando');
    capa.style.setProperty('--pos','50%');
    divi.style.setProperty('--pos','50%');
    setTimeout(()=>{capa.classList.remove('animando');divi.classList.remove('animando');},740);
  }));

  /* arrastre 1:1 con el dedo */
  let arr=false;
  const mover=x=>{
    const rr=marco.getBoundingClientRect();
    const pos=Math.min(96,Math.max(4,(x-rr.left)/rr.width*100))+'%';
    capa.style.setProperty('--pos',pos);divi.style.setProperty('--pos',pos);
  };
  marco.onpointerdown=e=>{arr=true;marco.setPointerCapture(e.pointerId);mover(e.clientX);};
  marco.onpointermove=e=>{if(arr)mover(e.clientX);};
  marco.onpointerup=marco.onpointercancel=()=>arr=false;
  if(f.url_original===f.url){
    toastAdmin('El original y la editada parecen ser el mismo archivo — súbelo de nuevo desde Info',4500);
  }
}
function quitarComparador(){
  if(!cmpActivo)return;
  cmpActivo=false;
  $('btn-cmp').classList.remove('activo');
  slides.forEach(s=>{
    const m=s.querySelector('.marco');
    m.querySelectorAll('.cmp-antes,.cmp-div,.cmp-tag').forEach(x=>x.remove());
    m.onpointerdown=m.onpointermove=m.onpointerup=null;
    m.style.width='';m.style.height='';
  });
}
function compartirFoto(){
  const url=location.origin+location.pathname+location.hash;
  const f=coleccion.fotos[fotoIdx];
  if(navigator.share){
    navigator.share({title:f.titulo||PERFIL.nombre,url}).catch(()=>{});
  }else if(navigator.clipboard){
    navigator.clipboard.writeText(url).then(()=>toast('Enlace copiado')).catch(()=>toast('Compartir no está disponible en este navegador'));
  }else{
    toast('Compartir no está disponible en este navegador');
  }
}
function abrirHojaInfo(){
  const f=coleccion.fotos[fotoIdx];
  const fecha=f.fechaEfectiva?fechaMostrar(f.fechaEfectiva):null;
  const contexto=(coleccion.tipo==='lugar'||coleccion.tipo==='cronologia')&&f.galeria?' · Galería '+f.galeria:'';
  const ubicacion=coleccion.tipo==='cronologia'?f.lugarNombre:null;
  const fotoRota=esFormatoNoVisible(f.url);
  let estadoOriginal=null;
  if(SESION){
    estadoOriginal=!f.url_original?'No subido (se simula)'
      :esFormatoNoVisible(f.url_original)?'⚠️ RAW no compatible — vuelve a subir en JPG'
      :'Sí — se usa al comparar';
  }
  hoja(`
    <div class="grupo">
      <div class="cab-hoja"><b>${tituloMostrable(f)||'&nbsp;'}</b><span>${coleccion.titulo}${contexto}</span></div>
      ${SESION&&fotoRota?`<div class="dato">Foto principal <span>⚠️ RAW no compatible — súbela de nuevo en JPG</span></div>`:''}
      ${fecha?`<div class="dato">Fecha <span>${fecha}</span></div>`:''}
      ${ubicacion?`<div class="dato">Ubicación <span>${ubicacion}</span></div>`:''}
      ${f.exif?`<div class="dato">Ajustes <span>${f.exif}</span></div>`:''}
      ${estadoOriginal?`<div class="dato">Original (antes) <span>${estadoOriginal}</span></div>`:''}
      ${!fotoRota?`<button class="opcion" onclick="exportarPolaroid()">📷 Descargar como Polaroid</button>`:''}
      ${SESION?`
        <button class="opcion" onclick="cerrarHoja();formFoto('${f.id}')">Editar título / fecha / EXIF / lugar</button>
        <button class="opcion" onclick="alternarDestacadaFoto('${f.id}')">${f.destacada?'★ Quitar de destacadas':'☆ Marcar como destacada'}</button>
        <button class="opcion" onclick="cerrarHoja();subirOriginal('${f.id}')">Subir foto original (antes)</button>
        ${f.galeria_id?`<button class="opcion" onclick="cerrarHoja();usarComoPortada('${f.id}')">Usar como portada de la galería</button>`:''}
        <button class="opcion peligro" onclick="eliminarFoto('${f.id}')">Eliminar foto</button>`:''}
    </div>
    <button class="cancelar" onclick="cerrarHoja()">Cerrar</button>`);
}
/* ═══ POLAROID exportable ═══ */
let _fuentePolaroidCargada=false;
async function cargarFuentePolaroid(){
  if(_fuentePolaroidCargada)return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap';
  document.head.appendChild(link);
  try{ await document.fonts.load('600 48px "Caveat"'); }catch(e){}
  _fuentePolaroidCargada=true;
}
async function exportarPolaroid(){
  const f=coleccion.fotos[fotoIdx];
  if(esFormatoNoVisible(f.url)){toast('Esta foto no se puede exportar (formato no compatible)');return;}
  toast('Generando polaroid…');
  try{
    await cargarFuentePolaroid();
    const res=await fetch(f.url);
    if(!res.ok)throw new Error('HTTP '+res.status);
    const blob=await res.blob();
    const bitmap=await createImageBitmap(blob);

    /* 1. la tarjeta polaroid en sí: marco fino arriba/lados, tira ancha abajo para el texto */
    const margen=Math.round(bitmap.width*0.035);
    const capInf=Math.round(bitmap.width*0.17);
    const radio=Math.round(bitmap.width*0.012);
    const tarjeta=document.createElement('canvas');
    tarjeta.width=bitmap.width+margen*2;
    tarjeta.height=bitmap.height+margen*2+capInf;
    const tctx=tarjeta.getContext('2d');
    tctx.fillStyle='#FDFDFB';
    trazarRectRedondeado(tctx,0,0,tarjeta.width,tarjeta.height,radio);
    tctx.fill();
    tctx.drawImage(bitmap,margen,margen);

    const lugarTxt=f.lugarNombre||(coleccion.tipo==='lugar'||coleccion.tipo==='galeria'?coleccion.titulo:'');
    const fechaTxt=f.fechaEfectiva?fechaMostrar(f.fechaEfectiva):'';
    const tamNombre=Math.max(30,Math.round(bitmap.width*0.062));
    const tamFecha=Math.max(16,Math.round(bitmap.width*0.03));
    const centroCap=bitmap.height+margen+capInf/2;
    tctx.textAlign='center';
    tctx.fillStyle='#2b2b28';
    tctx.font=`600 ${tamNombre}px "Caveat", cursive`;
    tctx.textBaseline='alphabetic';
    tctx.fillText(lugarTxt||PERFIL.nombre, tarjeta.width/2, centroCap+(fechaTxt?tamNombre*0.12:tamNombre*0.32));
    if(fechaTxt){
      tctx.fillStyle='#8A8A84';
      tctx.font=`500 ${tamFecha}px 'Outfit',sans-serif`;
      tctx.fillText(fechaTxt.toUpperCase(), tarjeta.width/2, centroCap+tamNombre*0.62);
    }

    /* 2. lienzo final: pantalla completa de un teléfono (9:16, como una Historia),
       con la propia foto de fondo muy oscurecida para que la tarjeta blanca resalte
       con fuerte contraste. La tarjeta se centra siempre, sea cual sea su proporción. */
    const RATIO_PANTALLA=9/16;
    let outW=1080, outH=Math.round(1080/RATIO_PANTALLA);
    /* si la tarjeta ya es más "alta" que la pantalla del móvil, se respeta su alto y se
       calcula el ancho de pantalla a partir de ahí, para no dejar tiras negras raras */
    if(tarjeta.width/tarjeta.height>RATIO_PANTALLA){
      outH=Math.round(tarjeta.height*1.55);
      outW=Math.round(outH*RATIO_PANTALLA);
    }

    const cv=document.createElement('canvas');
    cv.width=outW;cv.height=outH;
    const ctx=cv.getContext('2d');

    /* fondo: la misma foto, borrosa y MUY oscurecida — contraste fuerte con la tarjeta blanca */
    const escalaFondo=Math.max(cv.width/bitmap.width,cv.height/bitmap.height)*1.18;
    const fw=bitmap.width*escalaFondo, fh=bitmap.height*escalaFondo;
    ctx.filter='blur(50px) saturate(1.15) brightness(.32)';
    ctx.drawImage(bitmap,(cv.width-fw)/2,(cv.height-fh)/2,fw,fh);
    ctx.filter='none';
    ctx.fillStyle='rgba(6,6,6,.42)';
    ctx.fillRect(0,0,cv.width,cv.height);

    /* 3. la tarjeta, escalada para ocupar la mayor parte de la pantalla sin tocar los bordes */
    const escalaTarjeta=Math.min((cv.width*0.86)/tarjeta.width,(cv.height*0.86)/tarjeta.height);
    const tw=tarjeta.width*escalaTarjeta, th=tarjeta.height*escalaTarjeta;
    const tx=(cv.width-tw)/2, ty=(cv.height-th)/2;
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,.55)';
    ctx.shadowBlur=Math.round(cv.width*0.035);
    ctx.shadowOffsetY=Math.round(cv.width*0.014);
    ctx.drawImage(tarjeta,tx,ty,tw,th);
    ctx.restore();

    cv.toBlob(blob=>{
      if(!blob){toast('No se pudo generar la imagen');return;}
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=(f.titulo||'foto').replace(/\.\w+$/,'')+'-polaroid.jpg';
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
      toast('Polaroid descargada');
    },'image/jpeg',0.95);
  }catch(err){
    console.error(err);
    toast('No se pudo generar la polaroid: '+err.message,4500);
  }
}
/* ═══ EXPORTAR ÁLBUM (PDF) — para dar, por ejemplo, el álbum completo de una boda ═══ */
let _jsPDFCargando=null;
function cargarJsPDF(){
  if(window.jspdf)return Promise.resolve();
  if(_jsPDFCargando)return _jsPDFCargando;
  _jsPDFCargando=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    s.crossOrigin='anonymous';
    s.onload=()=>resolve();
    s.onerror=()=>reject(new Error('no se pudo cargar el generador de PDF'));
    document.body.appendChild(s);
  });
  return _jsPDFCargando;
}
/* ═══════════════════════════════════════════════════════════════
   DISEÑADOR DE ÁLBUM — página a página, como maquetar un libro:
   1. Eliges cuántas fotos lleva la página (1 a 6) y un diseño entre variantes
   2. Ves la página con huecos vacíos; tocas cada hueco y eliges la foto
   3. Al completarla, la añades y diseñas la siguiente
   4. Puedes guardar el borrador (solo admin) y seguir otro día
   ═══════════════════════════════════════════════════════════════ */

/* plantillas de diseño: cada celda son fracciones (0–1) del área de la página */
const LAYOUTS_ALBUM={
  1:[{id:'1-completa',nombre:'Completa',celdas:[{x:0,y:0,w:1,h:1}]}],
  2:[
    {id:'2-lado',nombre:'Lado a lado',celdas:[{x:0,y:0,w:.5,h:1},{x:.5,y:0,w:.5,h:1}]},
    {id:'2-apilado',nombre:'Apiladas',celdas:[{x:0,y:0,w:1,h:.5},{x:0,y:.5,w:1,h:.5}]},
    {id:'2-grande-pequena',nombre:'Grande + pequeña',celdas:[{x:0,y:0,w:.66,h:1},{x:.66,y:0,w:.34,h:1}]},
  ],
  3:[
    {id:'3-una-dos',nombre:'Una arriba, dos abajo',celdas:[{x:0,y:0,w:1,h:.55},{x:0,y:.55,w:.5,h:.45},{x:.5,y:.55,w:.5,h:.45}]},
    {id:'3-dos-una',nombre:'Dos arriba, una abajo',celdas:[{x:0,y:0,w:.5,h:.45},{x:.5,y:0,w:.5,h:.45},{x:0,y:.45,w:1,h:.55}]},
    {id:'3-columnas',nombre:'Tres columnas',celdas:[{x:0,y:0,w:1/3,h:1},{x:1/3,y:0,w:1/3,h:1},{x:2/3,y:0,w:1/3,h:1}]},
  ],
  4:[
    {id:'4-cuadricula',nombre:'Cuadrícula 2×2',celdas:[{x:0,y:0,w:.5,h:.5},{x:.5,y:0,w:.5,h:.5},{x:0,y:.5,w:.5,h:.5},{x:.5,y:.5,w:.5,h:.5}]},
    {id:'4-grande-tres',nombre:'Grande + tres',celdas:[{x:0,y:0,w:.66,h:1},{x:.66,y:0,w:.34,h:1/3},{x:.66,y:1/3,w:.34,h:1/3},{x:.66,y:2/3,w:.34,h:1/3}]},
    {id:'4-filas',nombre:'Cuatro filas',celdas:[{x:0,y:0,w:1,h:.25},{x:0,y:.25,w:1,h:.25},{x:0,y:.5,w:1,h:.25},{x:0,y:.75,w:1,h:.25}]},
  ],
  5:[
    {id:'5-grande-cuatro',nombre:'Grande + cuatro',celdas:[{x:0,y:0,w:.6,h:1},{x:.6,y:0,w:.4,h:.25},{x:.6,y:.25,w:.4,h:.25},{x:.6,y:.5,w:.4,h:.25},{x:.6,y:.75,w:.4,h:.25}]},
    {id:'5-mixta',nombre:'Tres arriba, dos abajo',celdas:[{x:0,y:0,w:1/3,h:.5},{x:1/3,y:0,w:1/3,h:.5},{x:2/3,y:0,w:1/3,h:.5},{x:0,y:.5,w:.5,h:.5},{x:.5,y:.5,w:.5,h:.5}]},
  ],
  6:[
    {id:'6-2x3',nombre:'Cuadrícula 3×2',celdas:[
      {x:0,y:0,w:1/3,h:.5},{x:1/3,y:0,w:1/3,h:.5},{x:2/3,y:0,w:1/3,h:.5},
      {x:0,y:.5,w:1/3,h:.5},{x:1/3,y:.5,w:1/3,h:.5},{x:2/3,y:.5,w:1/3,h:.5}]},
    {id:'6-3x2',nombre:'Cuadrícula 2×3',celdas:[
      {x:0,y:0,w:.5,h:1/3},{x:.5,y:0,w:.5,h:1/3},
      {x:0,y:1/3,w:.5,h:1/3},{x:.5,y:1/3,w:.5,h:1/3},
      {x:0,y:2/3,w:.5,h:1/3},{x:.5,y:2/3,w:.5,h:1/3}]},
  ],
};
function celdasDesdeLayout(layout,PW,PH){
  const m=Math.round(PW*0.035),g=Math.round(PW*0.014);
  const areaW=PW-m*2,areaH=PH-m*2;
  return layout.celdas.map(c=>({
    x:m+c.x*areaW+g/2, y:m+c.y*areaH+g/2,
    w:c.w*areaW-g, h:c.h*areaH-g,
  }));
}
function dibujarImagenCover(ctx,bitmap,x,y,w,h,radio){
  ctx.save();
  ctx.beginPath();
  if(radio>0)trazarRectRedondeado(ctx,x,y,w,h,radio);
  else ctx.rect(x,y,w,h);
  ctx.clip();
  const escala=Math.max(w/bitmap.width,h/bitmap.height);
  const iw=bitmap.width*escala, ih=bitmap.height*escala;
  ctx.drawImage(bitmap,x+(w-iw)/2,y+(h-ih)/2,iw,ih);
  ctx.restore();
}
function encontrarLayout(layoutId){
  for(const n in LAYOUTS_ALBUM){const l=LAYOUTS_ALBUM[n].find(x=>x.id===layoutId);if(l)return l;}
  return null;
}

/* ── estado del constructor ── */
let _albumBuilder=null;

async function abrirDisenadorAlbum(tipo,id){
  if(!requiereAdmin())return;
  const fotos=(tipo==='galeria'?fotosDeGaleria(id):fotosDeLugar(id)).filter(f=>!esFormatoNoVisible(f.url));
  if(!fotos.length){toast('No hay fotos que exportar');return;}
  const titulo=tipo==='galeria'?galeriaDe(id).nombre:lugarDe(id).nombre;
  toast('Cargando diseñador de álbum…');
  const borrador=await cargarBorradorAlbumDB(tipo,id);
  _albumBuilder={tipo,id,titulo,fotos,paginas:borrador||[],redondeado:false};
  pintarConstructorAlbum();
}
function pintarConstructorAlbum(){
  const c=_albumBuilder;
  const listaPaginas=c.paginas.map((p,i)=>{
    const layout=encontrarLayout(p.layoutId);
    const miniCeldas=celdasDesdeLayout(layout,120,90).map((cel,j)=>{
      const f=c.fotos.find(x=>x.id===p.asignaciones[j]);
      return `<div class="mini-celda" style="left:${cel.x}px;top:${cel.y}px;width:${cel.w}px;height:${cel.h}px;background-image:url('${f?miniDe(f):''}')"></div>`;
    }).join('');
    return `<div class="pagina-album">
      <div class="mini-pagina">${miniCeldas}</div>
      <div class="datos-pagina"><b>Página ${i+1}</b><span>${layout.nombre} · ${p.asignaciones.filter(Boolean).length}/${p.asignaciones.length} fotos</span></div>
      <button class="quitar-pagina" onclick="quitarPaginaAlbum(${i})" aria-label="Eliminar página">✕</button>
    </div>`;
  }).join('');
  const completas=c.paginas.filter(p=>p.asignaciones.every(Boolean)).length;
  hoja(`
    <div class="grupo">
      <div class="cab-hoja"><b>${c.titulo}</b><span>Diseñador de álbum · ${c.paginas.length} página${c.paginas.length!==1?'s':''}</span></div>
      <button class="opcion interruptor" onclick="alternarRedondeadoBuilder()">
        <span>Esquinas redondeadas</span>
        <span class="interruptor-visual ${c.redondeado?'activo':''}"><span class="bola"></span></span>
      </button>
    </div>
    <div class="grupo">
      <div class="cab-hoja"><b>Páginas</b><span>${c.paginas.length?'Toca una página para editarla':'Aún no has añadido ninguna'}</span></div>
      ${listaPaginas||'<p class="vacio" style="padding:22px">Añade tu primera página abajo</p>'}
    </div>
    <button class="principal" style="background:var(--fondo2);color:var(--tinta)" onclick="elegirNumeroFotosPagina()">+ Añadir página</button>
    <button class="principal" onclick="guardarBorradorBuilder()">💾 Guardar borrador</button>
    <button class="principal" ${completas?'':'disabled'} onclick="generarAlbumDesdeBuilder()">📖 Generar PDF (${completas} página${completas!==1?'s':''} lista${completas!==1?'s':''})</button>
    <button class="cancelar" onclick="cerrarConstructorAlbum()">Cerrar</button>`);
  document.querySelectorAll('.pagina-album').forEach((el,i)=>{
    el.onclick=e=>{ if(!e.target.closest('.quitar-pagina'))editarPaginaAlbum(i); };
  });
}
function cerrarConstructorAlbum(){ cerrarHoja(); }
function alternarRedondeadoBuilder(){
  _albumBuilder.redondeado=!_albumBuilder.redondeado;
  pintarConstructorAlbum();
}
function quitarPaginaAlbum(i){
  _albumBuilder.paginas.splice(i,1);
  pintarConstructorAlbum();
}
async function guardarBorradorBuilder(){
  const c=_albumBuilder;
  const ok=await guardarBorradorAlbumDB(c.tipo,c.id,c.paginas);
  if(ok)toast('Borrador guardado — puedes continuar otro día');
}

/* ── elegir cuántas fotos y qué variante de diseño ── */
function elegirNumeroFotosPagina(){
  hoja(`
    <div class="grupo">
      <div class="cab-hoja"><b>Nueva página</b><span>¿Cuántas fotos lleva?</span></div>
      <div class="opciones-numero">
        ${[1,2,3,4,5,6].map(n=>`<button class="chip-numero" onclick="elegirVarianteLayout(${n})">${n}</button>`).join('')}
      </div>
    </div>
    <button class="cancelar" onclick="pintarConstructorAlbum()">Volver</button>`);
}
function elegirVarianteLayout(n){
  const variantes=LAYOUTS_ALBUM[n];
  const opciones=variantes.map(v=>{
    const celdas=celdasDesdeLayout(v,140,105);
    const mini=celdas.map(c=>`<div class="mini-celda" style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px"></div>`).join('');
    return `<button class="opcion-variante" onclick="crearPaginaAlbum(${n},'${v.id}')">
      <div class="mini-pagina">${mini}</div>
      <span>${v.nombre}</span>
    </button>`;
  }).join('');
  hoja(`
    <div class="grupo">
      <div class="cab-hoja"><b>${n} foto${n!==1?'s':''}</b><span>Elige el diseño</span></div>
      <div class="rejilla-variantes">${opciones}</div>
    </div>
    <button class="cancelar" onclick="elegirNumeroFotosPagina()">Volver</button>`);
}
function crearPaginaAlbum(n,layoutId){
  _albumBuilder.paginas.push({layoutId,asignaciones:new Array(n).fill(null)});
  editarPaginaAlbum(_albumBuilder.paginas.length-1);
}

/* ── rellenar los huecos de una página ── */
function editarPaginaAlbum(i){
  const c=_albumBuilder,p=c.paginas[i],layout=encontrarLayout(p.layoutId);
  const celdas=celdasDesdeLayout(layout,300,225);
  const huecos=celdas.map((cel,j)=>{
    const f=c.fotos.find(x=>x.id===p.asignaciones[j]);
    return `<button class="hueco-album ${f?'lleno':'vacio'}" style="left:${cel.x}px;top:${cel.y}px;width:${cel.w}px;height:${cel.h}px" onclick="elegirFotoParaHueco(${i},${j})">
      ${f?`<img src="${miniDe(f)}" alt="">`:'<span>+</span>'}
    </button>`;
  }).join('');
  const completa=p.asignaciones.every(Boolean);
  hoja(`
    <div class="grupo">
      <div class="cab-hoja"><b>Página ${i+1}</b><span>${layout.nombre} · toca cada hueco para elegir la foto</span></div>
      <div class="lienzo-editor"><div class="mini-pagina grande">${huecos}</div></div>
    </div>
    <button class="principal" ${completa?'':'disabled'} onclick="pintarConstructorAlbum()">${completa?'Página lista — continuar':'Rellena todos los huecos'}</button>
    <button class="cancelar" onclick="quitarPaginaAlbum(${i});pintarConstructorAlbum()">Eliminar esta página</button>`);
}
function elegirFotoParaHueco(paginaIdx,huecoIdx){
  const c=_albumBuilder;
  const opciones=c.fotos.map(f=>`
    <button class="foto-chip-album" onclick="asignarFotoAHueco(${paginaIdx},${huecoIdx},'${f.id}')">
      <img src="${miniDe(f)}" alt="">
    </button>`).join('');
  hoja(`
    <div class="grupo">
      <div class="cab-hoja"><b>Elige la foto</b><span>Para este hueco de la página ${paginaIdx+1}</span></div>
      <div id="lista-fotos-album">${opciones}</div>
    </div>
    <button class="cancelar" onclick="editarPaginaAlbum(${paginaIdx})">Volver</button>`);
}
function asignarFotoAHueco(paginaIdx,huecoIdx,fotoId){
  _albumBuilder.paginas[paginaIdx].asignaciones[huecoIdx]=fotoId;
  editarPaginaAlbum(paginaIdx);
}

/* ── generar el PDF final a partir de las páginas diseñadas ── */
async function dibujarPaginaBuilder(ctx,pagina,PW,PH,redondeado){
  const c=_albumBuilder,layout=encontrarLayout(pagina.layoutId);
  ctx.fillStyle='#FAFAF7';
  ctx.fillRect(0,0,PW,PH);
  const celdas=celdasDesdeLayout(layout,PW,PH);
  for(let j=0;j<celdas.length;j++){
    const f=c.fotos.find(x=>x.id===pagina.asignaciones[j]);
    if(!f)continue;
    try{
      const res=await fetch(f.url);
      const blob=await res.blob();
      const bitmap=await createImageBitmap(blob);
      dibujarImagenCover(ctx,bitmap,celdas[j].x,celdas[j].y,celdas[j].w,celdas[j].h,redondeado?Math.round(PW*0.016):0);
    }catch(e){ console.warn('foto de álbum omitida',e); }
  }
}
async function generarAlbumDesdeBuilder(){
  const c=_albumBuilder;
  const paginasListas=c.paginas.filter(p=>p.asignaciones.every(Boolean));
  if(!paginasListas.length){toast('Completa al menos una página antes de generar');return;}
  cerrarHoja();
  toast(`Generando álbum de ${paginasListas.length} página${paginasListas.length!==1?'s':''}…`,4500);
  try{
    await cargarJsPDF();
    const {jsPDF}=window.jspdf;
    const PW=1200,PH=900;
    const doc=new jsPDF({unit:'px',format:[PW,PH],orientation:'landscape'});

    doc.setFillColor(20,20,18);
    doc.rect(0,0,PW,PH,'F');
    doc.setTextColor(250,250,247);
    doc.setFont('helvetica','bold');
    doc.setFontSize(46);
    doc.text(c.titulo,PW/2,PH/2-6,{align:'center',maxWidth:PW-160});
    doc.setFont('helvetica','normal');
    doc.setFontSize(15);
    doc.setTextColor(190,190,184);
    doc.text(PERFIL.nombre,PW/2,PH/2+32,{align:'center'});

    for(let i=0;i<paginasListas.length;i++){
      subiendo(`Preparando página ${i+1} de ${paginasListas.length}…`);
      const cv=document.createElement('canvas');
      cv.width=PW;cv.height=PH;
      const ctx=cv.getContext('2d');
      await dibujarPaginaBuilder(ctx,paginasListas[i],PW,PH,c.redondeado);
      doc.addPage([PW,PH],'landscape');
      doc.addImage(cv.toDataURL('image/jpeg',0.9),'JPEG',0,0,PW,PH);
    }
    subidaLista();
    doc.save(c.titulo.replace(/[^\w\-]+/g,'_')+'-album.pdf');
    toast('Álbum descargado');
    await borrarBorradorAlbumDB(c.tipo,c.id);
  }catch(err){
    subidaLista();
    console.error(err);
    toast('No se pudo generar el álbum: '+err.message,4500);
  }
}
function trazarRectRedondeado(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
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

/* precarga silenciosa, de una en una y sin prisa, para que al entrar en
   Galerías/Mapa/Cronología las imágenes ya estén en caché del navegador */
function precargarMiniaturas(){
  const idle=window.requestIdleCallback||(fn=>setTimeout(fn,300));
  idle(()=>{
    const vistos=new Set();
    const urls=[];
    const agregar=u=>{ if(u&&!vistos.has(u)){vistos.add(u);urls.push(u);} };
    DATOS.fotos.forEach(f=>agregar(miniDe(f)));
    DATOS.galerias.forEach(g=>agregar(portadaDeGaleria(g)));
    let i=0;
    function siguiente(){
      if(i>=urls.length)return;
      const img=new Image();
      img.onload=img.onerror=()=>{ i++; idle(siguiente); };
      img.src=urls[i];
    }
    siguiente();
  });
}

/* ═══ arranque de datos ═══ */
(async()=>{
  const minimo=esperar(1100);
  const datos=cargarDatos().catch(err=>{
    console.error(err);
    toastAdmin('Error cargando la app: '+err.message,6000);
  });
  await Promise.race([Promise.all([datos,minimo]),esperar(6000)]);
  renderTodo();
  resolverHashInicial();
  $('arranque').classList.add('disparo');
  setTimeout(()=>$('arranque').classList.add('fuera'),260);
  precargarMiniaturas();
})();
