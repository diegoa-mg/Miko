import api from "./axios";

export const obtenerCajeros = async (sucursalId = null) => {
  const params = {};
  if (sucursalId) {
    params.sucursal_id = sucursalId;
  }
  const { data } = await api.get("/cajeros", { params });
  return data;
};

export const crearCajero = async (cajero) => {
  const { data } = await api.post("/cajeros", cajero);
  return data;
};

export const actualizarCajero = async (id, cajero) => {
  const { data } = await api.put(`/cajeros/${id}`, cajero);
  return data;
};

export const eliminarCajero = async (id) => {
  const { data } = await api.delete(`/cajeros/${id}`);
  return data;
};
