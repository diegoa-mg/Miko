
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
