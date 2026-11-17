import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { obtenerVentas, contarVentas } from "../api/ventas";
import Paginacion from "../components/Paginacion";
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
  const [totalVentas, setTotalVentas] = useState(0);
  const [montoTotal, setMontoTotal] = useState(0);
  const [errorCarga, setErrorCarga] = useState("");
  // Estados de los filtros personalizados
const [menuTipoAbierto, setMenuTipoAbierto] = useState(false);
const [menuSucursalAbierto, setMenuSucursalAbierto] = useState(false);
const [calendarioAbierto, setCalendarioAbierto] = useState(false);

const [mesCalendario, setMesCalendario] = useState(() => {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
});

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
      setTotalVentas(0);
      setMontoTotal(0);

      if (tipoSucursal !== "todas" && sucursalSeleccionada === "") {
      setCargando(false);
      return;
}

      try {
        const sucursalId =
          sucursalSeleccionada === "" ? null : Number(sucursalSeleccionada);
        const fechaInicio = fechaSeleccionada || null;
        const fechaFin = fechaSeleccionada || null;

        const [datosVentas, resumen] = await Promise.all([
          obtenerVentas(sucursalId, {
            limit: ventasPorPagina,
            offset: (paginaActual - 1) * ventasPorPagina,
            fechaInicio,
            fechaFin,
          }),
          contarVentas(sucursalId, { fechaInicio, fechaFin }),
        ]);

        if (cancelado) return;

        setTotalVentas(resumen.total);
        setMontoTotal(resumen.montoTotal);
        setVentas(Array.isArray(datosVentas) ? datosVentas : []);
      } catch (error) {
        console.error("Error al cargar ventas:", error);
        if (!cancelado) {
          setVentas([]);
          setTotalVentas(0);
          setMontoTotal(0);
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

  const totalPaginas = Math.max(1, Math.ceil(totalVentas / ventasPorPagina));

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

// Configuración del calendario personalizado
const locale = i18n.language?.startsWith("en") ? "en-US" : "es-MX";

const diasSemana = i18n.language?.startsWith("en")
  ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  : ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const primerDiaMes = new Date(
  mesCalendario.getFullYear(),
  mesCalendario.getMonth(),
  1
);

const desplazamiento = (primerDiaMes.getDay() + 6) % 7;

const inicioCalendario = new Date(
  mesCalendario.getFullYear(),
  mesCalendario.getMonth(),
  1 - desplazamiento
);

const diasCalendario = Array.from({ length: 42 }, (_, i) => {
  return new Date(
    inicioCalendario.getFullYear(),
    inicioCalendario.getMonth(),
    inicioCalendario.getDate() + i
  );
});

const formatearFechaISO = (fecha) => {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${año}-${mes}-${dia}`;
};

const sucursalesFiltradas =
  tipoSucursal === "activas"
    ? sucursalesActivas
    : sucursalesInactivas;

const nombreSucursalSeleccionada = sucursalesFiltradas.find(
  (s) => String(s.id) === String(sucursalSeleccionada)
)?.nombre;


  return (
    <div className="min-h-screen bg-[#fdf6e9] dark:bg-[var(--dark-bg)] p-4 sm:p-6 lg:p-8">

      {/* ENCABEZADO */}
      <div className="mb-6">
       <div className="flex items-center gap-3 sm:gap-4">

          <div className="flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-[#fae4df] dark:bg-[var(--dark-border)]">
            <span className="material-icons text-3xl text-[#d06b7d] dark:text-rose-300">
              trending_up
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#8b5e6b] dark:text-rose-300">
             {t("ventas.titulo")}
            </h1>

            
            <p className="mt-1 text-lg text-[#5f4a50] dark:text-[var(--dark-muted)]">
              {t("ventas.descripcion")}
            </p>
          </div>

        </div>
      </div>

      

{/* FILTROS DE VENTAS */}
<section className="mb-6 min-w-0 rounded-3xl border border-[#ead8d8] dark:border-[var(--dark-border)] bg-white/80 dark:bg-[var(--dark-surface)] p-4 sm:p-6 shadow-sm">

  <h2 className="mb-6 text-xl font-bold text-[#5f3c46] dark:text-[var(--dark-text)]">
    {t("ventas.filtrarVentas")}
  </h2>

  <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">

    {/* FILTRO POR SUCURSAL */}
    <div className="min-w-0">

      <label className="mb-3 block text-sm font-semibold text-[#5f3c46] dark:text-[var(--dark-text)]">
        {t("ventas.filtroTitulo")}
      </label>

      {/* Tipo de sucursal */}
      <div className="relative w-full min-w-0">

        <button
          type="button"
          onClick={() => {
            setMenuTipoAbierto((prev) => !prev);
            setMenuSucursalAbierto(false);
            setCalendarioAbierto(false);
          }}
          aria-expanded={menuTipoAbierto}
          className="flex h-[52px] w-full min-w-0 items-center justify-between gap-2 rounded-full border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-bg)] px-5 text-sm text-[#8c6773] dark:text-[var(--dark-text)] outline-none transition"
        >
          <span className="truncate">
            {tipoSucursal === "todas"
              ? t("ventas.todasSucursales")
              : tipoSucursal === "activas"
                ? t("ventas.sucursalesActivas")
                : t("ventas.sucursalesInactivas")}
          </span>

          <span className="material-icons shrink-0">
            {menuTipoAbierto
              ? "keyboard_arrow_up"
              : "keyboard_arrow_down"}
          </span>
        </button>

        {menuTipoAbierto && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-52 w-full overflow-y-auto rounded-2xl border border-[#e6bdc7] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-surface)] shadow-xl">

            {[
              { value: "todas", label: t("ventas.todasSucursales") },
              { value: "activas", label: t("ventas.sucursalesActivas") },
              { value: "inactivas", label: t("ventas.sucursalesInactivas") },
            ].map((opcion) => (
              <button
                key={opcion.value}
                type="button"
                onClick={() => {
                  setTipoSucursal(opcion.value);
                  setSucursalSeleccionada("");
                  setPaginaActual(1);
                  setMenuTipoAbierto(false);
                }}
                className={`block w-full break-words px-5 py-3 text-left text-sm transition-colors hover:bg-[#fae4df] dark:hover:bg-[var(--dark-border)] ${
                  tipoSucursal === opcion.value
                    ? "bg-[#fae4df] dark:bg-[var(--dark-border)] font-semibold text-[#875d69] dark:text-rose-300"
                    : "text-[#8c6773] dark:text-[var(--dark-text)]"
                }`}
              >
                {opcion.label}
              </button>
            ))}

          </div>
        )}
      </div>

      {/* Seleccionar sucursal */}
      {tipoSucursal !== "todas" && (
        <div className="relative mt-3 w-full min-w-0">

          <button
            type="button"
            onClick={() => {
              setMenuSucursalAbierto((prev) => !prev);
              setMenuTipoAbierto(false);
              setCalendarioAbierto(false);
            }}
            aria-expanded={menuSucursalAbierto}
            className="flex h-[52px] w-full min-w-0 items-center justify-between gap-2 rounded-full border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-bg)] px-5 text-sm text-[#8c6773] dark:text-[var(--dark-text)]"
          >
            <span className="truncate">
              {nombreSucursalSeleccionada ||
                t("ventas.seleccionarSucursal")}
            </span>

            <span className="material-icons shrink-0">
              {menuSucursalAbierto
                ? "keyboard_arrow_up"
                : "keyboard_arrow_down"}
            </span>
          </button>

          {menuSucursalAbierto && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-52 w-full overflow-y-auto rounded-2xl border border-[#e6bdc7] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-surface)] shadow-xl">

              <button
                type="button"
                onClick={() => {
                  setSucursalSeleccionada("");
                  setPaginaActual(1);
                  setMenuSucursalAbierto(false);
                }}
                className="block w-full px-5 py-3 text-left text-sm text-[#8c6773] dark:text-[var(--dark-text)] hover:bg-[#fae4df] dark:hover:bg-[var(--dark-border)]"
              >
                {t("ventas.seleccionarSucursal")}
              </button>

              {sucursalesFiltradas.map((sucursal) => (
                <button
                  key={sucursal.id}
                  type="button"
                  onClick={() => {
                    setSucursalSeleccionada(String(sucursal.id));
                    setPaginaActual(1);
                    setMenuSucursalAbierto(false);
                  }}
                  className={`block w-full break-words px-5 py-3 text-left text-sm hover:bg-[#fae4df] dark:hover:bg-[var(--dark-border)] ${
                    String(sucursalSeleccionada) === String(sucursal.id)
                      ? "bg-[#fae4df] dark:bg-[var(--dark-border)] font-semibold text-[#875d69] dark:text-rose-300"
                      : "text-[#8c6773] dark:text-[var(--dark-text)]"
                  }`}
                >
                  {sucursal.nombre}
                </button>
              ))}

            </div>
          )}
        </div>
      )}

    </div>

    {/* FILTRO POR FECHA */}
    <div className="min-w-0">

      <label className="mb-3 block text-sm font-semibold text-[#5f3c46] dark:text-[var(--dark-text)]">
        {t("ventas.filtrarPorFecha")}
      </label>

      <div className="relative w-full min-w-0">

        <button
          type="button"
          onClick={() => {
            const fechaBase = fechaSeleccionada
              ? new Date(`${fechaSeleccionada}T12:00:00`)
              : new Date();

            setMesCalendario(
              new Date(
                fechaBase.getFullYear(),
                fechaBase.getMonth(),
                1
              )
            );

            setCalendarioAbierto((prev) => !prev);
            setMenuTipoAbierto(false);
            setMenuSucursalAbierto(false);
          }}
          aria-expanded={calendarioAbierto}
          className="flex h-[52px] w-full min-w-0 items-center justify-between gap-2 rounded-full border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-bg)] px-5 text-sm text-[#8c6773] dark:text-[var(--dark-text)]"
        >
          <span>
            {fechaSeleccionada
              ? new Date(`${fechaSeleccionada}T12:00:00`).toLocaleDateString(locale)
              : "dd/mm/aaaa"}
          </span>

          <span className="material-icons shrink-0">
            calendar_today
          </span>
        </button>

        {/* CALENDARIO PERSONALIZADO */}
        {calendarioAbierto && (
          <div className="absolute left-0 right-0 top-full z-[60] mt-2 w-full min-w-0 rounded-2xl border border-[#e6bdc7] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-surface)] p-3 shadow-xl">

            {/* Mes y navegación */}
            <div className="mb-4 flex items-center justify-between gap-2">

              <span className="min-w-0 truncate text-sm font-bold capitalize text-[#875d69] dark:text-rose-300">
                {mesCalendario.toLocaleDateString(locale, {
                  month: "long",
                  year: "numeric",
                })}
              </span>

              <div className="flex shrink-0 gap-1">

                <button
                  type="button"
                  aria-label="Mes anterior"
                  onClick={() =>
                    setMesCalendario(
                      (prev) =>
                        new Date(
                          prev.getFullYear(),
                          prev.getMonth() - 1,
                          1
                        )
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#875d69] hover:bg-[#fae4df] dark:text-rose-300 dark:hover:bg-[var(--dark-border)]"
                >
                  <span className="material-icons">
                    chevron_left
                  </span>
                </button>

                <button
                  type="button"
                  aria-label="Mes siguiente"
                  onClick={() =>
                    setMesCalendario(
                      (prev) =>
                        new Date(
                          prev.getFullYear(),
                          prev.getMonth() + 1,
                          1
                        )
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#875d69] hover:bg-[#fae4df] dark:text-rose-300 dark:hover:bg-[var(--dark-border)]"
                >
                  <span className="material-icons">
                    chevron_right
                  </span>
                </button>

              </div>
            </div>

            {/* Días de la semana */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {diasSemana.map((dia) => (
                <div
                  key={dia}
                  className="py-1 text-center text-xs font-semibold text-[#9b7b84] dark:text-[var(--dark-muted)]"
                >
                  {dia}
                </div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7 gap-1">

              {diasCalendario.map((dia) => {
                const fechaISO = formatearFechaISO(dia);
                const esMesActual =
                  dia.getMonth() === mesCalendario.getMonth();

                const seleccionado =
                  fechaSeleccionada === fechaISO;

                return (
                  <button
                    key={fechaISO}
                    type="button"
                    onClick={() => {
                      setFechaSeleccionada(fechaISO);
                      setPaginaActual(1);
                      setCalendarioAbierto(false);
                    }}
                    className={`flex aspect-square min-w-0 items-center justify-center rounded-full text-xs transition-colors ${
                      seleccionado
                        ? "bg-rose-800 text-white font-bold dark:bg-rose-700"
                        : esMesActual
                          ? "text-[#5f3c46] hover:bg-[#fae4df] dark:text-[var(--dark-text)] dark:hover:bg-[var(--dark-border)]"
                          : "text-gray-300 dark:text-gray-600 hover:bg-[#fae4df] dark:hover:bg-[var(--dark-border)]"
                    }`}
                  >
                    {dia.getDate()}
                  </button>
                );
              })}

            </div>

            {/* Acciones */}
            <div className="mt-3 flex justify-between border-t border-[#ead8d8] dark:border-[var(--dark-border)] pt-3">

              <button
                type="button"
                onClick={() => {
                  setFechaSeleccionada("");
                  setPaginaActual(1);
                  setCalendarioAbierto(false);
                }}
                className="text-sm font-medium text-[#b6536b] dark:text-rose-300"
              >
                {t("ventas.limpiarFiltros")}
              </button>

              <button
                type="button"
                onClick={() => {
                  const hoy = new Date();
                  setFechaSeleccionada(formatearFechaISO(hoy));
                  setMesCalendario(
                    new Date(hoy.getFullYear(), hoy.getMonth(), 1)
                  );
                  setPaginaActual(1);
                  setCalendarioAbierto(false);
                }}
                className="text-sm font-medium text-[#875d69] dark:text-rose-300"
              >
                {i18n.language?.startsWith("en") ? "Today" : "Hoy"}
              </button>

            </div>
          </div>
        )}

      </div>
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
      className="mt-6 rounded-full px-4 py-2 text-sm font-semibold text-[#b6536b] dark:text-rose-300 transition hover:bg-[#fff1f3] dark:hover:bg-white/5"
    >
      {t("ventas.limpiarFiltros")}
    </button>
  )}

</section>


      {/* RESUMEN */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">

        {/* VENTAS REGISTRADAS */}
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
                {totalVentas}
              </p>
            </div>

          </div>

        </div>

        {/* TOTAL VENDIDO */}
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
                {formatearPrecio(montoTotal)}
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* TABLA DE VENTAS */}
      <section className="overflow-hidden rounded-3xl border border-[#ead8d8] dark:border-[var(--dark-border)] bg-white/80 dark:bg-[var(--dark-surface)] shadow-sm">

        {/* ENCABEZADO DE LA TABLA */}
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
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-[#8c6773] dark:text-[var(--dark-muted)]" role="status">
            <span className="material-icons animate-spin text-4xl text-[#d06b7d] dark:text-rose-300">
              progress_activity
            </span>
            <p className="font-medium">{t("ventas.cargando")}</p>
          </div>
        ) : errorCarga ? (
          <div className="px-6 py-12 text-center text-sm font-medium text-[#a34b5d] dark:text-rose-300">
            {errorCarga}
          </div>
        ) : ventas.length > 0 ? (

          <div className="w-full overflow-x-auto">

        <table className="w-full min-w-[620px] table-auto">

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
  {ventas.map((venta) => (
    <tr
      key={venta.id}
      className="border-b border-[#f0e3e3] dark:border-[var(--dark-border)] last:border-b-0 transition-colors hover:bg-[#fff5f6] dark:hover:bg-white/5"
    >
      {/* VENTA */}
    <td className="p-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#fae4df] dark:bg-[var(--dark-border)] px-3 py-1 text-sm font-semibold text-[#8b5e6b] dark:text-[var(--dark-muted)]">
          <span className="material-icons text-base text-[#d06b7d] dark:text-rose-300">
            receipt
          </span>
          #{venta.id}
        </span>
      </td>

      {/* SUCURSAL */}
      <td className="p-4 font-medium text-[#5f3c46] dark:text-[var(--dark-text)]">
        {venta.sucursal_nombre}
      </td>

      {/* CAJERO */}
      <td className="p-4">
        <div className="flex min-w-0 items-center gap-2 break-words text-[#5f3c46] dark:text-[var(--dark-text)]">
          <span className="material-icons text-lg text-[#bd8794] dark:text-[var(--dark-muted)]">
            person
          </span>
          {venta.usuario_nombre || "—"}
        </div>
      </td>

      {/* FECHA */}
     <td className="p-3 text-sm leading-5 text-[#8c6773] dark:text-[var(--dark-muted)] break-words">
        {formatearFecha(venta.fecha)}
      </td>

      {/* MÉTODO DE PAGO */}
  <td className="p-4">
        {(() => {
          const estilosPago = {
            Efectivo: "bg-[#e4f3e6] dark:bg-green-900/40 text-[#42784b] dark:text-green-300",
            Tarjeta: "bg-[#e4edf9] dark:bg-blue-900/40 text-[#456b9a] dark:text-blue-300",
            Transferencia: "bg-[#f9eeb4] dark:bg-yellow-900/30 text-[#8b7431] dark:text-yellow-300",
          };

          return (
            <span
              className={`inline-flex w-max flex-nowrap whitespace-nowrap items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold ${
                estilosPago[venta.metodo_pago_nombre] ||
                "bg-[#fae4df] dark:bg-[var(--dark-border)] text-[#8b5e6b] dark:text-[var(--dark-muted)]"
              }`}
            >
              <span className="material-icons shrink-0 text-base">
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
        <span className="font-bold text-[#c94f68] dark:text-rose-300">
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

export default Ventas;