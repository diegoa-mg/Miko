import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CircleDollarSign, Receipt } from "lucide-react";
import { getDashboardCajero } from "../api/adminDashboard";

export default function DashboardCajero() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const locale = i18n.language === "en" ? "en-US" : "es-MX";

  // Los montos llegan como Decimal (string); Number(...) lo convierte al formatear.
  const formatMoney = (valor) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "MXN",
    }).format(Number(valor));

  // La fecha llega en UTC; se muestra en la zona horaria del negocio
  // que manda el backend, no en la del navegador.
  const formatFecha = (iso) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: data.zona_horaria,
    }).format(new Date(iso));

  const mensajeError = (err, textoPorDefecto) =>
    err?.response?.data?.detail || textoPorDefecto;

  useEffect(() => {
    let activo = true;
    setCargando(true);
    getDashboardCajero()
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

  const ultimasVentas = data.ultimas_ventas ?? [];

  return (
    <div className="min-h-screen bg-[#fdf6e3] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="mb-6 sm:mb-8">
          <h1 className="font-sans text-2xl sm:text-3xl font-bold text-[#875d69]">
            {t("dashboard.title")}
          </h1>
          <p className="font-sans text-gray-600 mt-1">
            {t("dashboard.descripcionCajero")}
          </p>
        </div>

        {/* Tarjetas resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
            <div className="w-10 h-10 shrink-0 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <CircleDollarSign size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500">{t("dashboard.salesToday")}</p>
              <p className="text-2xl font-bold text-gray-800 break-words">
                {formatMoney(data.ventas_total_hoy)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
            <div className="w-10 h-10 shrink-0 rounded-full bg-[#f4d0d0] flex items-center justify-center text-[#875d69]">
              <Receipt size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500">
                {t("dashboard.salesCountToday")}
              </p>
              <p className="text-2xl font-bold text-gray-800">
                {data.numero_ventas_hoy}
              </p>
            </div>
          </div>
        </div>

        {/* Últimas ventas */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-sans text-lg font-semibold text-[#875d69] mb-3">
            {t("dashboard.latestSales")}
          </h2>
          {ultimasVentas.length === 0 ? (
            <p className="text-gray-500 text-sm">{t("dashboard.noSales")}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {ultimasVentas.map((venta) => (
                <li
                  key={venta.id}
                  className="py-3 flex items-center justify-between gap-2 flex-wrap"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800">
                      {t("ventas.venta")} #{venta.id}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFecha(venta.fecha)} ·{" "}
                      {t(`ventas.metodosPago.${venta.metodo_pago}`, venta.metodo_pago)}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-800 shrink-0">
                    {formatMoney(venta.total)}
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