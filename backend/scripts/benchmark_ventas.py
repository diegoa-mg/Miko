"""
Script para medir el rendimiento de las consultas GET /ventas y GET /ventas/mis-ventas.
Mide el tiempo de respuesta (promedio, min, max) y el número exacto de queries SQL ejecutadas.
"""
import os
import sys
import time
from datetime import date
from decimal import Decimal

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from sqlalchemy import event
from src.database import SessionLocal, engine
from src.models import Usuario, Rol
from src.routers.ventas import listar_ventas, listar_mis_ventas


class QueryCounter:
    def __init__(self):
        self.count = 0

    def __enter__(self):
        self.count = 0
        event.listen(engine, "before_cursor_execute", self._callback)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        event.remove(engine, "before_cursor_execute", self._callback)

    def _callback(self, conn, cursor, statement, parameters, context, executemany):
        self.count += 1


def run_benchmark(n_iterations: int = 15):
    db = SessionLocal()
    try:
        admin = db.query(Usuario).join(Rol).filter(Rol.nombre == "admin_general").first()
        cajero = db.query(Usuario).join(Rol).filter(Rol.nombre == "cajero", Usuario.activo == True).first()

        if not admin or not cajero:
            print("Error: Se requieren usuarios admin y cajero en la BD.")
            return

        print("=" * 70)
        print("  BENCHMARK: CONSULTAS DE VENTAS")
        print(f"  Iteraciones por prueba: {n_iterations}")
        print("=" * 70)

        casos = [
            (
                "GET /ventas (limit=100)",
                lambda s: listar_ventas(limit=100, db=s, usuario_actual=admin),
            ),
            (
                "GET /ventas (limit=100, filtro fecha)",
                lambda s: listar_ventas(
                    fecha_inicio=date(2026, 10, 1),
                    fecha_fin=date(2026, 10, 28),
                    limit=100,
                    db=s,
                    usuario_actual=admin,
                ),
            ),
            (
                "GET /ventas/mis-ventas (limit=100)",
                lambda s: listar_mis_ventas(limit=100, db=s, usuario_actual=cajero),
            ),
            (
                "GET /ventas/mis-ventas (limit=100, filtro fecha)",
                lambda s: listar_mis_ventas(
                    fecha_inicio=date(2026, 10, 1),
                    fecha_fin=date(2026, 10, 28),
                    limit=100,
                    db=s,
                    usuario_actual=cajero,
                ),
            ),
        ]

        resultados = []

        for nombre_caso, funcion_caso in casos:
            # Calentamiento (warm-up)
            _ = funcion_caso(db)

            # Medición de queries SQL en una ejecución limpia
            with QueryCounter() as qc:
                _ = funcion_caso(db)
            queries_count = qc.count

            # Medición de tiempos
            tiempos = []
            for _ in range(n_iterations):
                t0 = time.perf_counter()
                res = funcion_caso(db)
                t1 = time.perf_counter()
                tiempos.append((t1 - t0) * 1000)  # en ms

            promedio = sum(tiempos) / len(tiempos)
            t_min = min(tiempos)
            t_max = max(tiempos)
            items_retornados = len(res)

            print(f"\nCaso: {nombre_caso}")
            print(f"  Items retornados: {items_retornados}")
            print(f"  Queries SQL:      {queries_count}")
            print(f"  Tiempo promedio:  {promedio:.2f} ms (min: {t_min:.2f} ms, max: {t_max:.2f} ms)")

            resultados.append({
                "caso": nombre_caso,
                "items": items_retornados,
                "queries": queries_count,
                "promedio_ms": round(promedio, 2),
                "min_ms": round(t_min, 2),
                "max_ms": round(t_max, 2),
            })

        print("\n" + "=" * 70)
        return resultados

    finally:
        db.close()


if __name__ == "__main__":
    run_benchmark()
