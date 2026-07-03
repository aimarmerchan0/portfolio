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
function esperar(ms){return new Promise(r=>setTimeout(r,ms));}

/* ── perfil ── */
$('menu-nombre').textContent=PERFIL.nombre;
$('menu-sub').textContent=PERFIL.subtitulo;
$('menu-lema').textContent=PERFIL.lema;
$('menu-copy').textContent=PERFIL.nombre;
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
  renderInicio();
  renderGalerias();
  renderMapaCartas();
  if(mapa)renderMarcadores();
  if(raizActual==='cronologia')renderCronologia();
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

  renderCronologiaPreview();
}
function renderCronologiaPreview(){
  const cont=$('inicio-cronologia');cont.innerHTML='';
  const todas=todasLasFotosOrdenadas().slice(0,10);
  if(!todas.length){cont.innerHTML='<p class="vacio">Aún no hay fotos.</p>';return;}
  todas.forEach((f,j)=>{
    const d=document.createElement('button');
    d.className='foto-mini-cron';
    d.innerHTML=`<img loading="lazy" src="${miniDe(f)}" alt="">
      <span>${f.lugarNombre||'Sin ubicación'}</span>`;
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
  btnR.style.display=(SESION&&DATOS.galerias.length>1)?'inline-flex':'none';
  btnR.textContent=modoReordenarGalerias?'Listo':'Reordenar';
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
let mapa=null,capaTerreno=null,capaSatelite=null,capaMarcadores=null,intentosMapa=0,tilesFallidos=0,tilesOk=0,vistaMapa='terreno';
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
  if(txt){ $('mapa-fallback-txt').textContent=txt; f.classList.add('visible'); }
  else f.classList.remove('visible');
}
function iniciarMapa(){
  if(mapa){mapa.invalidateSize();return;}
  cargarLeaflet().then(iniciarMapaReal).catch(err=>{
    console.error(err);
    fallbackMapa('La librería del mapa no ha podido cargarse ('+err.message+'). Revisa tu conexión y recarga.');
  });
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
    portada:fotos[0]?fotos[0].url:'',
    fotos,mostrarOrigen:true,
  });
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
  $('btn-reordenar').style.display=(SESION&&c.tipo==='galeria'&&c.fotos.length>1)?'inline-flex':'none';
  $('btn-reordenar').textContent=modoReordenar?'Listo':'Reordenar';
  pintarGridColeccion();
  $('col-scroll').scrollTop=0;
  $('col-topbar').classList.remove('solida');
  $('p-colec').classList.add('abierta');
  document.body.classList.add('empujada');
}
let modoReordenar=false,celdasColeccion=[];
function alternarReordenar(){
  modoReordenar=!modoReordenar;
  $('fab-colec').classList.toggle('visible',(coleccion.tipo==='galeria'||coleccion.tipo==='lugar')&&!modoReordenar);
  $('btn-reordenar').textContent=modoReordenar?'Listo':'Reordenar';
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
      const fechaTxt=grp.fecha?fechaMostrar(grp.fecha):'Sin fecha';
      cab.innerHTML=`<b>${fechaTxt}</b><span>${grp.titulo} · ${grp.fotos.length} foto${grp.fotos.length!==1?'s':''}</span>`;
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
        <button class="opcion" onclick="cerrarHoja();subirFotosALugar('${lid}')">Añadir fotos a este lugar</button>
        <button class="opcion" onclick="cerrarHoja();formLugar('${lid}')">Editar lugar</button>
        <button class="opcion" onclick="cerrarHoja();reubicarLugar('${lid}')">Cambiar ubicación en el mapa</button>
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

/* ═══ CRONOLOGÍA: todas las fotos, de cualquier galería o lugar, más recientes primero ═══ */
let celdasCronologia=[];
function renderCronologia(){
  const cont=$('cronologia-lista');
  cont.innerHTML='';
  const todas=todasLasFotosOrdenadas();
  celdasCronologia=new Array(todas.length).fill(null);
  if(!todas.length){cont.innerHTML='<p class="vacio">Aún no hay fotos. '+(SESION?'Sube alguna desde una galería o un lugar.':'')+'</p>';return;}
  let fechaAnterior=undefined;
  todas.forEach((f,j)=>{
    if(f.fechaEfectiva!==fechaAnterior){
      const cab=document.createElement('div');
      cab.className='cab-cronologia entra-cron';
      cab.textContent=fechaRelativa(f.fechaEfectiva);
      cont.appendChild(cab);
      fechaAnterior=f.fechaEfectiva;
    }
    const fila=document.createElement('button');
    fila.className='fila-cronologia entra-cron';
    fila.innerHTML=`
      <div class="marco"><img loading="lazy" src="${miniDe(f)}" alt=""></div>
      <div class="datos">
        <b>${f.titulo||'Sin título'}</b>
        <span>${f.lugarNombre?f.lugarNombre:'Sin ubicación'}${f.galeria?' · '+f.galeria:''}</span>
      </div>
      <svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>`;
    fila.onclick=e=>abrirFotoCronologia(j,e.currentTarget);
    cont.appendChild(fila);
    celdasCronologia[j]=fila;
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
      <div class="marco"><img src="${f.url}" alt="${f.titulo||''}"></div>`;
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

  /* efecto FLIP: crece desde la miniatura tocada hasta el panel de destino */
  const reducido=matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(origenEl&&!reducido){
    const r=origenEl.getBoundingClientRect();
    const rv=rectPanelDestino();
    const esc={x:r.width/rv.width,y:r.height/rv.height};
    const tx=(r.left+r.width/2)-(rv.left+rv.width/2);
    const ty=(r.top+r.height/2)-(rv.top+rv.height/2);
    pFotoEl.style.transition='none';
    pFotoEl.style.transformOrigin='center';
    pFotoEl.style.transform=`translate(${tx}px,${ty}px) scale(${esc.x},${esc.y})`;
    pFotoEl.style.borderRadius='16px';
    pFotoEl.style.opacity='.4';
    pFotoEl.classList.add('abierta');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      pFotoEl.style.transition='transform .5s cubic-bezier(.22,1,.36,1), opacity .35s ease, border-radius .5s';
      pFotoEl.style.transform='none';
      pFotoEl.style.borderRadius='0';
      pFotoEl.style.opacity='1';
    }));
    setTimeout(()=>{pFotoEl.style.transition='';pFotoEl.style.transformOrigin='';},560);
  }else{
    pFotoEl.style.transform='';pFotoEl.style.opacity='';pFotoEl.style.borderRadius='';
    pFotoEl.classList.add('abierta');
  }
  document.body.classList.add('nivel2');
}
function volverDeFoto(){
  quitarComparador();
  const destino=celdas[fotoIdx];
  const reducido=matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(destino&&!reducido){
    const r=destino.getBoundingClientRect();
    const rv=rectPanelDestino();
    const esc={x:r.width/rv.width,y:r.height/rv.height};
    const tx=(r.left+r.width/2)-(rv.left+rv.width/2);
    const ty=(r.top+r.height/2)-(rv.top+rv.height/2);
    pFotoEl.style.transition='transform .42s cubic-bezier(.32,.1,.4,1), opacity .4s ease, border-radius .42s';
    pFotoEl.style.transformOrigin='center';
    pFotoEl.style.transform=`translate(${tx}px,${ty}px) scale(${esc.x},${esc.y})`;
    pFotoEl.style.borderRadius='16px';
    pFotoEl.style.opacity='.3';
    setTimeout(()=>{
      pFotoEl.classList.remove('abierta');
      pFotoEl.style.transition='';pFotoEl.style.transform='';pFotoEl.style.opacity='';pFotoEl.style.borderRadius='';pFotoEl.style.transformOrigin='';
      document.body.classList.remove('nivel2');
    },420);
  }else{
    pFotoEl.classList.remove('abierta');
    document.body.classList.remove('nivel2');
  }
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

/* comparador antes/después: usa el original real si existe.
   Se fija el tamaño del marco ANTES de intercambiar imágenes, para que
   "antes" y "después" se vean exactamente en el mismo tamaño aunque
   el archivo original tenga otras dimensiones o proporción. */
function alternarComparador(){cmpActivo?quitarComparador():ponerComparador();}
function ponerComparador(){
  cmpActivo=true;
  $('btn-cmp').classList.add('activo');
  const f=coleccion.fotos[fotoIdx];
  const marco=slides[fotoIdx].querySelector('.marco');
  const base=marco.querySelector('img');

  /* 1. fija el tamaño actual del marco en píxeles para que no cambie al meter otra imagen */
  const r=marco.getBoundingClientRect();
  marco.style.width=r.width+'px';
  marco.style.height=r.height+'px';

  /* 2. muestra el "antes" en la capa base */
  if(f.url_original){base.dataset.editada=base.src;base.src=f.url_original;}
  else base.classList.add('filtro-raw');

  /* 3. capa "después" superpuesta, con la MISMA técnica de encaje (contain) que el resto de la app */
  marco.insertAdjacentHTML('beforeend',`
    <div class="cmp-capa" style="--pos:0%"><img src="${f.url}" alt=""></div>
    <div class="cmp-div" style="--pos:0%"><div class="asa">⟨⟩</div></div>
    <span class="cmp-tag a">Antes</span><span class="cmp-tag b">Después</span>`);
  const capa=marco.querySelector('.cmp-capa'),divi=marco.querySelector('.cmp-div');

  /* 4. barrido de entrada suave, de 0% a 50% */
  capa.style.transition='clip-path .7s cubic-bezier(.22,1,.36,1)';
  divi.style.transition='left .7s cubic-bezier(.22,1,.36,1)';
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    capa.style.setProperty('--pos','50%');
    divi.style.setProperty('--pos','50%');
  }));
  setTimeout(()=>{capa.style.transition='';divi.style.transition='';},720);

  /* 5. arrastre manual, fluido y 1:1 con el dedo */
  let arr=false;
  const mover=x=>{
    const rr=marco.getBoundingClientRect();
    const pos=Math.min(96,Math.max(4,(x-rr.left)/rr.width*100))+'%';
    capa.style.setProperty('--pos',pos);divi.style.setProperty('--pos',pos);
  };
  marco.onpointerdown=e=>{
    arr=true;marco.setPointerCapture(e.pointerId);
    capa.style.transition='';divi.style.transition='';
    mover(e.clientX);
  };
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
    m.style.width='';m.style.height='';
  });
}
function compartirFoto(){
  const f=coleccion.fotos[fotoIdx];
  if(navigator.share){navigator.share({title:f.titulo||PERFIL.nombre,url:f.url}).catch(()=>{});}
  else{toast('Compartir no está disponible en este navegador');}
}
function abrirHojaInfo(){
  const f=coleccion.fotos[fotoIdx];
  const fecha=f.fechaEfectiva?fechaMostrar(f.fechaEfectiva):null;
  const contexto=(coleccion.tipo==='lugar'||coleccion.tipo==='cronologia')&&f.galeria?' · Galería '+f.galeria:'';
  const ubicacion=coleccion.tipo==='cronologia'?(f.lugarNombre||'Sin ubicación'):null;
  hoja(`
    <div class="grupo">
      <div class="cab-hoja"><b>${f.titulo||'Sin título'}</b><span>${coleccion.titulo}${contexto}</span></div>
      ${fecha?`<div class="dato">Fecha <span>${fecha}</span></div>`:''}
      ${ubicacion?`<div class="dato">Ubicación <span>${ubicacion}</span></div>`:''}
      ${f.exif?`<div class="dato">Ajustes <span>${f.exif}</span></div>`:''}
      <div class="dato">Original (antes) <span>${f.url_original?'Sí — se usa al comparar':'No subido (se simula)'}</span></div>
      ${SESION?`
        <button class="opcion" onclick="cerrarHoja();formFoto('${f.id}')">Editar título / fecha / EXIF / lugar</button>
        <button class="opcion" onclick="cerrarHoja();subirOriginal('${f.id}')">Subir foto original (antes)</button>
        ${f.galeria_id?`<button class="opcion" onclick="cerrarHoja();usarComoPortada('${f.id}')">Usar como portada de la galería</button>`:''}
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
  const minimo=esperar(1100);
  const datos=cargarDatos().catch(err=>{
    console.error(err);
    toast('Error cargando la app: '+err.message,6000);
  });
  await Promise.race([Promise.all([datos,minimo]),esperar(6000)]);
  renderTodo();
  $('arranque').classList.add('disparo');
  setTimeout(()=>$('arranque').classList.add('fuera'),260);
})();
