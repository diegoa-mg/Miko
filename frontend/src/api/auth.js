import api from "./axios";

export const login = async (email, password) => {
  const { data } = await api.post("/login", { 
    email, 
    password,
 });

  localStorage.setItem("token", data.token);

  const { data: usuario } = await api.get("/me");
  
  return usuario;
};

export const logout = () => {
  localStorage.removeItem("token");
};

// Solicitar recuperación de contraseña
export const solicitarRestablecimiento = async (email) => {
  const { data } = await api.post("/olvide-password", {
    email,
  });

  return data;
};

// Restablecer contraseña con el token enviado por correo
export const restablecerPassword = async (token, passwordNueva) => {
  const { data } = await api.post("/restablecer-password", {
    token,
    password_nueva: passwordNueva,
  });

  return data;
};