<div align="center">

<!-- 🖼️ Logo pendiente: reemplaza este comentario cuando lo subas -->
<!-- <img src="./ruta/al/logo.png" width="200" alt="Logo de Miko" /> -->

# Miko
### Control centralizado de sucursales, inventario y ventas

![Estado](https://img.shields.io/badge/estado-en%20desarrollo-yellow)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Alembic](https://img.shields.io/badge/Alembic-migrations-6BA539)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)

</div>

Aplicación web que permite a una empresa con varias sucursales administrar de forma centralizada su inventario, usuarios y ventas. Un Administrador General gestiona sucursales y Gerentes; cada Gerente controla el inventario de su sede; los Cajeros registran las ventas desde un punto de venta (POS). Interfaz disponible en español e inglés.

**Stack tecnológico:**

| Capa | Tecnología |
|---|---|
| Backend | FastAPI (Python) |
| Base de datos | PostgreSQL + Alembic |
| Frontend | React (Vite) + React Router + Axios + react-i18next + Tailwind CSS |
| Infraestructura | Docker + Docker Compose |
| Gestor de paquetes (frontend) | pnpm |

## 🚀 Funcionalidades implementadas

✅ Entorno de desarrollo completo con Docker (backend, frontend y base de datos aislados y comunicados entre sí)<br>
✅ Frontend base con Vite + React, con cambio de idioma español/inglés funcional<br>
✅ Backend base con FastAPI respondiendo peticiones<br>
✅ Diseño del modelo relacional completo (diagrama entidad-relación y diccionario de datos)

🔜 Pendiente:
- Migraciones de base de datos con Alembic
- Autenticación de usuarios (JWT) y control de acceso por rol
- CRUD de sucursales, productos e inventario
- Módulo de ventas (POS)

## 📸 Capturas de la plataforma

<!-- 📸 Agregar aquí capturas conforme se implementen las pantallas -->
_(Próximamente)_

## 🛠️ Guía de instalación

### Requisitos previos

- Docker instalado y corriendo (con Docker Compose plugin)
- Git

No necesitas instalar Python, Node ni PostgreSQL en tu máquina — todo corre dentro de los contenedores.

### Paso 1: Clonar el repositorio y entrar a la carpeta

```bash
git clone https://github.com/diegoa-mg/Miko.git
cd Miko
```

### Paso 2: Crear archivos .env

```
cp .env.example .env
cp frontend/.env.example frontend/.env
```

### Paso 3: Levantar el contenedor
```
docker compose up -d --build
```

Verifica que los 3 contenedores estén `Up` con `docker compose ps`, y abre:

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend (API) | http://localhost:8000 |
| Documentación de la API (Swagger) | http://localhost:8000/docs |

**⚠️ No modifiques el `Dockerfile` del frontend** sin saber por qué está así — usa una versión específica de Node y pnpm a propósito; cambiarlo rompe el build para todo el equipo.

## 📂 Estructura del proyecto

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

## 👤 Equipo de desarrollo

| Integrante | GitHub |
|---|---|
| Diego Morales | [@diegoa-mg](https://github.com/diegoa-mg) |
| Luis Ramírez | [@luisfer-rv](https://github.com/luisfer-rv) |
| Darinka Contreras | [@darimonc](https://github.com/darimonc) |
| Francisco Espitia | [@fespitia01](https://github.com/fespitia01) |
| Miguel Orozco | [@MigueSsj](https://github.com/MigueSsj) |
