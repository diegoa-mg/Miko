import api from "./axios";

export const login = async (email, password) => {
    const response = await api.post("/login", {
        email,
        password,
    });

    const token = response.data.token;

    localStorage.setItem("token", token);

    return response.data;
};

export const logout = () => {
    localStorage.removeItem("token");
};