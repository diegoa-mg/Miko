import api from "./axios";

export async function getDashboardAdmin(fechaInicio, fechaFin, umbral) {
  const params = {};
  if (fechaInicio) params.fecha_inicio = fechaInicio;
  if (fechaFin) params.fecha_fin = fechaFin;
  if (umbral !== undefined) params.umbral_bajo_inventario = umbral;

  const { data } = await api.get("/dashboard/admin", { params });
  return data;
}

export async function getDashboardGerente(fechaInicio, fechaFin, umbral) {
  const params = {};
  if (fechaInicio) params.fecha_inicio = fechaInicio;
  if (fechaFin) params.fecha_fin = fechaFin;
  if (umbral !== undefined) params.umbral_bajo_inventario = umbral;

  const { data } = await api.get("/dashboard/gerente", { params });
  return data;
}