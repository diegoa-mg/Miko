
import api from "./axios";

// Productos de la sucursal del gerente autenticado
export const obtenerProductos = async ({
  buscar,
  categoria_id,
  incluir_inactivos = false,
} = {}) => {
  const params = { incluir_inactivos };

  if (buscar) params.buscar = buscar;
  if (categoria_id) params.categoria_id = categoria_id;

  const { data } = await api.get("/productos", { params });
  return data;
};

export const obtenerProducto = async (id) => {
  const { data } = await api.get(`/productos/${id}`);
  return data;
};

export const crearProducto = async (producto) => {
  const { data } = await api.post("/productos", producto);
  return data;
};

// El backend de productos utiliza PATCH, no PUT
export const actualizarProducto = async (id, producto) => {
  const { data } = await api.patch(`/productos/${id}`, producto);
  return data;
};

// El backend realiza una desactivación lógica
export const eliminarProducto = async (id) => {
  const { data } = await api.delete(`/productos/${id}`);
  return data;
};

export const reactivarProducto = async (id) => {
  const { data } = await api.patch(`/productos/${id}/reactivar`);
  return data;
};

// Categorías: el gerente tiene permiso para consultarlas
export const obtenerCategorias = async () => {
  const { data } = await api.get("/categorias");
  return data;
};
