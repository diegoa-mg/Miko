import api from "./axios";

export const obtenerVentas = async (sucursalId = null) => {
  const params = {};

  if (sucursalId) {
    params.sucursal_id = sucursalId;
  }

  const { data } = await api.get("/ventas", { params });

  return data;
};