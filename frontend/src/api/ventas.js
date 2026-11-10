
import api from "./axios";

export const obtenerVentas = async (
  sucursalId = null,
  {
    limit = 15,
    offset = 0,
    fechaInicio = null,
    fechaFin = null,
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

  const { data } = await api.get("/ventas", { params });

  return Array.isArray(data) ? data : [];
};

// GET /ventas/conteo -> total de ventas con los mismos filtros que obtenerVentas.
// Sirve para saber cuántas páginas hay.
export const contarVentas = async (
  sucursalId = null,
  { fechaInicio = null, fechaFin = null } = {}
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

  const { data } = await api.get("/ventas/conteo", { params });

  return Number(data?.total) || 0;
};
