import api from "./axios";

// GET /categorias (admin_general y gerente_sede)
export const listarCategoriasApi = async () => {
  const { data } = await api.get("/categorias");
  return data;
};

// POST /categorias (solo admin_general)
export const crearCategoriaApi = async (nombre) => {
  const { data } = await api.post("/categorias", { nombre });
  return data;
};

// PATCH /categorias/{id} (solo admin_general)
export const editarCategoriaApi = async (id, nombre) => {
  const { data } = await api.patch(`/categorias/${id}`, { nombre });
  return data;
};

// DELETE /categorias/{id} (solo admin_general, sin productos asignados)
export const eliminarCategoriaApi = async (id) => {
  const { data } = await api.delete(`/categorias/${id}`);
  return data;
};

import api from "./axios";

export const obtenerCategorias = async () => {
  const { data } = await api.get("/categorias");
  return data;
};
