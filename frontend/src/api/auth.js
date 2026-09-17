import api from "./axios";

export const login = async (email, password) => {
  const { data } = await api.post("/login", { email, password });
  localStorage.setItem("token", data.token);

  const { data: usuario } = await api.get("/me");
  return usuario;
};

export const logout = () => {
  localStorage.removeItem("token");
};