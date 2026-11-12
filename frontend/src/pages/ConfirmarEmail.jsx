import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MailCheck, CheckCircle2, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { confirmarEmailApi } from "../api/cuenta";
import { useAuth } from "../context/AuthContext";
import logoMiko from "../assets/logo_claro.png";
import logoOscuro from "../assets/logo_oscuro.png";
import { useTheme } from "../context/ThemeContext";

export default function ConfirmarEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { user, updateUser } = useAuth();

  const token = searchParams.get("token");

  const [cargando, setCargando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [error, setError] = useState(
    !token ? t("confirmarEmail.tokenFaltante", "El enlace de confirmación no es válido.") : ""
  );

  const manejarConfirmacion = async () => {
    if (!token) return;
    try {
      setCargando(true);
      setError("");
      const usuarioActualizado = await confirmarEmailApi(token);

      // Si el usuario actual es el que acaba de confirmar, actualizamos el contexto
      if (user && user.id === usuarioActualizado.id) {
        updateUser(usuarioActualizado);
      }

      setConfirmado(true);
    } catch (err) {
      console.error("Error al confirmar correo:", err);
      const detalle =
        err.response?.data?.detail ||
        t("confirmarEmail.errorGenerico", "Ocurrió un error al confirmar tu correo.");
      setError(detalle);
    } finally {
      setCargando(false);
    }
  };

  // Opcional: auto-ejecutar si viene con token
  useEffect(() => {
    if (token) {
      manejarConfirmacion();
    }
  }, [token]);

  const irADestino = () => {
    if (user) {
      if (user.rol === "admin_general") navigate("/admin/configuracion");
      else if (user.rol === "gerente_sede") navigate("/gerente/configuracion");
      else navigate("/cajero/configuracion");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-[#fdf6e3] dark:bg-[var(--dark-bg)] p-4 text-[#4a2f38] dark:text-[var(--dark-text)]">
      {/* Decorative blobs */}
      <div className="blob w-80 h-80 bg-rose-300 top-[-5rem] left-[-5rem] opacity-70" />
      <div
        className="blob w-96 h-96 bg-amber-200 bottom-[-6rem] right-[-6rem] opacity-70"
        style={{ animationDelay: "3s" }}
      />

      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[var(--dark-surface)] rounded-3xl shadow-xl border border-[#f0dfdc] dark:border-[var(--dark-border)] overflow-hidden my-8 p-8 text-center">
        <div className="flex flex-col items-center mb-6">
          <img src={isDark ? logoOscuro : logoMiko} alt="Miko" className="h-16 mb-3" />
          <h1 className="text-2xl font-bold text-[#4a2f38] dark:text-[var(--dark-text)]">
            {t("confirmarEmail.titulo", "Verificación de Correo Electrónico")}
          </h1>
        </div>

        {cargando && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="w-12 h-12 text-rose-500 dark:text-rose-300 animate-spin mb-4" />
            <p className="text-gray-600 dark:text-[var(--dark-muted)]">
              {t("confirmarEmail.procesando", "Confirmando tu nuevo correo electrónico...")}
            </p>
          </div>
        )}

        {!cargando && confirmado && (
          <div className="flex flex-col items-center py-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-950/40 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-green-700 dark:text-green-300 mb-2">
              {t("confirmarEmail.exitoTitulo", "¡Correo confirmado con éxito!")}
            </h2>
            <p className="text-gray-600 dark:text-[var(--dark-muted)] mb-6">
              {t(
                "confirmarEmail.exitoDescripcion",
                "Tu nueva dirección de correo ha sido verificada y actualizada en tu cuenta de Miko."
              )}
            </p>
            <button
              onClick={irADestino}
              className="inline-flex items-center gap-2 px-6 py-3 bg-rose-800 dark:bg-rose-700 hover:bg-rose-900 dark:hover:bg-rose-600 text-white rounded-xl font-medium transition shadow-md"
            >
              <span>{user ? t("confirmarEmail.volverPerfil", "Volver a Configuración") : t("confirmarEmail.iniciarSesion", "Iniciar sesión")}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {!cargando && !confirmado && error && (
          <div className="flex flex-col items-center py-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-red-700 dark:text-red-300 mb-2">
              {t("confirmarEmail.errorTitulo", "No se pudo confirmar el correo")}
            </h2>
            <p className="text-gray-600 dark:text-[var(--dark-muted)] mb-6">{error}</p>
            <button
              onClick={irADestino}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 dark:bg-[var(--dark-border)] hover:bg-gray-800 dark:hover:bg-[#5a4350] text-white rounded-xl font-medium transition"
            >
              <span>{t("confirmarEmail.irInicio", "Ir a inicio")}</span>
            </button>
          </div>
        )}

        {!cargando && !confirmado && !error && !token && (
          <div className="flex flex-col items-center py-4">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/40 rounded-full flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
              <MailCheck className="w-10 h-10" />
            </div>
            <p className="text-gray-600 dark:text-[var(--dark-muted)] mb-6">
              {t("confirmarEmail.instruccion", "Por favor ingresa utilizando el enlace que enviamos a tu correo.")}
            </p>
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-rose-800 dark:bg-rose-700 hover:bg-rose-900 dark:hover:bg-rose-600 text-white rounded-xl font-medium transition"
            >
              <span>{t("confirmarEmail.irLogin", "Ir al inicio de sesión")}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}