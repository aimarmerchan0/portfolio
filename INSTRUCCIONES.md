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

## 2 · Publicar en GitHub + Vercel (desde el iPad)

1. Descarga los 6 archivos de este chat a la app **Archivos**, respetando las carpetas `css/` y `js/`.
2. **GitHub** (Safari): crea el repositorio `portafolio` → **Add file → Upload files** → arrastra/selecciona los archivos.
   - Para las carpetas: al subir, escribe el nombre con ruta (`css/estilos.css`, `js/app.js`, …) en el campo del nombre, o sube desde Archivos con las carpetas en Split View.
3. **Vercel**: vercel.com → **Continue with GitHub** → **Add New → Project** → elige `portafolio` → **Deploy**.
4. En 1 minuto tendrás tu URL pública. Abre la web, entra en **Menú ☰ → Acceso administrador** con tu correo y contraseña, y empieza a crear lugares, galerías y a subir fotos.

## 3 · Actualizar la web más adelante

- **Contenido (fotos, galerías, lugares, portadas, originales):** no hace falta tocar código nunca. Todo se hace desde la propia web con tu sesión de administrador.
- **Diseño o código:** edita el archivo en GitHub (abre el archivo → icono del lápiz → guarda con *Commit changes*). Vercel republica solo en ~1 minuto.
- **Dominio propio:** Vercel → tu proyecto → **Settings → Domains** → añade `aimarmerchan.com` y sigue las instrucciones de DNS.

## 4 · Qué puedes hacer como administrador

| Dónde | Acción |
|---|---|
| Mapa → botón **+** | Crear lugar (formulario o **tocando el mapa** para fijar lat/lng) |
| Tarjeta de lugar / pin | Editar, **cambiar ubicación en el mapa**, eliminar |
| Galerías → botón **+** | Crear galería (nombre, año, lugar) |
| Tarjeta de galería → ··· | Editar, cambiar portada, eliminar |
| Dentro de una galería → **+** | **Subir fotos** (varias a la vez, desde Fotos del iPhone/iPad) |
| Una foto → Info | Editar título/EXIF, asignarle **su propio lugar**, **subir el original (antes)**, usarla de portada, eliminar |

El botón **Antes/Después** del visor usa el original real si lo has subido; si no, lo simula.
