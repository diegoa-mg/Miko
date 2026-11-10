import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CircleDollarSign, Download, Eye, Printer, Receipt } from "lucide-react";
import {
  abrirTicketPdf,
  descargarTicketPdf,
  obtenerMisVentas,
  obtenerZonaHoraria,
} from "../api/ventasCajero";
import TicketVentaModal from "../components/TicketVentaModal";
import {
  crearFormatoMoneda,
  fechaHoy,
  formatearFechaNegocio,
  restarDias,
} from "../api/formatoVentas";

const POR_PAGINA = 25;

export default function MisVentasCajero() {
  const { t, i18n } = useTranslation();
  const money = useMemo(() => crearFormatoMoneda(i18n.language), [i18n.language]);

  const [zona, setZona] = useState(undefined); // undefined = aún no se sabe
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [visibles, setVisibles] = useState(POR_PAGINA);
  const [detalleId, setDetalleId] = useState(null);
  const [pdfOcupado, setPdfOcupado] = useState(null); // id de la venta en proceso
  const [errorPdf, setErrorPdf] = useState("");
  const [intento, setIntento] = useState(0); // para "Reintentar"

  // Al entrar: conocer la zona horaria del negocio y dejar el filtro en "hoy"
  useEffect(() => {
    obtenerZonaHoraria().then((z) => {
      const hoy = fechaHoy(z);
      setZona(z);
      setDesde(hoy);
      setHasta(hoy);
    });
  }, []);

  const rangoInvalido = Boolean(desde && hasta && desde > hasta);

  // Consulta al cambiar el rango de fechas
  useEffect(() => {
    if (zona === undefined) return;
    if (rangoInvalido) {
      setVentas([]);
      setCargando(false);
      setError("");
      return;
    }
    let activo = true;
    setCargando(true);
    setError("");
    setVisibles(POR_PAGINA);
    obtenerMisVentas({ fecha_inicio: desde || undefined, fecha_fin: hasta || undefined })
      .then((datos) => activo && setVentas(datos))
      .catch((err) => {
        if (!activo) return;
        const detalle = err?.response?.data?.detail;
        setError(typeof detalle === "string" ? detalle : t("misVentas.errorCarga"));
      })
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [zona, desde, hasta, rangoInvalido, intento, t]);

  const aplicarRango = (dias) => {
    const hoy = fechaHoy(zona);
    setDesde(restarDias(hoy, dias));
    setHasta(hoy);
  };

  // Suma en centavos para evitar errores de redondeo
  const totalPeriodo =
    ventas.reduce((acc, v) => acc + Math.round(Number(v.total) * 100), 0) / 100;

  const ejecutarPdf = async (id, accion) => {
    setPdfOcupado(id);
    setErrorPdf("");
    try {
      await accion(id);
    } catch {
      setErrorPdf(t("ticketVenta.errorPdf"));
    } finally {
      setPdfOcupado(null);
    }
  };

  const inputFecha =
    "rounded-full bg-white border-2 border-[#e6bdc7] text-[#8c6773] px-4 py-2 focus:outline-none focus:border-[#875d69]";
  const botonRango =
    "rounded-full border-2 border-[#e6bdc7] px-4 py-2 text-sm font-medium text-[#875d69] hover:bg-[#f4d0d0] transition-colors";

  return (
    <div className="min-h-screen bg-[#fdf6e3] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-sans text-2xl sm:text-3xl font-bold text-[#875d69]">
            {t("misVentas.titulo")}
          </h1>
          <p className="font-sans text-gray-600 mt-1">{t("misVentas.descripcion")}</p>
        </div>

        {/* Filtro por rango de fechas */}
        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="mv-desde" className="mb-1 block text-sm font-medium text-gray-700">
                {t("misVentas.desde")}
              </label>
              <input
                id="mv-desde"
                type="date"
                value={desde}
                max={hasta || undefined}
                onChange={(e) => setDesde(e.target.value)}
                className={inputFecha}
              />
            </div>
            <div>
              <label htmlFor="mv-hasta" className="mb-1 block text-sm font-medium text-gray-700">
                {t("misVentas.hasta")}
              </label>
              <input
                id="mv-hasta"
                type="date"
                value={hasta}
                min={desde || undefined}
                onChange={(e) => setHasta(e.target.value)}
                className={inputFecha}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => aplicarRango(0)} className={botonRango}>
                {t("misVentas.hoy")}
              </button>
              <button type="button" onClick={() => aplicarRango(6)} className={botonRango}>
                {t("misVentas.ultimos7")}
              </button>
              <button type="button" onClick={() => aplicarRango(29)} className={botonRango}>
                {t("misVentas.ultimos30")}
              </button>
            </div>
          </div>
          {rangoInvalido && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {t("misVentas.rangoInvalido")}
            </p>
          )}
        </div>

        {/* Resumen del periodo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
            <div className="w-10 h-10 shrink-0 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <CircleDollarSign size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500">{t("misVentas.totalVendido")}</p>
              <p className="text-2xl font-bold text-gray-800 break-words">{money.format(totalPeriodo)}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
            <div className="w-10 h-10 shrink-0 rounded-full bg-[#f4d0d0] flex items-center justify-center text-[#875d69]">
              <Receipt size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500">{t("misVentas.numeroVentas")}</p>
              <p className="text-2xl font-bold text-gray-800">{ventas.length}</p>
            </div>
          </div>
        </div>

        {/* Listado */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-sans text-lg font-semibold text-[#875d69] mb-3">
            {t("misVentas.listado")}
          </h2>

          {errorPdf && (
            <p role="alert" className="mb-3 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
              {errorPdf}
            </p>
          )}

          {(cargando || zona === undefined) && (
            <p className="text-sm text-gray-500">{t("misVentas.cargando")}</p>
          )}

          {error && !cargando && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
              {error}{" "}
              <button onClick={() => setIntento((n) => n + 1)} className="font-medium underline">
                {t("misVentas.reintentar")}
              </button>
            </div>
          )}

          {!cargando && !error && !rangoInvalido && zona !== undefined && ventas.length === 0 && (
            <p className="text-sm text-gray-500">{t("misVentas.sinVentas")}</p>
          )}

          {!cargando && !error && ventas.length > 0 && (
            <>
              <ul className="divide-y divide-gray-100">
                {ventas.slice(0, visibles).map((venta) => (
                  <li key={venta.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800">
                        {t("ticketVenta.venta")} #{venta.id}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatearFechaNegocio(venta.fecha, i18n.language, zona)} ·{" "}
                        {t(`ventas.metodosPago.${venta.metodo_pago_nombre}`, venta.metodo_pago_nombre)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <p className="mr-2 font-semibold text-gray-800">{money.format(Number(venta.total))}</p>
                      <button
                        type="button"
                        onClick={() => setDetalleId(venta.id)}
                        className="flex items-center gap-1 rounded-full border-2 border-[#e6bdc7] px-3 py-1 text-xs font-medium text-[#875d69] hover:bg-[#f4d0d0]"
                      >
                        <Eye size={14} />
                        {t("misVentas.detalle")}
                      </button>
                      <button
                        type="button"
                        onClick={() => ejecutarPdf(venta.id, abrirTicketPdf)}
                        disabled={pdfOcupado === venta.id}
                        aria-label={`${t("ticketVenta.imprimir")} #${venta.id}`}
                        className="flex items-center gap-1 rounded-full border-2 border-[#e6bdc7] px-3 py-1 text-xs font-medium text-[#875d69] hover:bg-[#f4d0d0] disabled:opacity-50"
                      >
                        <Printer size={14} />
                        {t("misVentas.imprimir")}
                      </button>
                      <button
                        type="button"
                        onClick={() => ejecutarPdf(venta.id, descargarTicketPdf)}
                        disabled={pdfOcupado === venta.id}
                        aria-label={`${t("ticketVenta.descargar")} #${venta.id}`}
                        className="flex items-center gap-1 rounded-full border-2 border-[#e6bdc7] px-3 py-1 text-xs font-medium text-[#875d69] hover:bg-[#f4d0d0] disabled:opacity-50"
                      >
                        <Download size={14} />
                        {t("misVentas.pdf")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {visibles < ventas.length && (
                <button
                  type="button"
                  onClick={() => setVisibles((n) => n + POR_PAGINA)}
                  className="mt-4 w-full rounded-lg border-2 border-[#e6bdc7] py-2 text-sm font-medium text-[#875d69] hover:bg-[#f4d0d0]"
                >
                  {t("misVentas.verMas", { count: ventas.length - visibles })}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <TicketVentaModal ventaId={detalleId} onClose={() => setDetalleId(null)} />
    </div>
  );
}