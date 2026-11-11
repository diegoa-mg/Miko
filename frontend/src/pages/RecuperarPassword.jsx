import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { solicitarRestablecimiento } from "../api/auth";
import logoMiko from "../assets/logo_claro.png";
import logoOscuro from "../assets/logo_oscuro.png";
import { useTheme } from "../context/ThemeContext";
import { useTranslation } from "react-i18next";

export default function RecuperarPassword() {

  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setError("");
    setCargando(true);

    try {
      const respuesta = await solicitarRestablecimiento(email);
      setMensaje(t("recuperarPassword.exito"));
    } catch (err) {
    setError(
        t("recuperarPassword.error")
    );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdf6e3] text-[#4a2f38] px-4 font-sans dark:bg-[var(--dark-bg)] dark:text-[var(--dark-text)]">

      <div className="w-full max-w-md p-8 rounded-2xl bg-white/80 shadow-xl dark:bg-[var(--dark-surface)]">

        <div className="flex flex-col items-center mb-6">
          <img src={isDark ? logoOscuro : logoMiko} alt="Miko" className="h-20 mb-3" />
          <h1 className="text-2xl font-sans text-[#875d69] dark:text-rose-300">
            {t("recuperarPassword.titulo")}
            </h1>
        </div>

        <p className="text-center text-sm mb-6">
        {t("recuperarPassword.descripcion")}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div>
            <label className="block text-sm font-medium mb-2">
             {t("recuperarPassword.correo")}
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("recuperarPassword.placeholderCorreo")}
              required
              className="w-full rounded-full bg-[#f9eeb4] dark:bg-yellow-900/30 border-2 border-[#e6bdc7] text-[#8c6773] dark:text-[var(--dark-muted)] px-4 py-3 focus:outline-none focus:border-[#875d69] dark:focus:border-rose-300 dark:bg-[var(--dark-bg)] dark:border-[var(--dark-border)] dark:text-[var(--dark-text)]"
            />
          </div>

          {mensaje && (
            <div className="rounded-xl border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/40 p-3 text-sm text-green-800 dark:text-green-300">
              {mensaje}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="bg-rose-800 dark:bg-rose-700 hover:bg-rose-900 dark:hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg py-3 transition-colors"
          >
            {cargando
            ? t("recuperarPassword.enviando")
            : t("recuperarPassword.enviar")}
          </button>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-rose-400 dark:text-rose-300 hover:underline text-sm"
          >
            {t("recuperarPassword.volver")}
          </button>

        </form>
      </div>
    </div>
  );
}