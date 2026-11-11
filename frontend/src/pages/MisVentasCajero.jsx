import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Eye, Printer } from "lucide-react";
import {
  abrirTicketPdf,
  descargarTicketPdf,
  obtenerMisVentas,
  obtenerZonaHoraria,
} from "../api/ventasCajero";
import TicketVentaModal from "../components/TicketVentaModal";
import Paginacion from "../components/Paginacion";
import {
  crearFormatoMoneda,
  fechaHoy,
  formatearFechaNegocio,
  restarDias,
} from "../api/formatoVentas";

const POR_PAGINA = 15;

// Colores e iconos por método de pago (la clave llega en minúsculas)
const ESTILOS_PAGO = {
  efectivo: "bg-[#e4f3e6] dark:bg-green-900/40 text-[#42784b] dark:text-green-300",
  tarjeta: "bg-[#e4edf9] dark:bg-blue-900/40 text-[#456b9a] dark:text-blue-300",
  transferencia: "bg-[#f9eeb4] dark:bg-yellow-900/30 text-[#8b7431] dark:text-yellow-300",
};
const ESTILO_PAGO_DEFECTO =
  "bg-[#fae4df] dark:bg-[var(--dark-border)] text-[#8b5e6b] dark:text-[var(--dark-muted)]";
const ICONOS_PAGO = {
  efectivo: "payments",
  tarjeta: "credit_card",
  transferencia: "account_balance",
};

