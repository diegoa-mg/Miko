import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routers import auth as auth_router

app = FastAPI(title="POS Multi-sede API")

origenes_permitidos = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes_permitidos,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)


@app.get("/")
def read_root():
    return {"status": "ok", "message": "API corriendo"}