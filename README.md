# Miko

<!-- 🖼️ Logo pendiente: cuando lo subas al repo, reemplaza esta línea por: -->
<!-- ![Logo de Miko](./ruta/al/logo.png) -->

**Miko** — Sistema web de punto de venta e inventario multi-sede.

🚧 En desarrollo — Proyecto Integrador, 3er semestre, Ingeniería de Software.

Aplicación que permite a una empresa con varias sucursales administrar de forma centralizada su inventario, usuarios y ventas. Un Administrador General gestiona sucursales y Gerentes; cada Gerente controla el inventario de su sede; los Cajeros registran las ventas desde un punto de venta (POS). Interfaz disponible en español e inglés.

**Stack tecnológico:**

| Capa | Tecnología |
|---|---|
| Backend | FastAPI (Python) |
| Base de datos | PostgreSQL + Alembic |
| Frontend | React (Vite) + React Router + Axios + react-i18next + Tailwind CSS |
| Infraestructura | Docker + Docker Compose |
| Gestor de paquetes (frontend) | pnpm |

## Funcionalidades implementadas

✅ Entorno de desarrollo completo con Docker (backend, frontend y base de datos aislados y comunicados entre sí)
✅ Frontend base con Vite + React, con cambio de idioma español/inglés funcional
✅ Backend base con FastAPI respondiendo peticiones
✅ Diseño del modelo relacional completo (diagrama entidad-relación y diccionario de datos)

🔜 Pendiente:
- Migraciones de base de datos con Alembic
- Autenticación de usuarios (JWT) y control de acceso por rol
- CRUD de sucursales, productos e inventario
- Módulo de ventas (POS)

## Capturas de la plataforma

<!-- 📸 Agregar aquí capturas conforme se implementen las pantallas -->
_(Próximamente)_

## Guía de instalación

### Requisitos previos

- Docker instalado y corriendo (con Docker Compose plugin)
- Git

No necesitas instalar Python, Node ni PostgreSQL en tu máquina — todo corre dentro de los contenedores.

### Pasos

```bash
git clone https://github.com/diegoa-mg/Miko.git
cd Miko
cp .env.example .env
cp frontend/.env.example frontend/.env
docker compose up -d --build
```

Verifica que los 3 contenedores estén `Up` con `docker compose ps`, y abre:

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend (API) | http://localhost:8000 |
| Documentación de la API (Swagger) | http://localhost:8000/docs |

**Notas técnicas:**
- El frontend usa **pnpm**, no npm — instala paquetes con `docker compose exec frontend pnpm add <paquete>`, nunca desde tu máquina directamente.
- Requiere **Node 22+** dentro del contenedor (ya configurado en `frontend/Dockerfile`) — es un requisito de la versión de pnpm usada, no lo cambies a una imagen de Node más vieja.

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

## Equipo de desarrollo

| Integrante | GitHub |
|---|---|
| Diego Morales | [@diegoa-mg](https://github.com/diegoa-mg) |
| Nombre Apellido | [@usuario](https://github.com/usuario) |
| Nombre Apellido | [@usuario](https://github.com/usuario) |
| Nombre Apellido | [@usuario](https://github.com/usuario) |
| Nombre Apellido | [@usuario](https://github.com/usuario) |
