
import api from "./axios";

export const obtenerVentas = async (
  sucursalId = null,
  {
    limit = 15,
    offset = 0,
    fechaInicio = null,
    fechaFin = null,
    metodoPago = null,
  } = {}
) => {
  const params = {
    limit,
    offset,
  };

  if (sucursalId != null && sucursalId !== "") {
    params.sucursal_id = sucursalId;
  }

  if (fechaInicio) {
    params.fecha_inicio = fechaInicio;
  }

  if (fechaFin) {
    params.fecha_fin = fechaFin;
  }

  if (metodoPago) {
    params.metodo_pago = metodoPago;
  }

  const { data } = await api.get("/ventas", { params });

  return Array.isArray(data) ? data : [];
};

// GET /ventas/conteo -> { total, montoTotal } de TODAS las ventas que cumplen los
// mismos filtros que obtenerVentas (sin paginar). Sirve para saber cuántas páginas
// hay y para las tarjetas de resumen.
export const contarVentas = async (
  sucursalId = null,
  { fechaInicio = null, fechaFin = null, metodoPago = null } = {}
) => {
  const params = {};

  if (sucursalId != null && sucursalId !== "") {
    params.sucursal_id = sucursalId;
  }

  if (fechaInicio) {
    params.fecha_inicio = fechaInicio;
  }

  if (fechaFin) {
    params.fecha_fin = fechaFin;
  }

  if (metodoPago) {
    params.metodo_pago = metodoPago;
  }

  const { data } = await api.get("/ventas/conteo", { params });

  return {
    total: Number(data?.total) || 0,
    montoTotal: Number(data?.monto_total) || 0,
  };
};

// GET /ventas/zona-horaria -> { zona_horaria: "America/Mexico_City" }. Las ventas se guardan
// en UTC; las pantallas de Ventas (administrador y gerente) usan esta zona para mostrar la hora
// de cada venta. Se guarda la promesa para no repetir la consulta. Si falla, devuelve null
// y las fechas se muestran en la zona del navegador.
let zonaPromise = null;
export function obtenerZonaHorariaVentas() {
  if (!zonaPromise) {
    zonaPromise = api
      .get("/ventas/zona-horaria")
      .then(({ data }) => {
        if (!data?.zona_horaria) {
          console.warn("[ventas] El endpoint no devolvió zona_horaria:", data);
        }
        return data?.zona_horaria || null;
      })
      .catch((err) => {
        console.error("[ventas] No se pudo obtener la zona horaria:", err);
        zonaPromise = null;
        return null;
      });
  }
  return zonaPromise;
}
