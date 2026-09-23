import { Routes, Route, useNavigate ,Navigate} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { login as loginApi } from "./api/auth";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./routes/protectedRoute";
import RoleRoute from "./routes/roleRoute";
import logoMiko from "./assets/logo_claro.png";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const usuario = await loginApi(email, password);
      login(usuario);

      if (usuario.rol === "admin_general") {
        navigate("/admin");
      } else if (usuario.rol === "gerente_sede") {
        navigate("/gerente");
      } else {
        navigate("/pos");
      }
    } catch (error) {
      console.error(error);
      setError("Correo electrónico o contraseña incorrectos");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-[#fdf6e3]">
      <div className="blob w-80 h-80 bg-rose-300 top-[-5rem] left-[-5rem]" />
      <div className="blob w-96 h-96 bg-amber-200 bottom-[-6rem] right-[-6rem]" style={{ animationDelay: "3s" }} />
      <div className="blob w-64 h-64 bg-rose-200 top-1/3 right-[10%]" style={{ animationDelay: "7s" }} />
      <div className="blob w-56 h-56 bg-amber-100 bottom-1/4 left-[8%]" style={{ animationDelay: "10s" }} />

      <div className="shadow-sm p-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-500">
          <img src={logoMiko} alt="Miko" className="h-19 mb-4" />
          <span className="font-logo font-light text-rose-400">
            PUNTO DE VENTA
          </span>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Usuario</label>
            <div className="relative">
              <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2  mt-5 text-[#cda4b4]">
                person
              </span>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=""
              required
              className="w-full rounded-full bg-[#f9eeb4] border-2 border-[#e6bdc7] text-[#8c6773] px-10 py-2 focus:outline-none focus:border-[#875d69]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <div className="relative">
              <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2  mt-5 text-[#cda4b4]">
                lock
              </span>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-full bg-[#f9eeb4] border-2 border-[#e6bdc7] text-[#8c6773] px-10 py-2 focus:outline-none focus:border-[#875d69]"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              Recordarme
            </label>
            <a href="#" className="text-rose-400 hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            className="bg-rose-800 hover:bg-rose-900 text-white rounded-lg py-2 mt-2 transition-colors"
          >
            Iniciar sesión
          </button>
        </form>
      </div>
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
      <div>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
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
    </AuthProvider>
  );
}