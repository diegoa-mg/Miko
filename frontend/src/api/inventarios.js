import api from "./axios";

export const obtenerInventarios = async (sucursalId = null) => {
  const params = {};

  if (sucursalId) {
    params.sucursal_id = sucursalId;
  }

  const { data } = await api.get("/inventarios", { params });

  return data;
};

export const obtenerInventarioMiSucursal = async () => {
  const { data } = await api.get("/inventarios/mi-sucursal");
  return data;
};

// cantidad > 0 suma existencias; cantidad < 0 las resta
export const actualizarExistencias = async (productoId, cantidad) => {
  const { data } = await api.patch(`/inventarios/mi-sucursal/${productoId}`, {
    cantidad,
  });
  return data;
};