import api from "./axios"; 

/**
 * Obtiene el resumen del dashboard de Administrador General.
 * @param {string} [fechaInicio] - formato YYYY-MM-DD
 * @param {string} [fechaFin] - formato YYYY-MM-DD
 */
export async function getDashboardAdmin(fechaInicio, fechaFin) {
  const params = {};
  if (fechaInicio) params.fecha_inicio = fechaInicio;
  if (fechaFin) params.fecha_fin = fechaFin;

  const { data } = await api.get("/admin/dashboard", { params });
  return data;
}