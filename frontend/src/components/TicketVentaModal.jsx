import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Download, Printer, X } from "lucide-react";
import {
  abrirTicketPdf,
  descargarTicketPdf,
  obtenerTicket,
  obtenerZonaHoraria,
} from "../api/ventasCajero";
import { crearFormatoMoneda, formatearFechaNegocio } from "../api/formatoVentas";

/**
 * Resumen de una venta con los datos de GET /ventas/{id}/ticket y botones
 * para imprimir / descargar el PDF. Se usa al terminar un cobro (con cambio)
 * y en el detalle de Mis ventas.
 *
 * onListo (opcional): se llama cuando termina de cargar el ticket (bien o con error),
 * para que la pantalla que lo abrió pueda quitar su pantalla de espera.
 */
export default function TicketVentaModal({
  ventaId,
  cambio = null,
  recienRegistrada = false,
  textoCerrar,
  onListo,
  onClose,
}) {
  const { t, i18n } = useTranslation();
  const money = crearFormatoMoneda(i18n.language);

  const [ticket, setTicket] = useState(null);
  const [zona, setZona] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false); // pidiendo el PDF
  const [errorPdf, setErrorPdf] = useState("");
  const [intento, setIntento] = useState(0); // sube al pulsar "Reintentar"
  const onListoRef = useRef(onListo);

  useEffect(() => {
    onListoRef.current = onListo;
  });

  useEffect(() => {
    if (ventaId == null) return;
    let activo = true;
    setCargando(true);
    setError("");
    setErrorPdf("");
    setTicket(null);
    Promise.all([obtenerTicket(ventaId), obtenerZonaHoraria()])
      .then(([datos, zonaHoraria]) => {
        if (!activo) return;
        setTicket(datos);
        setZona(zonaHoraria);
      })
      .catch((err) => {
        if (!activo) return;
        const detalle = err?.response?.data?.detail;
        setError(typeof detalle === "string" ? detalle : t("ticketVenta.errorCarga"));
      })
      .finally(() => {
        if (!activo) return;
        setCargando(false);
        onListoRef.current?.();
      });
    return () => {
      activo = false;
    };
  }, [ventaId, t, intento]);

  // Esc cierra
  useEffect(() => {
    if (ventaId == null) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ventaId, onClose]);

  if (ventaId == null) return null;

  const ejecutarPdf = async (accion) => {
    setOcupado(true);
    setErrorPdf("");
    try {
      await accion(ventaId);
    } catch {
      setErrorPdf(t("ticketVenta.errorPdf"));
    } finally {
      setOcupado(false);
    }
  };

  const productos = ticket?.productos ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-titulo"
        className="flex max-h-[95vh] w-full max-w-lg flex-col rounded-2xl bg-white dark:bg-[var(--dark-surface)] dark:border dark:border-[var(--dark-border)] p-4 sm:p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            {recienRegistrada && <CheckCircle2 size={24} className="text-green-600 dark:text-green-400 shrink-0" />}
            <div className="min-w-0">
              <h2 id="ticket-titulo" className="font-sans text-lg sm:text-xl font-bold text-[#875d69] dark:text-rose-300">
                {recienRegistrada ? t("ticketVenta.ventaRegistrada") : t("ticketVenta.titulo")}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-[var(--dark-muted)]">
                {t("ticketVenta.venta")} #{ventaId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("ticketVenta.cerrar")}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-gray-400 dark:text-[var(--dark-muted)] hover:text-gray-600 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {cargando && <p className="py-6 text-center text-sm text-gray-500 dark:text-[var(--dark-muted)]">{t("ticketVenta.cargando")}</p>}

          {error && !cargando && (
            <div role="alert" className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-2 text-sm text-red-700 dark:text-red-300">
              <p>{error}</p>
              <button type="button" onClick={() => setIntento((n) => n + 1)} className="mt-1 font-medium underline">
                {t("ticketVenta.reintentar")}
              </button>
            </div>
          )}

          {ticket && (
            <>
              <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-gray-500 dark:text-[var(--dark-muted)]">{t("ticketVenta.sucursal")}</dt>
                <dd className="text-right font-medium text-gray-800 dark:text-[var(--dark-text)]">{ticket.sucursal}</dd>
                {ticket.direccion_sucursal && (
                  <>
                    <dt className="text-gray-500 dark:text-[var(--dark-muted)]">{t("ticketVenta.direccion")}</dt>
                    <dd className="text-right text-gray-800 dark:text-[var(--dark-text)]">{ticket.direccion_sucursal}</dd>
                  </>
                )}
                <dt className="text-gray-500 dark:text-[var(--dark-muted)]">{t("ticketVenta.cajero")}</dt>
                <dd className="text-right text-gray-800 dark:text-[var(--dark-text)]">{ticket.cajero}</dd>
                <dt className="text-gray-500 dark:text-[var(--dark-muted)]">{t("ticketVenta.fecha")}</dt>
                <dd className="text-right text-gray-800 dark:text-[var(--dark-text)]">
                  {formatearFechaNegocio(ticket.fecha, i18n.language, zona)}
                </dd>
                <dt className="text-gray-500 dark:text-[var(--dark-muted)]">{t("ticketVenta.metodoPago")}</dt>
                <dd className="text-right text-gray-800 dark:text-[var(--dark-text)]">
                  {t(`ventas.metodosPago.${ticket.metodo_pago}`, ticket.metodo_pago)}
                </dd>
              </dl>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-gray-500 dark:text-[var(--dark-muted)]">
                      <th className="py-2 pr-2 font-medium">{t("ticketVenta.producto")}</th>
                      <th className="px-2 py-2 text-center font-medium">{t("ticketVenta.cantidad")}</th>
                      <th className="px-2 py-2 text-right font-medium">{t("ticketVenta.precio")}</th>
                      <th className="py-2 pl-2 text-right font-medium">{t("ticketVenta.subtotal")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[var(--dark-border)]">
                    {productos.map((p, i) => (
                      <tr key={`${p.nombre}-${i}`}>
                        <td className="py-2 pr-2 text-gray-800 dark:text-[var(--dark-text)]">{p.nombre}</td>
                        <td className="px-2 py-2 text-center text-gray-800 dark:text-[var(--dark-text)]">{p.cantidad}</td>
                        <td className="px-2 py-2 text-right text-gray-600 dark:text-[var(--dark-muted)]">{money.format(Number(p.precio_unitario))}</td>
                        <td className="py-2 pl-2 text-right font-medium text-gray-800 dark:text-[var(--dark-text)]">{money.format(Number(p.subtotal))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 border-t pt-4">
                <div className="flex justify-between text-xl font-semibold text-gray-800 dark:text-[var(--dark-text)]">
                  <span>{t("ticketVenta.total")}</span>
                  <span>{money.format(Number(ticket.total))}</span>
                </div>
                {cambio > 0 && (
                  <div className="mt-3 flex justify-between rounded-lg bg-green-50 dark:bg-green-950/40 px-4 py-3 text-lg font-bold text-green-700 dark:text-green-300">
                    <span>{t("ticketVenta.cambio")}</span>
                    <span>{money.format(cambio)}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {errorPdf && (
          <p role="alert" className="mt-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-2 text-sm text-red-700 dark:text-red-300">
            {errorPdf}
          </p>
        )}

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => ejecutarPdf(abrirTicketPdf)}
            disabled={ocupado || !ticket}
            className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] py-2 text-sm font-medium text-[#875d69] dark:text-rose-300 hover:bg-[#f4d0d0] dark:hover:bg-[var(--dark-border)] disabled:opacity-50"
          >
            <Printer size={16} />
            {t("ticketVenta.imprimir")}
          </button>
          <button
            type="button"
            onClick={() => ejecutarPdf(descargarTicketPdf)}
            disabled={ocupado || !ticket}
            className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] py-2 text-sm font-medium text-[#875d69] dark:text-rose-300 hover:bg-[#f4d0d0] dark:hover:bg-[var(--dark-border)] disabled:opacity-50"
          >
            <Download size={16} />
            {t("ticketVenta.descargar")}
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full min-h-[44px] rounded-xl bg-rose-800 dark:bg-rose-700 py-2.5 font-medium text-white transition-colors hover:bg-rose-900 dark:hover:bg-rose-600 flex items-center justify-center"
        >
          {textoCerrar ?? t("ticketVenta.cerrar")}
        </button>
      </div>
    </div>
  );
}