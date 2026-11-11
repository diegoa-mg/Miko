
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
