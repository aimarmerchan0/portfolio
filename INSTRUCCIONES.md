# Archivo fotográfico — Aimar Merchán
Guía de instalación, publicación y actualización (todo se puede hacer desde el iPad).

## Archivos del proyecto
```
index.html          ← página principal
css/estilos.css     ← todo el diseño
js/config.js        ← TUS credenciales de Supabase (edítalo)
js/datos.js         ← capa de datos (no hace falta tocarlo)
js/app.js           ← interfaz (no hace falta tocarlo)
js/admin.js         ← panel de administración (no hace falta tocarlo)
```
Mientras `js/config.js` esté vacío, la web funciona en **modo demo** con fotos de prueba.

---

## 1 · Configurar tu proyecto de Supabase (una sola vez, ~10 min)

Entra en **supabase.com → tu proyecto** y sigue estos 4 pasos.

### 1.1 Crear las tablas
Ve a **SQL Editor → New query**, pega esto y pulsa **Run**:

```sql
-- Tablas
create table lugares (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  region text,
  lat double precision,
  lng double precision,
  creado timestamptz default now()
);

create table galerias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  anio text,
  lugar_id uuid references lugares(id) on delete set null,
  portada_url text,
  creado timestamptz default now()
);

create table fotos (
  id uuid primary key default gen_random_uuid(),
  galeria_id uuid references galerias(id) on delete cascade,
  lugar_id uuid references lugares(id) on delete set null,
  titulo text,
  url text not null,
  url_original text,
  exif text,
  vertical boolean,
  orden bigint default 0,
  creado timestamptz default now()
);

-- Seguridad: cualquiera puede LEER, solo tú (autenticado) puedes ESCRIBIR
alter table lugares  enable row level security;
alter table galerias enable row level security;
alter table fotos    enable row level security;

create policy "lectura publica lugares"  on lugares  for select using (true);
create policy "lectura publica galerias" on galerias for select using (true);
create policy "lectura publica fotos"    on fotos    for select using (true);

create policy "escritura admin lugares"  on lugares  for all to authenticated using (true) with check (true);
create policy "escritura admin galerias" on galerias for all to authenticated using (true) with check (true);
create policy "escritura admin fotos"    on fotos    for all to authenticated using (true) with check (true);
```

### 1.2 Crear el bucket de imágenes
1. Menú **Storage → New bucket**
2. Nombre: `fotos`
3. Activa **Public bucket** ✅ y crea.
4. Vuelve a **SQL Editor** y ejecuta las políticas del bucket:

```sql
create policy "lectura publica storage" on storage.objects
  for select using (bucket_id = 'fotos');

create policy "subida admin storage" on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos');

create policy "actualizar admin storage" on storage.objects
  for update to authenticated using (bucket_id = 'fotos');

create policy "borrar admin storage" on storage.objects
  for delete to authenticated using (bucket_id = 'fotos');
```

### 1.3 Crear tu usuario administrador
1. Menú **Authentication → Users → Add user → Create new user**
2. Pon tu correo y una contraseña segura. Marca **Auto Confirm User** ✅.
3. (Recomendado) En **Authentication → Sign In / Providers**, desactiva **"Allow new users to sign up"** para que nadie más pueda registrarse.

### 1.4 Copiar tus credenciales
En **Settings → API** copia:
- **Project URL** → pégala en `SUPABASE_URL` de `js/config.js`
- **anon public** (API key) → pégala en `SUPABASE_ANON_KEY`

> La clave *anon* es pública por diseño: puede ir en el código sin problema.
> La seguridad la ponen las políticas del paso 1.1 (nadie puede escribir sin tu sesión).
> **Nunca** pongas la clave `service_role` en la web.

---

## 1.5 · Migración: fechas en fotos y orden en galerías (ejecutar una sola vez)

Si ya creaste las tablas antes de esta versión, ve a **SQL Editor → New query** y ejecuta esto completo:

```sql
alter table fotos    add column if not exists fecha date;
alter table galerias add column if not exists orden bigint;

-- deja las galerías existentes ordenadas por fecha de creación, para no dejarlas todas mezcladas
update galerias set orden = extract(epoch from creado)*1000 where orden is null;

-- MUY IMPORTANTE: sin esto, Supabase puede seguir "sin ver" las columnas nuevas
-- durante un rato y las fechas parecerán no guardarse aunque el SQL se ejecutara bien.
notify pgrst, 'reload schema';
```

