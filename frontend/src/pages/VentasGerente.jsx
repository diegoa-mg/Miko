import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { obtenerVentas, contarVentas } from "../api/ventas";
import Paginacion from "../components/Paginacion";

function VentasGerente() {
  const { t, i18n } = useTranslation();

  const [ventas, setVentas] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalVentas, setTotalVentas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [intentoCarga, setIntentoCarga] = useState(0);
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState("");
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");

  const ventasPorPagina = 15;

  useEffect(() => {
    let cancelado = false;

    async function cargarVentas() {
      setCargando(true);
      setErrorCarga(false);

      try {
        const fechaInicio = fechaSeleccionada || null;
        const fechaFin = fechaSeleccionada || null;

        const [datosVentas, total] = await Promise.all([
          obtenerVentas(null, {
            limit: ventasPorPagina,
            offset: (paginaActual - 1) * ventasPorPagina,
            fechaInicio,
            fechaFin,
          }),
          contarVentas(null, { fechaInicio, fechaFin }),
        ]);

        if (cancelado) return;

        setTotalVentas(total);
        setVentas(Array.isArray(datosVentas) ? datosVentas : []);
      } catch (error) {
        if (!cancelado) {
          console.error("Error al cargar ventas del gerente:", error);
          setVentas([]);
          setTotalVentas(0);
          setErrorCarga(true);
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargarVentas();

    return () => {
      cancelado = true;
    };
  }, [paginaActual, fechaSeleccionada, intentoCarga]);

  const ventasFiltradas = useMemo(() => {
    if (metodoPagoSeleccionado === "") return ventas;

    return ventas.filter((venta) => {
      const metodo = String(venta.metodo_pago_nombre ?? "")
        .trim()
        .toLowerCase();

      return metodo === metodoPagoSeleccionado;
    });
  }, [ventas, metodoPagoSeleccionado]);

  const totalVendido = useMemo(
    () =>
      ventasFiltradas.reduce(
        (acumulado, venta) => acumulado + (Number(venta.total) || 0),
        0
      ),
    [ventasFiltradas]
  );

  const formatearPrecio = (precio) =>
    Number(precio || 0).toLocaleString(
      i18n.language?.startsWith("en") ? "en-US" : "es-MX",
      {
        style: "currency",
        currency: "MXN",
      }
    );

  const formatearFecha = (fecha) => {
    if (!fecha) return "—";

    const fechaValida = new Date(fecha);
    if (Number.isNaN(fechaValida.getTime())) return "—";

    return fechaValida.toLocaleString(
      i18n.language?.startsWith("en") ? "en-US" : "es-MX",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  };

  const traducirMetodoPago = (metodo) => {
    const claveMetodo = String(metodo || "").trim().toLowerCase();

    const traducciones = {
      efectivo: "ventas.metodosPago.efectivo",
      tarjeta: "ventas.metodosPago.tarjeta",
      transferencia: "ventas.metodosPago.transferencia",
    };

    const texto = traducciones[claveMetodo]
      ? t(traducciones[claveMetodo])
      : claveMetodo;

    return texto
      ? texto.charAt(0).toLocaleUpperCase(i18n.language) + texto.slice(1)
      : "";
  };

  const cambiarMetodoPago = (valor) => {
    setMetodoPagoSeleccionado(valor);
  };

  const totalPaginas = Math.max(1, Math.ceil(totalVentas / ventasPorPagina));

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
              {t("ventas.titulo")}
            </h1>
            <p className="mt-1 text-lg text-[#5f4a50] dark:text-[var(--dark-muted)]">
              {t("ventas.descripcion")}
            </p>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <section className="mb-6 rounded-3xl border border-[#f0d5dc] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-surface)] p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-4">
          <div>
        <h2 className="text-xl font-bold text-[#68434f] dark:text-[var(--dark-text)]">
          {t("ventas.filtrarVentas")}
        </h2>
      </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.3fr_1fr]">
          <div>
            <label
              htmlFor="filtro-metodo-pago-gerente"
              className="mb-2 block text-sm font-semibold text-[#68434f] dark:text-[var(--dark-text)]"
            >
              {t("ventas.metodoPago")}
            </label>
            <select
              id="filtro-metodo-pago-gerente"
              value={metodoPagoSeleccionado}
              onChange={(e) => cambiarMetodoPago(e.target.value)}
              className="w-full h-[52px] min-w-0 rounded-full border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-bg)] px-5 text-sm text-[#8c6773] dark:text-[var(--dark-text)] outline-none focus:border-[#875d69] dark:focus:border-rose-300"
            >
              <option value="">{t("ventas.todosMetodosPago")}</option>
              <option value="efectivo">{t("ventas.metodosPago.efectivo")}</option>
              <option value="tarjeta">{t("ventas.metodosPago.tarjeta")}</option>
              <option value="transferencia">
                {t("ventas.metodosPago.transferencia")}
              </option>
            </select>
          </div>

          <div>
  <label
    htmlFor="fecha-gerente"
    className="mb-2 block text-sm font-semibold text-[#68434f] dark:text-[var(--dark-text)]"
  >
    {t("ventas.filtrarPorFecha")}
  </label>

  <input
    id="fecha-gerente"
    type="date"
    value={fechaSeleccionada}
    onChange={(e) => {
      setFechaSeleccionada(e.target.value);
      setPaginaActual(1);
    }}
    className="w-full h-[52px] min-w-0 rounded-full border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-bg)] px-5 text-sm text-[#8c6773] dark:text-[var(--dark-text)] outline-none focus:border-[#875d69] dark:focus:border-rose-300"
  />
</div>

        </div>

        {(fechaSeleccionada || metodoPagoSeleccionado) && (
          <button
            type="button"
            onClick={() => {
              setFechaSeleccionada("");
              setMetodoPagoSeleccionado("");
              setPaginaActual(1);
            }}
            className="mt-4 rounded-full px-4 py-2 text-sm font-semibold text-[#b6536b] dark:text-rose-300 transition hover:bg-[#fff1f3] dark:hover:bg-white/5"
          >
            {t("ventas.limpiarFiltros")}
          </button>
        )}
      </section>

      {/* RESUMEN DE LA PÁGINA ACTUAL */}
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
                {t("ventas.ventasRegistradas")}
              </p>
              <p className="text-2xl font-bold text-[#5f3c46] dark:text-[var(--dark-text)]">
                {cargando ? "—" : ventasFiltradas.length}
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
                {t("ventas.totalVendido")}
              </p>
              <p className="text-2xl font-bold text-[#5f3c46] dark:text-[var(--dark-text)]">
                {cargando ? "—" : formatearPrecio(totalVendido)}
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
              {t("ventas.registroTitulo")}
            </h2>
            <p className="text-sm text-[#8c6773] dark:text-[var(--dark-muted)]">
              {t("ventas.registroDescripcion")}
            </p>
          </div>
        </div>

        {cargando ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="material-icons animate-spin text-4xl text-[#d06b7d] dark:text-rose-300">
              autorenew
            </span>
            <p className="mt-3 font-medium text-[#8c6773] dark:text-[var(--dark-muted)]">
              {t("ventas.cargando", "Cargando ventas...")}
            </p>
          </div>
        ) : errorCarga ? (
          <div className="px-6 py-14 text-center">
            <span className="material-icons text-4xl text-[#d06b7d] dark:text-rose-300">
              error_outline
            </span>
            <p className="mt-4 font-semibold text-[#70565e] dark:text-[var(--dark-text)]">
              {t("ventas.errorCarga", "No se pudieron cargar las ventas.")}
            </p>
            <button
              type="button"
              onClick={() => setIntentoCarga((intento) => intento + 1)}
              className="mt-4 rounded-full bg-[#d06b7d] dark:bg-rose-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#bd5d73] dark:hover:bg-rose-600"
            >
              {t("ventas.reintentar", "Reintentar")}
            </button>
          </div>
        ) : ventasFiltradas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#ead8d8] dark:border-[var(--dark-border)] bg-[#fffaf8] dark:bg-[var(--dark-bg)]">
                  <th className="p-4 text-left text-sm font-semibold text-[#5f3c46] dark:text-[var(--dark-text)]">
                    {t("ventas.venta")}
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-[#5f3c46] dark:text-[var(--dark-text)]">
                    {t("ventas.sucursal")}
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-[#5f3c46] dark:text-[var(--dark-text)]">
                    {t("ventas.cajero")}
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
                </tr>
              </thead>

              <tbody>
                {ventasFiltradas.map((venta) => {
                  const estilosPago = {
                    Efectivo: "bg-[#e4f3e6] dark:bg-green-900/40 text-[#42784b] dark:text-green-300",
                    Tarjeta: "bg-[#e4edf9] dark:bg-blue-900/40 text-[#456b9a] dark:text-blue-300",
                    Transferencia: "bg-[#f9eeb4] dark:bg-yellow-900/30 text-[#8b7431] dark:text-yellow-300",
                  };

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

                      <td className="p-4 font-medium text-[#5f3c46] dark:text-[var(--dark-text)]">
                        {venta.sucursal_nombre || "—"}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2 whitespace-nowrap text-[#5f3c46] dark:text-[var(--dark-text)]">
                          <span className="material-icons text-lg text-[#bd8794] dark:text-[var(--dark-muted)]">
                            person
                          </span>
                          {venta.usuario_nombre || "—"}
                        </div>
                      </td>

                      <td className="whitespace-nowrap p-4 text-[#8c6773] dark:text-[var(--dark-muted)]">
                        {formatearFecha(venta.fecha)}
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${
                            estilosPago[venta.metodo_pago_nombre] ||
                            "bg-[#fae4df] dark:bg-[var(--dark-border)] text-[#8b5e6b] dark:text-[var(--dark-muted)]"
                          }`}
                        >
                          <span className="material-icons text-base">
                            {venta.metodo_pago_nombre === "Efectivo"
                              ? "payments"
                              : venta.metodo_pago_nombre === "Tarjeta"
                                ? "credit_card"
                                : "account_balance"}
                          </span>
                          {traducirMetodoPago(venta.metodo_pago_nombre)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap p-4 text-right">
                        <span className="font-bold text-[#c94f68] dark:text-rose-300">
                          {formatearPrecio(venta.total)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fae4df] dark:bg-[var(--dark-border)]">
              <span className="material-icons text-3xl text-[#d394a1] dark:text-[var(--dark-muted)]">
                receipt_long
              </span>
            </div>
            <p className="mt-4 font-semibold text-[#70565e] dark:text-[var(--dark-text)]">
              {t("ventas.sinVentas")}
            </p>
            <p className="mt-1 text-sm text-[#9b7b84] dark:text-[var(--dark-muted)]">
              {t("ventas.sinVentasDescripcion")}
            </p>
          </div>
        )}

        {/* PAGINACIÓN */}
        {!cargando && !errorCarga && ventas.length > 0 && (
          <Paginacion
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            onCambiar={setPaginaActual}
            deshabilitado={cargando}
            etiquetaAnterior={t("ventas.paginacion.anterior")}
            etiquetaSiguiente={t("ventas.paginacion.siguiente")}
          />
        )}

      </section>
    </div>
  );
}

export default VentasGerente;