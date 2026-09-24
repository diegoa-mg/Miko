import api from "./axios";

export const obtenerSucursales = async () => {
  const { data } = await api.get("/sucursales");
  return data;
};

export const crearSucursal = async (sucursal) => {
  const { data } = await api.post("/sucursales", sucursal);
  return data;
};

export const actualizarSucursal = async (id, sucursal) => {
  const { data } = await api.put(`/sucursales/${id}`, sucursal);
  return data;
};

export const eliminarSucursal = async (id) => {
  const { data } = await api.delete(`/sucursales/${id}`);
  return data;
};

