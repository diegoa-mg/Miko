import api from "./axios";

// 1. Modificar nombre o correo (PATCH /cuenta)
export const actualizarPerfilApi = async (datos) => {
  const { data } = await api.patch("/cuenta", datos);
  return data;
};

// 2. Modificar contraseña (PUT /cuenta/password)
export const cambiarPasswordApi = async (password_actual, password_nueva) => {
  const { data } = await api.put("/cuenta/password", {
    password_actual,
    password_nueva,
  });
  return data;
};

// 3. Subir foto a Supabase vía backend (PUT /cuenta/foto)
export const subirFotoPerfilApi = async (archivo) => {
  const formData = new FormData();
  formData.append("foto", archivo); // Debe llamarse "foto" como en FastAPI

  const { data } = await api.put("/cuenta/foto", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};