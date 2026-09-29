// Va en: frontend/src/pages/DashboardAdmin.jsx (o Dashboardadmin.jsx, según cómo lo tengas nombrado)
// Debe coincidir EXACTAMENTE con el nombre de archivo que uses en el import de App.jsx

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDashboardAdmin } from "../api/adminDashboard";

export default function DashboardAdmin() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const formatMoney = (valor) =>
    new Intl.NumberFormat(i18n.language === "en" ? "en-US" : "es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(valor);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    getDashboardAdmin()
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
    return <div className="p-6 text-gray-500">{t("common.loading")}</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{t("dashboard.error")}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">
        {t("dashboard.title")}
      </h1>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-500">
            🏬
          </div>
          <div>
            <p className="text-sm text-gray-500">{t("dashboard.activeBranches")}</p>
            <p className="text-2xl font-bold text-gray-800">
              {data.sucursales_activas}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            💰
          </div>
          <div>
            <p className="text-sm text-gray-500">
              {t("dashboard.periodSales")} (
              {t("dashboard.periodRange", {
                start: data.periodo_inicio,
                end: data.periodo_fin,
              })}
              )
            </p>
            <p className="text-2xl font-bold text-gray-800">
              {formatMoney(data.ventas_total_periodo)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
            ⚠️
          </div>
          <div>
            <p className="text-sm text-gray-500">{t("dashboard.inventoryAlerts")}</p>
            <p className="text-2xl font-bold text-gray-800">
              {data.alertas_inventario.length}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de alertas */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">
            {t("dashboard.lowStockTitle")}
          </h2>
          <span className="text-xs text-gray-400">
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
                className="py-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    {alerta.producto_nombre}
                  </p>
                  <p className="text-sm text-gray-500">{alerta.sucursal_nombre}</p>
                </div>
                <p className="text-sm text-yellow-700 font-semibold">
                  {t("dashboard.stock")}: {alerta.existencia}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}