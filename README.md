# POS Multi-sede — Guía de instalación

Aplicación web de punto de venta e inventario multi-sede. Stack: FastAPI (Python) + PostgreSQL + React (Vite) + Docker + Alembic.

## Requisitos previos

- Docker instalado y corriendo (con Docker Compose plugin: `docker compose version` debe funcionar)
- Git

No necesitas instalar Python, Node ni PostgreSQL en tu máquina — todo corre dentro de los contenedores.

## Primera vez que clonas el repositorio

### 1. Clona el proyecto

```bash
git clone https://github.com/diegoa-mg/Miko.git
cd Miko
```

### 2. Crea tus archivos de variables de entorno

Hay **dos** archivos `.env` distintos, uno por cada parte que los necesita — no son intercambiables ni redundantes:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

El de la raíz lo usan `db` y `backend` (contraseñas y nombre de la base de datos). El de `frontend/` lo usa Vite específicamente — Vite solo busca su `.env` dentro de la misma carpeta donde vive `vite.config.js`, nunca en la raíz.

No los modifiques a menos que sepas lo que haces (todo el equipo debe usar los mismos valores para evitar inconsistencias).

Verifica que ambos tengan contenido:

```bash
cat .env
cat frontend/.env
```

Deberías ver:
```
DB_NAME=pos_multisede
DB_USER=admin
DB_PASSWORD=changeme
```
```
VITE_API_URL=http://localhost:8000
```

> ⚠️ **Nunca subas tu `.env` a git.** Ya están en `.gitignore`, pero verifica que no aparezcan en `git status` antes de hacer commit.

### 3. Levanta todo el entorno

```bash
docker compose up -d --build
```

La primera vez tarda más porque descarga las imágenes base e instala dependencias (Python y Node/pnpm). Las siguientes veces es mucho más rápido.

### 4. Verifica que todo esté corriendo

```bash
docker compose ps
```

Deberías ver **tres** contenedores en estado `Up`:
- `pos_db` (Postgres)
- `pos_backend` (FastAPI)
- `pos_frontend` (Vite dev server)

### 5. Prueba que todo responde

```bash
curl http://localhost:8000
```

Debería regresar:
```json
{"status":"ok","message":"API corriendo"}
```

Y en el navegador:

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend (API) | http://localhost:8000 |
| Documentación interactiva de la API (Swagger) | http://localhost:8000/docs |

## Uso diario (una vez ya configurado)

```bash
docker compose up -d        # levantar el entorno
docker compose down         # apagar todo (los datos de la BD se mantienen)
docker compose logs -f backend    # ver logs del backend en vivo
docker compose logs -f frontend   # ver logs del frontend en vivo
```

Tanto el backend como el frontend tienen el código montado como volumen: los cambios que guardes en tu editor se reflejan al instante (hot-reload) sin necesidad de reconstruir nada. Solo necesitas `--build` de nuevo si cambias `requirements.txt`, `package.json` o algún `Dockerfile`.

## Comandos útiles

### Docker Compose

| Comando | Qué hace |
|---|---|
| `docker compose up -d` | Levanta todo en segundo plano |
| `docker compose up -d --build` | Reconstruye imágenes y levanta (usar tras cambiar `requirements.txt`, `package.json` o un `Dockerfile`) |
| `docker compose down` | Detiene y elimina contenedores (datos persisten) |
| `docker compose down -v` | Detiene y **elimina también los datos** de la base de datos — usar con cuidado |
| `docker compose ps` | Ver contenedores corriendo |
| `docker compose ps -a` | Ver también contenedores detenidos |
| `docker compose logs db` \| `backend` \| `frontend` | Ver logs de un servicio |
| `docker compose exec backend bash` | Entrar a una terminal dentro del contenedor del backend |
| `docker compose exec db psql -U admin -d pos_multisede` | Conectarte directo a la base de datos |

### Frontend (dentro del contenedor)

El proyecto usa **pnpm**, no npm — instalar paquetes desde tu máquina no sirve de nada porque no tienes Node instalado ahí. Todo se hace a través del contenedor:

