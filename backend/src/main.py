from fastapi import FastAPI
from src.auth import router as auth_router

app = FastAPI(title="POS Multi-sede API")

app.include_router(auth_router)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "API corriendo"}