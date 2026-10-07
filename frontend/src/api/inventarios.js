import api from "./axios";

export const obtenerInventarios = async (sucursalId = null) => {
  const params = {};

  if (sucursalId) {
    params.sucursal_id = sucursalId;
  }

  const { data } = await api.get("/inventarios", { params });

  return data;
};