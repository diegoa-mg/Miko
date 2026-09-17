import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
<<<<<<< HEAD
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/me")
      .then(({ data }) => setUser(data))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const login = (usuario) => setUser(usuario);
=======

    if (token) {
      setUser({ authenticated: true });
    }

    setLoading(false);
  }, []);

  const login = () => {
    const token = localStorage.getItem("token");

    if (token) {
      setUser({ authenticated: true });
    }
  };
>>>>>>> 94ac1812f9d6ba405ba93fe4684978617bd58be6

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);