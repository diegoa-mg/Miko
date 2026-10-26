import api from "./axios";

export const obtenerGerentes = async (incluirInactivos = false) => {
  console.log("OBTENIENDO GERENTES...");

  const { data } = await api.get("/gerentes", {
    params: {
      incluir_inactivos: incluirInactivos,
    },
  });

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
export const reactivarGerente = async (id) => {
  const { data } = await api.patch(`/gerentes/${id}/reactivar`);
  return data;
};

export const reenviarAvisoGerente = async (id) => {
  const { data } = await api.post(`/gerentes/${id}/reenviar-aviso`);
  return data;
};