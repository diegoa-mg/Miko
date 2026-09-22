import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routers import auth as auth_router
from src.routers import sucursales as sucursales_router

app = FastAPI(title="POS Multi-sede API")

"""
CORS Middleware: resuelve un problema que se genera cuando el frontend intenta llamar al backend (localhost:8000), 
el navegador considera que son orígenes distintos.
Sin el middleware, el backend funcionaría con Postman o cualquier curl, sin embargo, el navegador rechazaria
la respuesta antes de llegue al codigo de React.
"""

"""
CORS_ORIGINS viene en una variable de entorno y no hardcodeado por:
El frontend está en localhost:5173 en desarrollo, luego estará en un servidor web.
Si CORS_ORIGINS estuviera hardcodeado a localhost:5173, cuando se despliegue la app,
el login fallaría. En el .env de producción se cambia el CORS_ORIGIN
"""
origenes_permitidos = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") # .split(",") permite declarar más de un origin permitido separados por coma
app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes_permitidos,
    # Si allow_credentials=True, no puedes usar allow_origins=["*"]. El navegador lo descarta directamente porque la considera insegura
    allow_credentials=True, # Este parámetro le dice al navegador que sí permita mandar credenciales en request cross-origin
    
    # La config es permisiva: el servidor le dice al navegador exactamente que permite: de que orígines acepta request que método HTTP(GET, POST, ...), y que headers personalizados
    # Se opto por permitir todos los métodos y headers
    allow_methods=["*"], 
    allow_headers=["*"],
)

# Activa las rutas que se construyen en routers/auth.py y routers/sucursales.py
app.include_router(auth_router.router)
app.include_router(sucursales_router.router)


# Health check básico
@app.get("/")
def read_root():
    return {"status": "ok", "message": "API corriendo"}