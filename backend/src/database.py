import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# La URL real de la base de datos se toma de una variable de entorno.
# En desarrollo local pueden usar un .env con python-dotenv, o exportarla
# directamente: export DATABASE_URL="postgresql+psycopg2://usuario:pass@localhost:5432/pos_db"
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/pos_db",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Todos los modelos (Roles, Usuarios, Sucursales, y los que agreguen sus
# compañeros: Categorias, Productos, Inventario, etc.) deben heredar de este Base
# para que Alembic pueda detectarlos.
Base = declarative_base()


def get_db():
    """Dependencia de FastAPI para obtener una sesión de base de datos por request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
