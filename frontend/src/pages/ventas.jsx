import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { obtenerVentas } from "../api/ventas";
import { obtenerSucursales } from "../api/sucursales";


function Ventas() {
  const { t, i18n } = useTranslation();

  const [ventas, setVentas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [cargando, setCargando] = useState(true);

  const ventasPorPagina = 15;

  
  useEffect(() => {
    let cancelado = false;

    async function cargarDatos() {
      try {
        const [datosVentas, datosSucursales] = await Promise.all([
          obtenerVentas(),
          obtenerSucursales(true),
        ]);

        if (cancelado) return;

        setVentas(Array.isArray(datosVentas) ? datosVentas : []);
        setSucursales(
          Array.isArray(datosSucursales) ? datosSucursales : []
        );
      } catch (error) {
        console.error("Error al cargar ventas:", error);
        if (!cancelado) {
          setVentas([]);
          setSucursales([]);
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargarDatos();

    return () => {
      cancelado = true;
    };
  }, []);

  
const ventasFiltradas = useMemo(() => {
  if (sucursalSeleccionada === "") return ventas;

  if (sucursalSeleccionada === "inactivas") {
    const idsInactivos = new Set(
      sucursales
        .filter((sucursal) => {
          const estado = String(sucursal.estado ?? "").toLowerCase();
          return estado === "inactiva" || estado === "inactivo";
        })
        .map((sucursal) => sucursal.id)
    );

    return ventas.filter((venta) =>
      idsInactivos.has(venta.sucursal_id)
    );
  }

  return ventas.filter(
    (venta) => venta.sucursal_id === Number(sucursalSeleccionada)
  );
}, [ventas, sucursales, sucursalSeleccionada]);


  const totalPaginas = Math.ceil(
  ventasFiltradas.length / ventasPorPagina
);

const indiceInicial = (paginaActual - 1) * ventasPorPagina;
const indiceFinal = indiceInicial + ventasPorPagina;

const ventasPaginadas = ventasFiltradas.slice(
  indiceInicial,
  indiceFinal
);

  
const totalVendido = useMemo(() => {
  return ventasFiltradas.reduce(
    (acumulado, venta) =>
      acumulado + (Number(venta.total) || 0),
    0
  );
}, [ventasFiltradas]);


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

      {/* FILTRO POR SUCURSAL */}
      <section className="mb-6 rounded-3xl border border-[#ead8d8] bg-white/80 p-6 shadow-sm">

        <div className="mb-5 flex items-center gap-3">

          <span className="material-icons text-2xl text-[#d06b7d]">
            store
          </span>

          <div>
            
          <h2 className="font-bold text-[#5f3c46]">
            {t("ventas.filtroTitulo")}
          </h2>

          <p className="text-sm text-[#8c6773]">
            {t("ventas.filtroDescripcion")}
          </p>

          </div>

        </div>

        <select
  value={sucursalSeleccionada}
  onChange={(e) => {
  setSucursalSeleccionada(e.target.value);
  setPaginaActual(1);
}}
  className="w-full max-w-lg rounded-full border-2 border-[#e6bdc7] bg-white px-5 py-3 text-[#6f5a61] outline-none transition focus:border-[#c96f80]"
>
  
<option value="">
  {t("ventas.todasSucursales")}
</option>

<option value="inactivas">
  {t("ventas.inactivas")}
</option>


  {sucursales.map((sucursal) => (
    <option
      key={sucursal.id}
      value={sucursal.id}
    >
      {sucursal.nombre}
    </option>
  ))}
</select>

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
                {ventasFiltradas.length}
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

        {ventasFiltradas.length > 0 ? (

          <div className="overflow-x-auto">

            <table className="w-full">

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
  {ventasPaginadas.map((venta) => (
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
        <div className="flex items-center gap-2 whitespace-nowrap text-[#5f3c46]">
          <span className="material-icons text-lg text-[#bd8794]">
            person
          </span>
          {venta.usuario_nombre || "—"}
        </div>
      </td>

      {/* FECHA */}
      <td className="whitespace-nowrap p-4 text-[#8c6773]">
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
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${
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
      {ventasFiltradas.length > 0 && (
        <div className="flex flex-col items-center gap-4 border-t border-[#ead8d8] bg-[#fffaf8] px-5 py-4">

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPaginaActual((pagina) => Math.max(1, pagina - 1))
              }
              disabled={paginaActual === 1}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ead8d8] bg-white text-[#8b5e6b] transition hover:bg-[#fae4df] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t("ventas.paginacion.anterior")}
            >
              <span className="material-icons text-xl">
                chevron_left
              </span>
            </button>

            {Array.from({ length: totalPaginas }, (_, indice) => indice + 1)
              .filter(
                (pagina) =>
                  pagina === 1 ||
                  pagina === totalPaginas ||
                  Math.abs(pagina - paginaActual) <= 1
              )
              .reduce((elementos, pagina, indice, paginas) => {
                if (indice > 0 && pagina - paginas[indice - 1] > 1) {
                  elementos.push(
                    <span
                      key={`puntos-${pagina}`}
                      className="px-1 text-[#8c6773]"
                    >
                      …
                    </span>
                  );
                }

                elementos.push(
                  <button
                    key={pagina}
                    type="button"
                    onClick={() => setPaginaActual(pagina)}
                    aria-current={paginaActual === pagina ? "page" : undefined}
                    className={`h-9 min-w-9 rounded-xl border px-3 text-sm font-semibold transition ${
                      paginaActual === pagina
                        ? "border-[#d06b7d] bg-[#d06b7d] text-white"
                        : "border-[#ead8d8] bg-white text-[#8b5e6b] hover:bg-[#fae4df]"
                    }`}
                  >
                    {pagina}
                  </button>
                );

                return elementos;
              }, [])}

            <button
              type="button"
              onClick={() =>
                setPaginaActual((pagina) =>
                  Math.min(totalPaginas, pagina + 1)
                )
              }
              disabled={paginaActual === totalPaginas}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ead8d8] bg-white text-[#8b5e6b] transition hover:bg-[#fae4df] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t("ventas.paginacion.siguiente")}
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