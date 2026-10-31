import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { obtenerVentas } from "../api/ventas";
import { obtenerSucursales } from "../api/sucursales";


function Ventas() {
  const { t, i18n } = useTranslation();

  const [ventas, setVentas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const sucursalesActivas = sucursales.filter(
  (sucursal) => sucursal.estado === "activa"
);

const sucursalesInactivas = sucursales.filter(
  (sucursal) => sucursal.estado === "inactiva"
);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState("");
  const [tipoSucursal, setTipoSucursal] = useState("todas");
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [haySiguiente, setHaySiguiente] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");

  const ventasPorPagina = 15;

  // Las sucursales se cargan una sola vez.
  useEffect(() => {
    let cancelado = false;

    async function cargarSucursales() {
      try {
        const datosSucursales = await obtenerSucursales(true);
        if (!cancelado) {
          setSucursales(Array.isArray(datosSucursales) ? datosSucursales : []);
        }
      } catch (error) {
        if (!cancelado) setSucursales([]);
        console.error("Error al cargar sucursales:", error);
      }
    }

    cargarSucursales();
    return () => {
      cancelado = true;
    };
  }, []);

  // Cada cambio de página o filtro consulta únicamente los registros necesarios.
  useEffect(() => {
    let cancelado = false;

    async function cargarVentas() {
      setCargando(true);
      setErrorCarga("");
      setVentas([]);
      setHaySiguiente(false);

      if (tipoSucursal !== "todas" && sucursalSeleccionada === "") {
      setCargando(false);
      return;
}

      try {
        const datosVentas = await obtenerVentas(
          sucursalSeleccionada === "" ? null : Number(sucursalSeleccionada),
          {
            // Se solicita un registro extra para saber si existe otra página.
            limit: ventasPorPagina + 1,
            offset: (paginaActual - 1) * ventasPorPagina,
            fechaInicio: fechaSeleccionada || null,
            fechaFin: fechaSeleccionada || null,
          }
        );

        if (cancelado) return;

        const lista = Array.isArray(datosVentas) ? datosVentas : [];
        setHaySiguiente(lista.length > ventasPorPagina);
        setVentas(lista.slice(0, ventasPorPagina));
      } catch (error) {
        console.error("Error al cargar ventas:", error);
        if (!cancelado) {
          setVentas([]);
          setHaySiguiente(false);
          setErrorCarga(t("ventas.errorCarga"));
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargarVentas();
    return () => {
      cancelado = true;
    };
  }, [tipoSucursal, sucursalSeleccionada, fechaSeleccionada, paginaActual]);

  const totalVendido = useMemo(
    () => ventas.reduce(
      (acumulado, venta) => acumulado + (Number(venta.total) || 0),
      0
    ),
    [ventas]
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
  const claveMetodo = String(metodo || "")
    .trim()
    .toLowerCase();

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


  return (
    <div className="min-h-screen bg-[#fdf6e9] p-6">

      {/* ENCABEZADO */}
      <div className="mb-6">
        <div className="flex items-center gap-4">

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fae4df]">
            <span className="material-icons text-3xl text-[#d06b7d]">
              trending_up
            </span>
          </div>

          <div>
            <h1 className="text-4xl font-bold text-[#8b5e6b]">
             {t("ventas.titulo")}
            </h1>

            
            <p className="mt-1 text-lg text-[#5f4a50]">
              {t("ventas.descripcion")}
            </p>
          </div>

        </div>
      </div>

      
{/* FILTROS DE VENTAS */}
<section className="mb-6 rounded-3xl border border-[#ead8d8] bg-white/80 p-6 shadow-sm">

  {/* TÍTULO */}
  <h2 className="mb-6 text-xl font-bold text-[#5f3c46]">
    {t("ventas.filtrarVentas")}
  </h2>

  {/* FILTROS EN DOS COLUMNAS */}
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

    {/* FILTRO POR SUCURSAL */}
    <div>
      <label
        htmlFor="sucursal-ventas"
        className="mb-3 block text-sm font-semibold text-[#5f3c46]"
      >
        {t("ventas.filtroTitulo")}
      </label>

      
<select
  id="sucursal-ventas"
  value={tipoSucursal}
  onChange={(e) => {
    setTipoSucursal(e.target.value);
    setSucursalSeleccionada("");
    setPaginaActual(1);
  }}
  className="h-[52px] w-full rounded-full border-2 border-[#e6bdc7] bg-white px-5 text-sm text-[#8c6773] outline-none transition focus:border-[#875d69]"
>
 <option value="todas">{t("ventas.todasSucursales")}</option>
<option value="activas">{t("ventas.sucursalesActivas")}</option>
<option value="inactivas">{t("ventas.sucursalesInactivas")}</option>
</select>

{tipoSucursal !== "todas" && (
  <select
    value={sucursalSeleccionada}
    onChange={(e) => {
      setSucursalSeleccionada(e.target.value);
      setPaginaActual(1);
    }}
    className="mt-3 h-[52px] w-full rounded-full border-2 border-[#e6bdc7] bg-white px-5 text-sm text-[#8c6773]"
  >
   <option value="">{t("ventas.seleccionarSucursal")}</option>

    {(tipoSucursal === "activas"
      ? sucursalesActivas
      : sucursalesInactivas
    ).map((sucursal) => (
      <option key={sucursal.id} value={sucursal.id}>
        {sucursal.nombre}
      </option>
    ))}
  </select>
)}
    </div>

    {/* FILTRO POR FECHA */}
    <div>
      <label
        htmlFor="fecha-ventas"
        className="mb-3 block text-sm font-semibold text-[#5f3c46]"
      >
        {t("ventas.filtrarPorFecha")}
      </label>

      <input
        id="fecha-ventas"
        type="date"
        value={fechaSeleccionada}
        onChange={(e) => {
          setFechaSeleccionada(e.target.value);
          setPaginaActual(1);
        }}
        className="h-[52px] w-full rounded-full border-2 border-[#e6bdc7] bg-white px-5 text-sm text-[#8c6773] outline-none focus:border-[#875d69]"
      />
    </div>

  </div>

  {/* LIMPIAR FILTROS */}
  {fechaSeleccionada && (
    <button
      type="button"
      onClick={() => {
        setFechaSeleccionada("");
        setPaginaActual(1);
      }}
      className="mt-6 rounded-full px-4 py-2 text-sm font-semibold text-[#b6536b] transition hover:bg-[#fff1f3]"
    >
      {t("ventas.limpiarFiltros")}
    </button>
  )}

</section>


      {/* RESUMEN */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">

        {/* VENTAS REGISTRADAS */}
        <div className="rounded-3xl border border-[#ead8d8] bg-white/80 p-5 shadow-sm">

          <div className="flex items-center gap-4">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fae4df]">
              <span className="material-icons text-2xl text-[#d06b7d]">
                receipt_long
              </span>
            </div>

            <div>
              <p className="text-sm text-[#8c6773]">
               {t("ventas.ventasRegistradas")}
              </p>

              <p className="text-2xl font-bold text-[#5f3c46]">
                {ventas.length}
              </p>
            </div>

          </div>

        </div>

        {/* TOTAL VENDIDO */}
        <div className="rounded-3xl border border-[#ead8d8] bg-white/80 p-5 shadow-sm">

          <div className="flex items-center gap-4">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f9eeb4]">
              <span className="material-icons text-2xl text-[#a78b42]">
                payments
              </span>
            </div>

            <div>
              <p className="text-sm text-[#8c6773]">
                {t("ventas.totalVendido")}
              </p>

              <p className="text-2xl font-bold text-[#5f3c46]">
                {formatearPrecio(totalVendido)}
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* TABLA DE VENTAS */}
      <section className="overflow-hidden rounded-3xl border border-[#ead8d8] bg-white/80 shadow-sm">

        {/* ENCABEZADO DE LA TABLA */}
        <div className="flex items-center gap-3 border-b border-[#ead8d8] p-5">

          <span className="material-icons text-2xl text-[#d06b7d]">
            receipt_long
          </span>

          <div>
            
          <h2 className="font-bold text-[#5f3c46]">
            {t("ventas.registroTitulo")}
          </h2>

          <p className="text-sm text-[#8c6773]">
            {t("ventas.registroDescripcion")}
          </p>

          </div>

        </div>

        {cargando ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-[#8c6773]" role="status">
            <span className="material-icons animate-spin text-4xl text-[#d06b7d]">
              progress_activity
            </span>
            <p className="font-medium">{t("ventas.cargando")}</p>
          </div>
        ) : errorCarga ? (
          <div className="px-6 py-12 text-center text-sm font-medium text-[#a34b5d]">
            {errorCarga}
          </div>
        ) : ventas.length > 0 ? (

          <div className="w-full overflow-x-auto">

        <table className="w-full table-fixed">
          <colgroup>
          <col className="w-[11%]" />
          <col className="w-[14%]" />
          <col className="w-[17%]" />
          <col className="w-[22%]" />
          <col className="w-[21%]" />
          <col className="w-[15%]" />
        </colgroup>

              <thead>
            <tr className="border-b border-[#ead8d8] bg-[#fffaf8]">
              <th className="p-4 text-left text-sm font-semibold text-[#5f3c46]">
                {t("ventas.venta")}
              </th>

              <th className="p-4 text-left text-sm font-semibold text-[#5f3c46]">
                {t("ventas.sucursal")}
              </th>

              <th className="p-4 text-left text-sm font-semibold text-[#5f3c46]">
                {t("ventas.cajero")}
              </th>

              <th className="p-4 text-left text-sm font-semibold text-[#5f3c46]">
              {t("ventas.fecha")}
            </th>

              <th className="p-4 text-left text-sm font-semibold text-[#5f3c46]">
                 {t("ventas.metodoPago")}
              </th>

              <th className="p-4 text-center text-sm font-semibold text-[#5f3c46]">
                {t("ventas.total")}
              </th>
            </tr>
          </thead>

              <tbody>
  {ventas.map((venta) => (
    <tr
      key={venta.id}
      className="border-b border-[#f0e3e3] last:border-b-0 transition-colors hover:bg-[#fff5f6]"
    >
      {/* VENTA */}
      <td className="p-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#fae4df] px-3 py-1 text-sm font-semibold text-[#8b5e6b]">
          <span className="material-icons text-base text-[#d06b7d]">
            receipt
          </span>
          #{venta.id}
        </span>
      </td>

      {/* SUCURSAL */}
      <td className="p-4 font-medium text-[#5f3c46]">
        {venta.sucursal_nombre}
      </td>

      {/* CAJERO */}
      <td className="p-4">
        <div className="flex min-w-0 items-center gap-2 break-words text-[#5f3c46]">
          <span className="material-icons text-lg text-[#bd8794]">
            person
          </span>
          {venta.usuario_nombre || "—"}
        </div>
      </td>

      {/* FECHA */}
      <td className="p-3 text-sm leading-5 text-[#8c6773] break-words">
        {formatearFecha(venta.fecha)}
      </td>

      {/* MÉTODO DE PAGO */}
      <td className="p-4">
        {(() => {
          const estilosPago = {
            Efectivo: "bg-[#e4f3e6] text-[#42784b]",
            Tarjeta: "bg-[#e4edf9] text-[#456b9a]",
            Transferencia: "bg-[#f9eeb4] text-[#8b7431]",
          };

          return (
            <span
              className={`inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold ${
                estilosPago[venta.metodo_pago_nombre] ||
                "bg-[#fae4df] text-[#8b5e6b]"
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
          );
        })()}
      </td>

      {/* TOTAL */}
      <td className="whitespace-nowrap p-4 text-right">
        <span className="font-bold text-[#c94f68]">
          {formatearPrecio(venta.total)}
        </span>
      </td>
    </tr>
  ))}
</tbody>

            </table>

          </div>

        ) : (

          /* SIN VENTAS */
          <div className="px-6 py-14 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fae4df]">

              <span className="material-icons text-3xl text-[#d394a1]">
                receipt_long
              </span>

            </div>

            
              <p className="mt-4 font-semibold text-[#70565e]">
                {t("ventas.sinVentas")}
              </p>

              <p className="mt-1 text-sm text-[#9b7b84]">
                {t("ventas.sinVentasDescripcion")}
              </p>


          </div>

        )}

        {/* PAGINACIÓN */}
{!cargando && !errorCarga && ventas.length > 0 && (
  <div className="flex flex-col items-center gap-4 border-t border-[#ead8d8] bg-[#fffaf8] px-5 py-4">
    <div className="flex flex-wrap items-center justify-center gap-2">

      {/* ANTERIOR */}
      <button
        type="button"
        onClick={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
        disabled={paginaActual === 1}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#ead8d8] bg-white text-[#8b5e6b] transition hover:bg-[#fae4df] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="material-icons text-xl">
          chevron_left
        </span>
      </button>

      {/* PÁGINA ACTUAL */}
      <span
        aria-current="page"
        className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-[#d06b7d] bg-[#d06b7d] px-3 text-sm font-semibold text-white"
      >
        {paginaActual}
      </span>

      {/* SIGUIENTE */}
      <button
        type="button"
        onClick={() => setPaginaActual((pagina) => pagina + 1)}
        disabled={!haySiguiente || cargando}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#ead8d8] bg-white text-[#8b5e6b] transition hover:bg-[#fae4df] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="material-icons text-xl">
          chevron_right
        </span>
      </button>

    </div>
  </div>
)}

      </section>

    </div>
  );
}

export default Ventas;