Si después de ejecutar esto las fechas siguen sin guardarse, espera 1 minuto (a veces el aviso tarda en propagarse) y vuelve a intentarlo.

---

## 2 · Publicar en GitHub + Vercel (desde el iPad)

1. Descarga los 6 archivos de este chat a la app **Archivos**, respetando las carpetas `css/` y `js/`.
2. **GitHub** (Safari): crea el repositorio `portafolio` → **Add file → Upload files** → arrastra/selecciona los archivos.
   - Para las carpetas: al subir, escribe el nombre con ruta (`css/estilos.css`, `js/app.js`, …) en el campo del nombre, o sube desde Archivos con las carpetas en Split View.
3. **Vercel**: vercel.com → **Continue with GitHub** → **Add New → Project** → elige `portafolio` → **Deploy**.
4. En 1 minuto tendrás tu URL pública. Abre la web, entra en **Menú ☰ → Acceso administrador** con tu correo y contraseña, y empieza a crear lugares, galerías y a subir fotos.

## 3 · Actualizar la web más adelante

- **Contenido (fotos, galerías, lugares, portadas, originales, fechas):** no hace falta tocar código nunca. Todo se hace desde la propia web con tu sesión de administrador.
- **Diseño o código:** edita el archivo en GitHub (abre el archivo → icono del lápiz → guarda con *Commit changes*). Vercel republica solo en ~1 minuto.
- **Dominio propio:** Vercel → tu proyecto → **Settings → Domains** → añade `aimarmerchan.com` y sigue las instrucciones de DNS.

## 4 · Qué puedes hacer como administrador

Todo lo de abajo **solo es visible con tu sesión iniciada** — un visitante no ve ningún botón de crear, editar ni el panel de errores.

| Dónde | Acción |
|---|---|
| Mapa → botón **+** | Elegir entre tocar el mapa directamente, o escribir coordenadas a mano |
| Mapa → tocar cualquier punto | Crear un lugar ahí al instante (si el nombre/zona se parece a uno que ya existe, te lo avisa para evitar duplicar) |
| Formulario de lugar | **Buscar por dirección** ("Alicante, España") y rellenar coordenadas automáticamente |
| Al crear un lugar | Te ofrece subir fotos a ese lugar inmediatamente |
| Tarjeta de lugar / pin | Editar, **añadir fotos directamente al lugar** (sin necesidad de galería), cambiar ubicación, eliminar |
| Galerías → botón **+** | Crear galería (nombre, año orientativo, y lugar — buscando entre los que ya tienes o escribiendo una dirección nueva) |
| Galerías → **Reordenar** | Cambiar el orden en que se listan las galerías, con flechas ↑↓ |
| Tarjeta de galería → ··· | Editar, cambiar portada, eliminar |
| Dentro de una galería o un lugar → **+** | **Subir varias fotos a la vez**, indicando la fecha del lote — se comprimen y generan una miniatura ligera automáticamente para que todo cargue rápido |
| Dentro de una galería → **Reordenar** | Cambiar el orden de las fotos con flechas ↑↓ |
| Una foto → Info | Editar título/**fecha**/EXIF/lugar propio, **subir el original (antes)**, usarla de portada, eliminar |
| Menú → **Cronología** | Todas tus fotos de cualquier galería o lugar, ordenadas de más reciente a más antigua, agrupadas por fecha, cada una con su ubicación (o "Sin ubicación" si no tiene) |

**Las fechas viven en las fotos, no en las galerías** — una galería es solo una colección con nombre; puedes subirle fotos en visitas o temporadas distintas, cada tanda con su propia fecha, y la Cronología las ordenará todas correctamente sin duplicar el lugar.

El botón **Antes/Después** del visor usa el original real si lo has subido (ambas versiones se ven siempre al mismo tamaño, sea cual sea el archivo); si no, lo simula. Al tocar una foto, el visor se abre con un efecto de zoom desde la miniatura.

