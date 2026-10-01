import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Store, CircleDollarSign, TriangleAlert, Users } from "lucide-react";
import { getDashboardAdmin } from "../api/adminDashboard";
import { obtenerGerentes } from "../api/gerentes";

export default function DashboardAdmin() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [gerentes, setGerentes] = useState([]);
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
    Promise.all([getDashboardAdmin(), obtenerGerentes()])
      .then(([dashboardRes, gerentesRes]) => {
        if (activo) {
          setData(dashboardRes);
          setGerentes(gerentesRes);
        }
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
          {t("dashboard.error")}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-sans text-3xl font-bold text-[#875d69]">
              {t("dashboard.title")}
            </h1>
            <p className="font-sans text-gray-600 mt-1">
              {t("dashboard.descripcion")}
            </p>
          </div>
        </div>

        {/* Tarjetas resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-500">
              <Store size={20} />
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
              <CircleDollarSign size={20} />
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
              <TriangleAlert size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("dashboard.inventoryAlerts")}</p>
              <p className="text-2xl font-bold text-gray-800">
                {data.alertas_inventario.length}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#f4d0d0] flex items-center justify-center text-[#875d69]">
              <Users size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("dashboard.registeredManagers")}</p>
              <p className="text-2xl font-bold text-gray-800">
                {gerentes.length}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de alertas */}
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-sans text-lg font-semibold text-[#875d69]">
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

          {/* Sección de Gerentes */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-sans text-lg font-semibold text-[#875d69] mb-3">
              {t("dashboard.managersTitle")}
            </h2>
            {gerentes.length === 0 ? (
              <p className="text-gray-500 text-sm">{t("dashboard.noManagers")}</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {gerentes.map((gerente) => (
                  <li
                    key={gerente.id}
                    className="py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{gerente.nombre}</p>
                      <p className="text-sm text-gray-500">{gerente.email}</p>
                    </div>
                    <p className="text-sm text-gray-500">
                      {gerente.sucursal_nombre || t("dashboard.noBranch")}
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