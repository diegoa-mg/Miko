import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShieldCheck, FileText, CheckCircle2, AlertTriangle, ArrowRight, Download } from "lucide-react";
import api from "../api/axios";
import logoMiko from "../assets/logo_claro.png";

export default function AvisoPrivacidad() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const token = searchParams.get("token");

  const [cargando, setCargando] = useState(false);
  const [aceptado, setAceptado] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  const [error, setError] = useState(
    !token ? t("avisoPrivacidad.enlaceInvalido", "El enlace no es válido.") : ""
  );

  const pdfUrl = `${api.defaults.baseURL || "http://localhost:8000"}/aviso-privacidad/pdf`;

  const manejarAceptar = async () => {
    if (!token) return;
    try {
      setCargando(true);
      setError("");

      const response = await api.post("/aviso-privacidad/aceptar", { token });
      setMensajeExito(
        response.data?.message ||
          t("avisoPrivacidad.exitoMensaje", "Aviso de privacidad aceptado. Ya puedes iniciar sesión.")
      );
      setAceptado(true);
    } catch (err) {
      console.error("Error al aceptar aviso de privacidad:", err);
      const detalle =
        err.response?.data?.detail ||
        t("avisoPrivacidad.errorGenerico", "Ocurrió un error al procesar tu solicitud.");
      setError(detalle);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-[#fdf6e3] p-4">
      {/* Decorative blobs */}
      <div className="blob w-80 h-80 bg-rose-300 top-[-5rem] left-[-5rem] opacity-70" />
      <div
        className="blob w-96 h-96 bg-amber-200 bottom-[-6rem] right-[-6rem] opacity-70"
        style={{ animationDelay: "3s" }}
      />

      <div className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-[#f0dfdc] overflow-hidden my-8">
        {/* Header */}
        <div className="bg-[#fffaf2] p-6 border-b border-[#eee1dd] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoMiko} alt="Miko" className="h-10" />
            <div>
              <h1 className="font-sans text-xl font-bold text-[#875d69]">
                {t("avisoPrivacidad.titulo", "Aviso de Privacidad")}
              </h1>
              <p className="font-sans text-xs text-gray-500">
                {t("avisoPrivacidad.subtitulo", "Miko Panaderías - Sistema POS")}
              </p>
            </div>
          </div>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-semibold text-[#875d69] bg-[#f9e5e4] hover:bg-[#f4d0d0] px-4 py-2 rounded-full transition-colors"
          >
            <Download size={15} />
            {t("avisoPrivacidad.descargarPdf", "Descargar PDF oficial")}
          </a>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6">
          {aceptado ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl font-bold text-[#875d69]">
                {t("avisoPrivacidad.exitoTitulo", "¡Gracias por aceptar!")}
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">{mensajeExito}</p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="inline-flex items-center gap-2 bg-rose-800 hover:bg-rose-900 text-white font-medium px-6 py-3 rounded-xl transition-colors shadow-sm"
                >
                  {t("avisoPrivacidad.irALogin", "Ir a iniciar sesión")}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ) : !token || (error && !cargando && !mensajeExito && error.includes("venció") || error.includes("no es válido")) ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={36} />
              </div>
              <h2 className="text-xl font-bold text-[#875d69]">
                {t("avisoPrivacidad.errorTitulo", "Enlace no disponible")}
              </h2>
              <p className="text-red-500 max-w-md mx-auto">{error}</p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-6 py-2.5 rounded-xl transition-colors"
                >
                  {t("avisoPrivacidad.volverAlLogin", "Volver al inicio de sesión")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-[#fffaf2] border border-[#ead8d8] rounded-2xl p-5 space-y-4 text-sm text-gray-700 leading-relaxed max-h-80 overflow-y-auto">
                <div className="flex items-center gap-2 text-[#875d69] font-bold text-base">
                  <FileText size={18} />
                  <span>{t("avisoPrivacidad.resumenTitulo", "Resumen del tratamiento de datos personales")}</span>
                </div>

                <p>
                  {t(
                    "avisoPrivacidad.introduccion",
                    "Bienvenido a Miko Panaderías. Para nosotros la protección de tu información personal es fundamental. Antes de hacer uso del sistema punto de venta, te informamos sobre el tratamiento de tus datos:"
                  )}
                </p>

                <div className="space-y-3">
                  <div>
                    <strong className="text-[#875d69]">
                      {t("avisoPrivacidad.datosTratadosTitulo", "• Datos que tratamos: ")}
                    </strong>
                    <span>
                      {t(
                        "avisoPrivacidad.datosTratados",
                        "Nombre completo, correo electrónico, contraseña (almacenada cifrada con hash seguro), rol en el sistema, sucursal asignada, fotografía de perfil opcional y registro de operaciones/ventas."
                      )}
                    </span>
                  </div>

                  <div>
                    <strong className="text-[#875d69]">
                      {t("avisoPrivacidad.finalidadesTitulo", "• Finalidades: ")}
                    </strong>
                    <span>
                      {t(
                        "avisoPrivacidad.finalidades",
                        "Creación y administración de tu cuenta, autenticación y seguridad, control de accesos según roles y sucursales, control de operaciones de venta e inventario, y auditoría interna."
                      )}
                    </span>
                  </div>

                  <div>
                    <strong className="text-[#875d69]">
                      {t("avisoPrivacidad.derechosTitulo", "• Derechos ARCO: ")}
                    </strong>
                    <span>
                      {t(
                        "avisoPrivacidad.derechos",
                        "Puedes ejercer tus derechos de Acceso, Rectificación, Cancelación y Oposición escribiendo a admin@miko.com."
                      )}
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-xs text-gray-500 border-t border-[#eee1dd]">
                  {t(
                    "avisoPrivacidad.notaVigencia",
                    "Al hacer clic en 'Acepto el aviso de privacidad', confirmas que has leído y aceptas los términos estipulados en nuestro aviso de privacidad."
                  )}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#875d69] hover:underline flex items-center gap-1"
                >
                  <FileText size={14} />
                  {t("avisoPrivacidad.verDocumentoCompleto", "Ver aviso completo en PDF")}
                </a>

                <button
                  type="button"
                  onClick={manejarAceptar}
                  disabled={cargando}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-800 hover:bg-rose-900 disabled:opacity-50 text-white font-medium px-8 py-3 rounded-xl transition-colors shadow-sm"
                >
                  <ShieldCheck size={18} />
                  {cargando
                    ? t("avisoPrivacidad.procesando", "Procesando...")
                    : t("avisoPrivacidad.botonAceptar", "Acepto el aviso de privacidad")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
