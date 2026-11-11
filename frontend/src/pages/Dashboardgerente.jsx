import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CircleDollarSign,
  TriangleAlert,
  Users,
  Store,
  MapPin,
  Phone,
  Info,
} from "lucide-react";
import { getDashboardGerente } from "../api/adminDashboard";

export default function DashboardGerente() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // ventas_total_periodo llega como Decimal (string) desde el backend para
  // no perder precisión en centavos; Number(...) lo convierte al formatear.
  const formatMoney = (valor) =>
    new Intl.NumberFormat(i18n.language === "en" ? "en-US" : "es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(Number(valor));

  // Si el backend manda un mensaje (por ejemplo el 404 "Este gerente no
  // tiene una sucursal asignada"), se muestra ese en vez del genérico.
  const mensajeError = (err, textoPorDefecto) =>
    err?.response?.data?.detail || textoPorDefecto;

  useEffect(() => {
    let activo = true;
    setCargando(true);
    getDashboardGerente()
      .then((res) => {
        if (activo) setData(res);
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

  const cajeros = data.cajeros ?? [];
  const sucursal = data.sucursal;
  const sucursalActiva = sucursal?.estado === "activa";

  return (
    <div className="min-h-screen bg-[#fdf6e3] dark:bg-[var(--dark-bg)] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="font-sans text-2xl sm:text-3xl font-bold text-[#875d69] dark:text-rose-300">
              {t("dashboard.title")}
            </h1>
            <p className="font-sans text-gray-600 dark:text-[var(--dark-muted)] mt-1">
              {t("dashboard.descripcionGerente")}
            </p>
          </div>
        </div>

        {/* Información de su sucursal */}
        {sucursal && (
          <div className="bg-white dark:bg-[var(--dark-surface)] rounded-xl shadow dark:shadow-none dark:border dark:border-[var(--dark-border)] p-5 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 shrink-0 rounded-full bg-pink-100 dark:bg-rose-900/40 flex items-center justify-center text-pink-500 dark:text-rose-300">
                <Store size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)]">
                  {t("dashboard.branchInfoTitle")}
                </p>
                <h2 className="font-sans text-xl font-semibold text-[#875d69] dark:text-rose-300 break-words">
                  {sucursal.nombre}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-start gap-2 min-w-0">
                <MapPin size={18} className="mt-0.5 shrink-0 text-[#875d69] dark:text-rose-300" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 dark:text-[var(--dark-muted)]">
                    {t("dashboard.branchAddress")}
                  </p>
                  <p className="text-gray-800 dark:text-[var(--dark-text)] break-words">
                    {sucursal.direccion}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 min-w-0">
                <Phone size={18} className="mt-0.5 shrink-0 text-[#875d69] dark:text-rose-300" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 dark:text-[var(--dark-muted)]">
                    {t("dashboard.branchPhone")}
                  </p>
                  <p className="text-gray-800 dark:text-[var(--dark-text)] break-words">
                    {sucursal.telefono || t("dashboard.branchNoPhone")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 min-w-0">
                <Info size={18} className="mt-0.5 shrink-0 text-[#875d69] dark:text-rose-300" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 dark:text-[var(--dark-muted)]">
                    {t("dashboard.branchStatus")}
                  </p>
                  <span
                    className={`inline-block mt-0.5 text-xs font-medium px-3 py-1 rounded-full ${
                      sucursalActiva
                        ? "text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40"
                        : "text-gray-600 dark:text-[var(--dark-muted)] bg-gray-200 dark:bg-[var(--dark-border)]"
                    }`}
                  >
                    {sucursalActiva
                      ? t("dashboard.branchStatusActive")
                      : t("dashboard.branchStatusInactive")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tarjetas resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
              <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)]">{t("dashboard.activeCashiers")}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-[var(--dark-text)]">{cajeros.length}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de alertas (solo de su sucursal) */}
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
                    <p className="font-medium text-gray-800 dark:text-[var(--dark-text)] break-words min-w-0">
                      {alerta.producto_nombre}
                    </p>
                    {Number(alerta.existencia) === 0 ? (
                      <p className="text-sm text-red-600 dark:text-red-400 font-semibold shrink-0">
                        {t("dashboard.soldOut")}
                      </p>
                    ) : (
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 font-semibold shrink-0">
                        {t("dashboard.stock")}: {alerta.existencia}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Cajeros de su sucursal */}
          <div className="bg-white dark:bg-[var(--dark-surface)] rounded-xl shadow dark:shadow-none dark:border dark:border-[var(--dark-border)] p-5">
            <h2 className="font-sans text-lg font-semibold text-[#875d69] dark:text-rose-300 mb-3">
              {t("dashboard.cashiersTitle")}
            </h2>
            {cajeros.length === 0 ? (
              <p className="text-gray-500 dark:text-[var(--dark-muted)] text-sm">{t("dashboard.noCashiers")}</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-[var(--dark-border)] max-h-80 overflow-y-auto">
                {cajeros.map((cajero) => (
                  <li key={cajero.id} className="py-3">
                    <p className="font-medium text-gray-800 dark:text-[var(--dark-text)] break-words">
                      {cajero.nombre}
                    </p>
                    <p
                      className="text-xs text-gray-400 dark:text-[var(--dark-muted)]"
                      title={t("dashboard.id")}
                    >
                      # {cajero.id}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)] break-words">
                      ✉ {cajero.email}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}