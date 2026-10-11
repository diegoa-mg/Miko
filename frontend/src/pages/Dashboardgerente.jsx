import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CircleDollarSign, TriangleAlert } from "lucide-react";
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
      <div className="min-h-screen bg-[#fdf6e3] p-8">
        <div className="max-w-7xl mx-auto text-gray-500">
          {t("common.loading")}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fdf6e3] p-8">
        <div className="max-w-7xl mx-auto text-red-500">
          {mensajeError(error, t("dashboard.error"))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="font-sans text-2xl sm:text-3xl font-bold text-[#875d69]">
              {t("dashboard.title")}
            </h1>
            <p className="font-sans text-gray-600 mt-1">
              {t("dashboard.descripcionGerente")}
            </p>
          </div>
        </div>

        {/* Tarjetas resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
            <div className="w-10 h-10 shrink-0 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <CircleDollarSign size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500 break-words">
                {t("dashboard.periodSales")} (
                {t("dashboard.periodRange", {
                  start: data.periodo_inicio,
                  end: data.periodo_fin,
                })}
                )
              </p>
              <p className="text-2xl font-bold text-gray-800 break-words">
                {formatMoney(data.ventas_total_periodo)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
            <div className="w-10 h-10 shrink-0 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
              <TriangleAlert size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500">{t("dashboard.inventoryAlerts")}</p>
              <p className="text-2xl font-bold text-gray-800">
                {data.alertas_inventario.length}
              </p>
            </div>
          </div>
        </div>

        {/* Lista de alertas (solo de su sucursal) */}
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <h2 className="font-sans text-lg font-semibold text-[#875d69]">
              {t("dashboard.lowStockTitle")}
            </h2>
            <span className="text-xs text-gray-400 shrink-0">
              {t("dashboard.threshold")}: {data.umbral_bajo_inventario}
            </span>
          </div>
          {data.alertas_inventario.length === 0 ? (
            <p className="text-gray-500 text-sm">{t("dashboard.noAlerts")}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.alertas_inventario.map((alerta) => (
                <li
                  key={`${alerta.producto_id}-${alerta.sucursal_id}`}
                  className="py-3 flex items-center justify-between gap-2 flex-wrap"
                >
                  <p className="font-medium text-gray-800 break-words min-w-0">
                    {alerta.producto_nombre}
                  </p>
                  <p className="text-sm text-yellow-700 font-semibold shrink-0">
                    {t("dashboard.stock")}: {alerta.existencia}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}