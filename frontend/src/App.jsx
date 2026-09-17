
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { login as loginApi } from "./api/auth";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./routes/protectedRoute";
import RoleRoute from "./routes/roleRoute";

function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await loginApi(email, password);
      login();

      alert("Inicio de sesión correcto");
    } catch (error){
      console.error(error);
      setError("Correo electrónico o contraseña incorrectos");
    }
  };

  return(
    <div className="p-6">
      <h1 className="text-2x1 font-bold mb-4">
        {t("login.title")}
      </h1>

      <form onSubmit={handleLogin} className="flex flex-col gap-4 max-w-sm">

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded"
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded"
          required
        />

        <button
        type="submit"
        className="border p-2 rounded"
        >
          Iniciar sesión
        </button>

        {error && (
          <p className="text-red-500">
            {error}
          </p>
        )}

      </form>
    </div>
  );
}

function NotFound() {
  const { t } = useTranslation();
  return <h1 className="text-2xl font-bold p-6">{t("common.notFound")}</h1>;
}

function Dashboard() {
  return <h1 className="text-2xl font-bold p-6">Panel Admin General</h1>;
}

function MiSucursal() {
  return <h1 className="text-2xl font-bold p-6">Panel Gerente de Sede</h1>;
}

function PuntoDeVenta() {
  return <h1 className="text-2xl font-bold p-6">Punto de Venta (POS)</h1>;
}

export default function App() {
  const { t, i18n } = useTranslation();
  const cambiarIdioma = (lng) => i18n.changeLanguage(lng);

  return (
    <AuthProvider>
      <BrowserRouter>
        <div>
          <nav className="p-4 flex justify-between items-center border-b">
            <span className="font-semibold">{t("app.name")}</span>
            <div className="space-x-2">
              <button onClick={() => cambiarIdioma("es")} className="text-sm underline">
                ES
              </button>
              <button onClick={() => cambiarIdioma("en")} className="text-sm underline">
                EN
              </button>
            </div>
          </nav>

          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<RoleRoute allowedRoles={["admin_general"]} />}>
                <Route path="/admin/*" element={<Dashboard />} />
              </Route>

              <Route element={<RoleRoute allowedRoles={["admin_general", "gerente_sede"]} />}>
                <Route path="/gerente/*" element={<MiSucursal />} />
              </Route>

              <Route element={<RoleRoute allowedRoles={["admin_general", "gerente_sede", "cajero"]} />}>
                <Route path="/pos/*" element={<PuntoDeVenta />} />
              </Route>
            </Route>

            <Route path="/no-autorizado" element={<p>No tienes acceso a esta sección</p>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}





