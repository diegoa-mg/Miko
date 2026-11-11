import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { restablecerPassword } from "../api/auth";
import logoMiko from "../assets/logo_claro.png";
import { useTranslation } from "react-i18next";

export default function RestablecerPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState(false);

  const validarPassword = () => {
  if (password.length < 8) return t("restablecerPassword.minimo");
  if (!/[A-Z]/.test(password)) return t("restablecerPassword.mayuscula");
  if (!/[a-z]/.test(password)) return t("restablecerPassword.minuscula");
  if (!/[0-9]/.test(password)) return t("restablecerPassword.numero");
  if (!/[^A-Za-z0-9\s]/.test(password))
    return t("restablecerPassword.especial");
  if (new TextEncoder().encode(password).length > 72)
    return t("restablecerPassword.limite");
  if (password !== confirmarPassword)
    return t("restablecerPassword.noCoinciden");

  return "";
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setError("");

    if (!token) {
    setError(t("restablecerPassword.enlaceInvalido"));
    return;
    }

    const validacion = validarPassword();

    if (validacion) {
      setError(validacion);
      return;
    }

    setCargando(true);

    try {
      await restablecerPassword(token, password);
        setMensaje(t("restablecerPassword.exito"));
        setExito(true);
    } catch (err) {
  setError(t("restablecerPassword.error"));
} finally {
  setCargando(false);
}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdf6e3] text-[#4a2f38] px-4 font-sans dark:bg-[var(--dark-bg)] dark:text-[var(--dark-text)]">
      <div className="w-full max-w-md p-8 rounded-2xl bg-white/80 shadow-xl dark:bg-[var(--dark-surface)]">
        <div className="flex flex-col items-center mb-6">
          <img src={logoMiko} alt="Miko" className="h-20 mb-3" />
          <h1 className="text-2xl font-sans text-[#875d69] dark:text-rose-300">
            {t("restablecerPassword.titulo")}
            </h1>
        </div>

        {mensaje && (
          <div className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-800 mb-4">
            {mensaje}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {!exito && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("restablecerPassword.nueva")}
              </label>
              <div className="relative">
                <input
                  type={mostrarPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-full bg-[#f9eeb4] border-2 border-[#e6bdc7] text-[#8c6773] pl-4 pr-12 py-3 focus:outline-none focus:border-[#875d69] dark:bg-[var(--dark-bg)] dark:border-[var(--dark-border)] dark:text-[var(--dark-text)]"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#cda4b4] hover:text-[#875d69] dark:text-[var(--dark-muted)] dark:hover:text-rose-300 transition-colors focus:outline-none"
                  title={mostrarPassword ? t("perfil.ocultarPassword") : t("perfil.verPassword")}
                  aria-label={mostrarPassword ? t("perfil.ocultarPassword") : t("perfil.verPassword")}
                >
                  <span className="material-icons text-xl">
                    {mostrarPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t("restablecerPassword.confirmar")}
              </label>
              <div className="relative">
                <input
                  type={mostrarConfirmar ? "text" : "password"}
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  required
                  className="w-full rounded-full bg-[#f9eeb4] border-2 border-[#e6bdc7] text-[#8c6773] pl-4 pr-12 py-3 focus:outline-none focus:border-[#875d69] dark:bg-[var(--dark-bg)] dark:border-[var(--dark-border)] dark:text-[var(--dark-text)]"
                />
                <button
                  type="button"
                  onClick={() => setMostrarConfirmar((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#cda4b4] hover:text-[#875d69] dark:text-[var(--dark-muted)] dark:hover:text-rose-300 transition-colors focus:outline-none"
                  title={mostrarConfirmar ? t("perfil.ocultarPassword") : t("perfil.verPassword")}
                  aria-label={mostrarConfirmar ? t("perfil.ocultarPassword") : t("perfil.verPassword")}
                >
                  <span className="material-icons text-xl">
                    {mostrarConfirmar ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500">
            {t("restablecerPassword.requisitos")}
            </p>

            <button
              type="submit"
              disabled={cargando}
              className="bg-rose-800 hover:bg-rose-900 disabled:opacity-50 text-white rounded-lg py-3 transition-colors"
            >
              {cargando
                ? t("restablecerPassword.guardando")
                : t("restablecerPassword.guardar")}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => navigate("/login")}
          className="w-full mt-4 text-rose-400 hover:underline text-sm"
        >
          {t("restablecerPassword.volver")}
        </button>
      </div>
    </div>
  );
}