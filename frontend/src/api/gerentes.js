import api from "./axios";

export const obtenerGerentes = async () => {
  console.log("OBTENIENDO GERENTES...");
  
  const { data } = await api.get("/gerentes");
  return data;
};

export const crearGerente = async (gerente) => {
  const { data } = await api.post("/gerentes", gerente);
  return data;
};

export const actualizarGerente = async (id, gerente) => {
  const { data } = await api.put(`/gerentes/${id}`, gerente);
  return data;
};

export const eliminarGerente = async (id) => {
  const { data } = await api.delete(`/gerentes/${id}`);
  return data;
};