| Comando | Qué hace |
|---|---|
| `docker compose exec frontend pnpm add <paquete>` | Instalar una dependencia nueva (ej. una librería de componentes) |
| `docker compose exec frontend pnpm add -D <paquete>` | Instalar una dependencia solo de desarrollo |
| `docker compose exec frontend pnpm remove <paquete>` | Quitar una dependencia |
| `docker compose exec frontend pnpm run build` | Generar el build de producción (para probarlo, no para desarrollo diario) |

Después de `pnpm add` o `pnpm remove`, el `pnpm-lock.yaml` en tu carpeta local se actualiza automáticamente (gracias al volumen montado) — súbelo a git junto con tu cambio en `package.json`, siempre juntos, nunca uno sin el otro.

### PostgreSQL (dentro de `psql`)

| Comando | Qué hace |
|---|---|
| `\l` | Listar bases de datos |
| `\c nombre_bd` | Conectarte a otra base de datos |
| `\dt` | Listar tablas de la base actual |
| `\d nombre_tabla` | Ver estructura de una tabla |
| `\du` | Listar usuarios/roles de Postgres |
| `\q` | Salir |

## Problemas comunes

**"variable is not set" al levantar Docker**
→ Tu `.env` está vacío o no existe. Verifica con `cat .env` y créalo desde `.env.example` si hace falta.

**El contenedor de la base de datos se cae (`Exited`)**
→ Revisa los logs con `docker compose logs db`. Si ves un error sobre la ruta del volumen, probablemente hay datos de una versión anterior de Postgres — corre `docker compose down -v` para limpiar (esto borra los datos, úsalo solo si no tienes nada importante todavía) y vuelve a levantar con `docker compose up -d`.

**`COPY failed: file not found` al hacer build**
→ Falta algún archivo dentro de la carpeta que Docker usa como contexto de build (`backend/` o `frontend/`). Verifica con `ls -la backend/` o `ls -la frontend/` que estén los archivos esperados.

**El frontend falla con `ERR_PNPM_IGNORED_BUILDS` o pide "approve-builds"**
→ pnpm bloquea por seguridad los scripts de instalación de paquetes con binarios nativos (como `esbuild`, que usa Vite). Ya está resuelto en `frontend/pnpm-workspace.yaml` con `allowBuilds: esbuild: true` — si el error vuelve a aparecer, confirma que ese archivo no se haya borrado y que el `Dockerfile` lo copie junto con `package.json`.

**El frontend falla con `pnpm requires at least Node.js vXX.X`**
→ El `Dockerfile` usa `node:22-alpine` a propósito porque la versión de pnpm que usamos requiere Node 22 o superior. Si alguien lo cambia a una versión de Node más vieja, el build va a fallar con este mismo error.

**`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` o el build falla en `pnpm install --frozen-lockfile`**
→ Alguien editó `package.json` (agregó/quitó una dependencia a mano) sin regenerar el lockfile. Corre `docker compose exec frontend pnpm install` (sin `--frozen-lockfile`) para regenerarlo, verifica que `frontend/pnpm-lock.yaml` cambió, y súbelo a git junto con el `package.json`.

**Instalé un paquete nuevo con `pnpm add` pero no aparece / da error raro**
→ Confirma que lo corriste con `docker compose exec frontend pnpm add ...` y no directo en tu terminal (ahí no hay Node instalado). Si sigue sin verse, prueba `docker compose up -d --build frontend`.

## Estructura del proyecto

```
Miko/
├── docker-compose.yml
├── .env.example            # plantilla de variables de entorno (raíz)
├── .gitignore
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── src/
│       └── main.py         # punto de entrada de FastAPI
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── pnpm-lock.yaml
    ├── pnpm-workspace.yaml  # aprueba el script nativo de esbuild
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── .env.example         # plantilla de variables de entorno (frontend)
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── i18n.js
        ├── index.css
        ├── api/
        │   └── axios.js
        └── locales/
            ├── es/translation.json
            └── en/translation.json
```
