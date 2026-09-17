import api from "./axios";

export const login = async (email, password) => {
    const formData = new URLSearchParams();

    formData.append("username", email);
    formData.append("password", password);
    

    const response = await api.post("/login", formData, {
        Headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    const token = response.data.access_token;

    localStorage.setItem("token", token);

    return response.data;
};

export const logout = () => {
    localStorage.removeItem("token");
};