export default function MisVentasCajero() {
  const { t, i18n } = useTranslation();
  const money = useMemo(() => crearFormatoMoneda(i18n.language), [i18n.language]);

  const [zona, setZona] = useState(undefined); // undefined = aún no se sabe
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [pagina, setPagina] = useState(1);
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
    setPagina(1);
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

  // Paginación en el cliente: las ventas del periodo ya vienen completas
  const totalPaginas = Math.max(1, Math.ceil(ventas.length / POR_PAGINA));
  const ventasPagina = ventas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

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
    "rounded-full bg-white dark:bg-[var(--dark-bg)] border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] text-[#8c6773] dark:text-[var(--dark-text)] px-4 py-2 focus:outline-none focus:border-[#875d69] dark:focus:border-rose-300";
  const botonRango =
    "rounded-full border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] px-4 py-2 text-sm font-medium text-[#875d69] dark:text-rose-300 hover:bg-[#f4d0d0] dark:hover:bg-[var(--dark-border)] transition-colors";
  const botonRangoActivo =
    "rounded-full border-2 border-[#d06b7d] dark:border-rose-700 bg-[#d06b7d] dark:bg-rose-700 px-4 py-2 text-sm font-medium text-white transition-colors";

  // Un acceso rápido está activo si el rango de fechas coincide exactamente con él
  const hoy = zona === undefined ? null : fechaHoy(zona);
  const rangoActivo = (dias) =>
    Boolean(hoy) && hasta === hoy && desde === restarDias(hoy, dias);
  const botonAccion =
    "flex items-center gap-1 rounded-full border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] px-3 py-1 text-xs font-semibold text-[#8b5e6b] dark:text-[var(--dark-muted)] transition hover:bg-[#fae4df] dark:hover:bg-[var(--dark-border)] disabled:opacity-50";

  return (
    <div className="min-h-screen bg-[#fdf6e9] dark:bg-[var(--dark-bg)] p-6">
      {/* ENCABEZADO */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fae4df] dark:bg-[var(--dark-border)]">
            <span className="material-icons text-3xl text-[#d06b7d] dark:text-rose-300">
              trending_up
            </span>
          </div>

          <div>
            <h1 className="text-4xl font-bold text-[#8b5e6b] dark:text-rose-300">
              {t("misVentas.titulo")}
            </h1>
            <p className="mt-1 text-lg text-[#5f4a50] dark:text-[var(--dark-muted)]">
              {t("misVentas.descripcion")}
            </p>
          </div>
        </div>
      </div>

      {/* Filtro por rango de fechas */}
      <div className="bg-white dark:bg-[var(--dark-surface)] rounded-xl shadow p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="mv-desde" className="mb-1 block text-sm font-medium text-gray-700 dark:text-[var(--dark-text)]">
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
            <label htmlFor="mv-hasta" className="mb-1 block text-sm font-medium text-gray-700 dark:text-[var(--dark-text)]">
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
            <button
              type="button"
              onClick={() => aplicarRango(0)}
              aria-pressed={rangoActivo(0)}
              className={rangoActivo(0) ? botonRangoActivo : botonRango}
            >
              {t("misVentas.hoy")}
            </button>
            <button
              type="button"
              onClick={() => aplicarRango(6)}
              aria-pressed={rangoActivo(6)}
              className={rangoActivo(6) ? botonRangoActivo : botonRango}
            >
              {t("misVentas.ultimos7")}
            </button>
            <button
              type="button"
              onClick={() => aplicarRango(29)}
              aria-pressed={rangoActivo(29)}
              className={rangoActivo(29) ? botonRangoActivo : botonRango}
            >
              {t("misVentas.ultimos30")}
            </button>
          </div>
        </div>
        {rangoInvalido && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {t("misVentas.rangoInvalido")}
          </p>
        )}
      </div>

      {/* RESUMEN DEL PERIODO */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-[#ead8d8] dark:border-[var(--dark-border)] bg-white/80 dark:bg-[var(--dark-surface)] p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fae4df] dark:bg-[var(--dark-border)]">
              <span className="material-icons text-2xl text-[#d06b7d] dark:text-rose-300">
                receipt_long
              </span>
            </div>
            <div>
              <p className="text-sm text-[#8c6773] dark:text-[var(--dark-muted)]">
                {t("misVentas.numeroVentas")}
              </p>
              <p className="text-2xl font-bold text-[#5f3c46] dark:text-[var(--dark-text)]">
                {cargando ? "—" : ventas.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[#ead8d8] dark:border-[var(--dark-border)] bg-white/80 dark:bg-[var(--dark-surface)] p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f9eeb4] dark:bg-yellow-900/30">
              <span className="material-icons text-2xl text-[#a78b42] dark:text-yellow-400">
                payments
              </span>
            </div>
            <div>
              <p className="text-sm text-[#8c6773] dark:text-[var(--dark-muted)]">
                {t("misVentas.totalVendido")}
              </p>
              <p className="text-2xl font-bold text-[#5f3c46] dark:text-[var(--dark-text)]">
                {cargando ? "—" : money.format(totalPeriodo)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TABLA */}
      <section className="overflow-hidden rounded-3xl border border-[#ead8d8] dark:border-[var(--dark-border)] bg-white/80 dark:bg-[var(--dark-surface)] shadow-sm">
        <div className="flex items-center gap-3 border-b border-[#ead8d8] dark:border-[var(--dark-border)] p-5">
          <span className="material-icons text-2xl text-[#d06b7d] dark:text-rose-300">
            receipt_long
          </span>
          <div>
            <h2 className="font-bold text-[#5f3c46] dark:text-[var(--dark-text)]">
              {t("misVentas.listado")}
            </h2>
            <p className="text-sm text-[#8c6773] dark:text-[var(--dark-muted)]">
              {t("misVentas.listadoDescripcion")}
            </p>
          </div>
        </div>

        {errorPdf && (
          <p
            role="alert"
            className="mx-5 mt-4 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-2 text-sm text-red-700 dark:text-red-300"
          >
            {errorPdf}
          </p>
        )}

        {cargando || zona === undefined ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="material-icons animate-spin text-4xl text-[#d06b7d] dark:text-rose-300">
              autorenew
            </span>
            <p className="mt-3 font-medium text-[#8c6773] dark:text-[var(--dark-muted)]">
              {t("misVentas.cargando")}
            </p>
          </div>
        ) : error ? (
          <div className="px-6 py-14 text-center">
            <span className="material-icons text-4xl text-[#d06b7d] dark:text-rose-300">
              error_outline
            </span>
            <p className="mt-4 font-semibold text-[#70565e] dark:text-[var(--dark-text)]">
              {error}
            </p>
            <button
              type="button"
              onClick={() => setIntento((n) => n + 1)}
              className="mt-4 rounded-full bg-[#d06b7d] dark:bg-rose-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#bd5d73] dark:hover:bg-rose-600"
            >
              {t("misVentas.reintentar")}
            </button>
          </div>
        ) : ventas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#ead8d8] dark:border-[var(--dark-border)] bg-[#fffaf8] dark:bg-[var(--dark-bg)]">
                  <th className="p-4 text-left text-sm font-semibold text-[#5f3c46] dark:text-[var(--dark-text)]">
                    {t("ventas.venta")}
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-[#5f3c46] dark:text-[var(--dark-text)]">
                    {t("ventas.fecha")}
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-[#5f3c46] dark:text-[var(--dark-text)]">
                    {t("ventas.metodoPago")}
                  </th>
                  <th className="p-4 text-center text-sm font-semibold text-[#5f3c46] dark:text-[var(--dark-text)]">
                    {t("ventas.total")}
                  </th>
                  <th className="p-4 text-right text-sm font-semibold text-[#5f3c46] dark:text-[var(--dark-text)]">
                    {t("misVentas.acciones")}
                  </th>
                </tr>
              </thead>

              <tbody>
                {ventasPagina.map((venta) => {
                  const metodo = String(venta.metodo_pago_nombre ?? "").trim().toLowerCase();

                  return (
                    <tr
                      key={venta.id}
                      className="border-b border-[#f0e3e3] dark:border-[var(--dark-border)] last:border-b-0 transition-colors hover:bg-[#fff5f6] dark:hover:bg-white/5"
                    >
                      <td className="p-4">
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#fae4df] dark:bg-[var(--dark-border)] px-3 py-1 text-sm font-semibold text-[#8b5e6b] dark:text-[var(--dark-muted)]">
                          <span className="material-icons text-base text-[#d06b7d] dark:text-rose-300">
                            receipt
                          </span>
                          #{venta.id}
                        </span>
                      </td>

                      <td className="whitespace-nowrap p-4 text-[#8c6773] dark:text-[var(--dark-muted)]">
                        {formatearFechaNegocio(venta.fecha, i18n.language, zona)}
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${
                            ESTILOS_PAGO[metodo] || ESTILO_PAGO_DEFECTO
                          }`}
                        >
                          <span className="material-icons text-base">
                            {ICONOS_PAGO[metodo] || "payments"}
                          </span>
                          {t(`ventas.metodosPago.${metodo}`, venta.metodo_pago_nombre)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap p-4 text-right">
                        <span className="font-bold text-[#c94f68] dark:text-rose-300">
                          {money.format(Number(venta.total))}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setDetalleId(venta.id)}
                            className={botonAccion}
                          >
                            <Eye size={14} />
                            {t("misVentas.detalle")}
                          </button>
                          <button
                            type="button"
                            onClick={() => ejecutarPdf(venta.id, abrirTicketPdf)}
                            disabled={pdfOcupado === venta.id}
                            aria-label={`${t("ticketVenta.imprimir")} #${venta.id}`}
                            className={botonAccion}
                          >
                            <Printer size={14} />
                            {t("misVentas.imprimir")}
                          </button>
                          <button
                            type="button"
                            onClick={() => ejecutarPdf(venta.id, descargarTicketPdf)}
                            disabled={pdfOcupado === venta.id}
                            aria-label={`${t("ticketVenta.descargar")} #${venta.id}`}
                            className={botonAccion}
                          >
                            <Download size={14} />
                            {t("misVentas.pdf")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : !rangoInvalido ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fae4df] dark:bg-[var(--dark-border)]">
              <span className="material-icons text-3xl text-[#d394a1] dark:text-[var(--dark-muted)]">
                receipt_long
              </span>
            </div>
            <p className="mt-4 font-semibold text-[#70565e] dark:text-[var(--dark-text)]">
              {t("misVentas.sinVentas")}
            </p>
          </div>
        ) : null}

        {/* PAGINACIÓN */}
        {!cargando && !error && ventas.length > 0 && (
          <Paginacion
            paginaActual={pagina}
            totalPaginas={totalPaginas}
            onCambiar={setPagina}
            etiquetaAnterior={t("ventas.paginacion.anterior")}
            etiquetaSiguiente={t("ventas.paginacion.siguiente")}
          />
        )}
      </section>

      <TicketVentaModal ventaId={detalleId} onClose={() => setDetalleId(null)} />
    </div>
  );
}