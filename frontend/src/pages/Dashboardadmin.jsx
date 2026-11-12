import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Store,
  CircleDollarSign,
  TriangleAlert,
  Users,
  LayoutDashboard,
} from "lucide-react";
import { getDashboardAdmin } from "../api/adminDashboard";
import { obtenerGerentes } from "../api/gerentes";
import { obtenerSucursales } from "../api/sucursales";

// Carga una vez un recurso del backend y expone su estado. Cada recurso del
// dashboard usa su propio hook, así que si uno falla los demás se siguen
// mostrando.
function useCarga(cargar) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    cargar()
      .then((res) => {
        if (activo) setDatos(res);
      })
      .catch((err) => {
        if (activo) setError(err);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  return { datos, cargando, error };
}

// Lista de personas (gerentes) con su sucursal.
function SeccionPersonas({
  t,
  titulo,
  personas,
  cargando,
  textoCargando,
  error,
  textoError,
  textoVacio,
  nombreSucursal,
  className = "",
}) {
  return (
    <div className={`bg-white dark:bg-[var(--dark-surface)] rounded-xl shadow dark:shadow-none dark:border dark:border-[var(--dark-border)] p-5 ${className}`}>
      <h2 className="font-sans text-lg font-semibold text-[#875d69] dark:text-rose-300 mb-3">
        {titulo}
      </h2>
      {cargando ? (
        <p className="text-gray-500 dark:text-[var(--dark-muted)] text-sm">{textoCargando}</p>
      ) : error ? (
        <p className="text-red-500 dark:text-red-400 text-sm">{textoError}</p>
      ) : personas.length === 0 ? (
        <p className="text-gray-500 dark:text-[var(--dark-muted)] text-sm">{textoVacio}</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-[var(--dark-border)]">
          {personas.map((persona) => (
            <li
              key={persona.id}
              className="py-3 flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800 dark:text-[var(--dark-text)] break-words">
                  {persona.nombre}
                </p>
                <p className="text-xs text-gray-400 dark:text-[var(--dark-muted)]">
                  {t("dashboard.id")}: {persona.id}
                </p>
                <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)] break-words">
                  {persona.email}
                </p>
              </div>
              <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)] text-right max-w-[40%] break-words">
                {nombreSucursal(persona)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DashboardAdmin() {
  const { t, i18n } = useTranslation();

  // Resumen (sucursales, ventas, alertas) — es lo crítico de la pantalla
  const { datos: data, cargando, error } = useCarga(getDashboardAdmin);

  // Gerentes: GET /gerentes devuelve solo los activos
  const {
    datos: gerentesData,
    cargando: cargandoGerentes,
    error: errorGerentes,
  } = useCarga(obtenerGerentes);

  // Solo sirve para mostrar el nombre de la sucursal. null = todavía no carga
  // o falló; en ese caso se muestra "—" en vez de afirmar "sin sucursal".
  const { datos: sucursales } = useCarga(obtenerSucursales);

  const gerentes = gerentesData ?? [];

  // ventas_total_periodo llega como Decimal (string) desde el backend para
  // no perder precisión en centavos. Number(...) lo convierte para el
  // formateador; si llegara como número ya, Number() lo deja igual.
  const formatMoney = (valor) =>
    new Intl.NumberFormat(i18n.language === "en" ? "en-US" : "es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(Number(valor));

  // Si el backend manda un mensaje (err.response.data.detail) se muestra ese
  // en vez del genérico.
  const mensajeError = (err, textoPorDefecto) =>
    err?.response?.data?.detail || textoPorDefecto;

  // La sucursal de un gerente vive en sucursales.gerente_id, no en el usuario.
  const sucursalDelGerente = (gerente) =>
    sucursales === null
      ? "—"
      : sucursales.find((s) => s.gerente_id === gerente.id)?.nombre ||
        t("dashboard.noBranch");

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#fdf6e3] dark:bg-[var(--dark-bg)] p-8">
        <div className="max-w-7xl mx-auto text-gray-500 dark:text-[var(--dark-muted)]">
          {t("common.loading")}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fdf6e3] dark:bg-[var(--dark-bg)] p-8">
        <div className="max-w-7xl mx-auto text-red-500 dark:text-red-400">
          {mensajeError(error, t("dashboard.error"))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3] dark:bg-[var(--dark-bg)] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
      <div className="flex items-center gap-4 mb-6 sm:mb-8">
        <div className="h-16 w-16 shrink-0 rounded-2xl bg-[#fae4df] dark:bg-[var(--dark-border)] flex items-center justify-center">
          <LayoutDashboard
            size={32}
            className="text-[#d06b7d] dark:text-rose-300"
          />
        </div>

        <div>
          <h1 className="font-sans text-3xl sm:text-4xl font-bold text-[#8b5e6b] dark:text-rose-300">
            {t("dashboard.title")}
          </h1>

          <p className="font-sans text-lg text-[#5f4a50] dark:text-[var(--dark-muted)] mt-1">
            {t("dashboard.descripcion")}
          </p>
        </div>
      </div>

        {/* Tarjetas resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-[var(--dark-surface)] rounded-xl shadow dark:shadow-none dark:border dark:border-[var(--dark-border)] p-5 flex items-center gap-4">
            <div className="w-10 h-10 shrink-0 rounded-full bg-pink-100 dark:bg-rose-900/40 flex items-center justify-center text-pink-500 dark:text-rose-300">
              <Store size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)]">{t("dashboard.activeBranches")}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-[var(--dark-text)]">
                {data.sucursales_activas}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-[var(--dark-surface)] rounded-xl shadow dark:shadow-none dark:border dark:border-[var(--dark-border)] p-5 flex items-center gap-4">
            <div className="w-10 h-10 shrink-0 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600 dark:text-green-400">
              <CircleDollarSign size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)] break-words">
                {t("dashboard.periodSales")}
              </p>
              <p className="text-2xl font-bold text-gray-800 dark:text-[var(--dark-text)] break-words">
                {formatMoney(data.ventas_total_periodo)}
              </p>
              {/* Un solo día: solo la fecha; si es un rango, inicio a fin */}
              <p className="text-xs text-gray-400 dark:text-[var(--dark-muted)]">
                {data.periodo_inicio === data.periodo_fin
                  ? data.periodo_inicio
                  : t("dashboard.periodRange", {
                      start: data.periodo_inicio,
                      end: data.periodo_fin,
                    })}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-[var(--dark-surface)] rounded-xl shadow dark:shadow-none dark:border dark:border-[var(--dark-border)] p-5 flex items-center gap-4">
            <div className="w-10 h-10 shrink-0 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
              <TriangleAlert size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)]">{t("dashboard.inventoryAlerts")}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-[var(--dark-text)]">
                {data.alertas_inventario.length}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-[var(--dark-surface)] rounded-xl shadow dark:shadow-none dark:border dark:border-[var(--dark-border)] p-5 flex items-center gap-4">
            <div className="w-10 h-10 shrink-0 rounded-full bg-[#f4d0d0] dark:bg-[var(--dark-border)] flex items-center justify-center text-[#875d69] dark:text-rose-300">
              <Users size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)]">{t("dashboard.registeredManagers")}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-[var(--dark-text)]">
                {cargandoGerentes || errorGerentes ? "—" : gerentes.length}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de alertas */}
          <div className="bg-white dark:bg-[var(--dark-surface)] rounded-xl shadow dark:shadow-none dark:border dark:border-[var(--dark-border)] p-5">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h2 className="font-sans text-lg font-semibold text-[#875d69] dark:text-rose-300">
                {t("dashboard.lowStockTitle")}
              </h2>
              <span className="text-xs text-gray-400 dark:text-[var(--dark-muted)] shrink-0">
                {t("dashboard.threshold")}: {data.umbral_bajo_inventario}
              </span>
            </div>
            {data.alertas_inventario.length === 0 ? (
              <p className="text-gray-500 dark:text-[var(--dark-muted)] text-sm">{t("dashboard.noAlerts")}</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-[var(--dark-border)]">
                {data.alertas_inventario.map((alerta) => (
                  <li
                    key={`${alerta.producto_id}-${alerta.sucursal_id}`}
                    className="py-3 flex items-center justify-between gap-2 flex-wrap"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 dark:text-[var(--dark-text)] break-words">
                        {alerta.producto_nombre}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)] break-words">
                        {alerta.sucursal_nombre}
                      </p>
                    </div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400 font-semibold shrink-0">
                      {t("dashboard.stock")}: {alerta.existencia}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Gerentes */}
          <SeccionPersonas
            t={t}
            titulo={t("dashboard.managersTitle")}
            personas={gerentes}
            cargando={cargandoGerentes}
            textoCargando={t("dashboard.loadingManagers")}
            error={errorGerentes}
            textoError={mensajeError(errorGerentes, t("dashboard.errorManagers"))}
            textoVacio={t("dashboard.noManagers")}
            nombreSucursal={sucursalDelGerente}
          />
        </div>
      </div>
    </div>
  );
}