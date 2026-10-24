
import api from "./axios";

export const obtenerCategorias = async () => {
  const { data } = await api.get("/categorias");
  return data;
};
