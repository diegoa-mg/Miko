import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Configuracion() {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const cambiarIdioma = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("idioma", lng);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="p-6 max-w-xl">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800">Configuración</h2>
        <p className="text-xs text-gray-500 mb-4">
          Preferencias generales del sistema
        </p>

        {/* Idioma — funcional */}
        <div className="flex items-center justify-between py-4 border-t">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center">
              <span className="material-icons text-rose-500 text-lg">
                language
              </span>
            </div>
            <div>
              <p className="font-medium text-sm text-gray-800">Idioma</p>
              <p className="text-xs text-gray-500">
                Cambia el idioma de la interfaz
              </p>
            </div>
          </div>

          <div className="flex bg-gray-100 rounded-full p-1 gap-1">
            <button
              onClick={() => cambiarIdioma("es")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                i18n.language === "es"
                  ? "bg-rose-800 text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Español
            </button>
            <button
              onClick={() => cambiarIdioma("en")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                i18n.language === "en"
                  ? "bg-rose-800 text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Notificaciones — solo visual, deshabilitado */}
        <div className="flex items-center justify-between py-4 border-t opacity-40 pointer-events-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <span className="material-icons text-gray-400 text-lg">
                notifications
              </span>
            </div>
            <div>
              <p className="font-medium text-sm text-gray-800">Notificaciones</p>
              <p className="text-xs text-gray-500">Próximamente</p>
            </div>
          </div>
          <div className="w-10 h-5 rounded-full bg-gray-200 border" />
        </div>

        {/* Seguridad — solo visual, deshabilitado */}
        <div className="flex items-center justify-between py-4 border-t opacity-40 pointer-events-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <span className="material-icons text-gray-400 text-lg">
                lock
              </span>
            </div>
            <div>
              <p className="font-medium text-sm text-gray-800">Seguridad</p>
              <p className="text-xs text-gray-500">Próximamente</p>
            </div>
          </div>
          <span className="material-icons text-gray-400 text-lg">
            chevron_right
          </span>
        </div>

        {/* Cerrar sesión — funcional */}
        <div className="pt-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            <span className="material-icons text-lg">logout</span>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}