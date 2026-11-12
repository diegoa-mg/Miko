import { useEffect, useState } from "react";
import { obtenerInventarios } from "../api/inventarios";
import { obtenerSucursales } from "../api/sucursales";
import { useTranslation } from "react-i18next";
import { Boxes } from "lucide-react";
import { crearFormatoMoneda } from "../api/formatoVentas";

function Inventarios() {
  const [inventarios, setInventarios] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const { t, i18n } = useTranslation();
  const formatoMoneda = crearFormatoMoneda(i18n.language);

  const productosPorPagina = 15;

  // Cargar las sucursales para el filtro
  useEffect(() => {
    const cargarSucursales = async () => {
      try {
        const data = await obtenerSucursales();
        setSucursales(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
      }
    };

    cargarSucursales();
  }, []);

  // Cargar inventario cuando cambia la sucursal
  useEffect(() => {
    cargarInventarios();
  }, [sucursalSeleccionada]);

  const cargarInventarios = async () => {
    try {
      setCargando(true);
      setError("");

      const sucursalId =
        sucursalSeleccionada && sucursalSeleccionada !== "inactivas"
          ? sucursalSeleccionada
          : null;

      const data = await obtenerInventarios(sucursalId);

      setInventarios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setError(
        error.response?.data?.detail ||
          t("inventarios.loadError")
      );
    } finally {
      setCargando(false);
    }
  };

  const inventariosFiltrados = inventarios.filter((inventario) =>
  inventario.producto_nombre
    ?.toLocaleLowerCase()
    .includes(busqueda.trim().toLocaleLowerCase())
);

const totalPaginas = Math.ceil(
  inventariosFiltrados.length / productosPorPagina
);

  useEffect(() => {
    if (totalPaginas > 0 && paginaActual > totalPaginas) {
      setPaginaActual(1);
    }
  }, [totalPaginas, paginaActual]);

  const indiceInicial = (paginaActual - 1) * productosPorPagina;
  const indiceFinal = indiceInicial + productosPorPagina;

  const inventariosPaginados = inventariosFiltrados.slice(
  indiceInicial,
  indiceFinal
);

  return (
    <div className="p-6">

      {/* Encabezado */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#fae4df] dark:bg-[var(--dark-border)]">
            <Boxes
              size={32}
              strokeWidth={1.8}
              className="text-[#d06b7d] dark:text-rose-300"
            />
          </div>

          <div>
            <h1 className="font-sans text-3xl sm:text-4xl font-bold text-[#8b5e6b] dark:text-rose-300">
              {t("inventarios.title")}
            </h1>

            <p className="font-sans text-lg text-[#5f4a50] dark:text-[var(--dark-muted)] mt-1">
              {t("inventarios.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Filtro */}
<div className="mb-8 w-full overflow-visible rounded-2xl bg-white dark:bg-[var(--dark-surface)] p-5 shadow-sm">
<div className="grid w-full grid-cols-1 items-end gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(450px,1.4fr)]">

    {/* Filtro por sucursal */}
<div className="min-w-0 w-full lg:col-span-1">
  <label
    htmlFor="filtro-sucursal"
    className="mb-2 block text-sm font-semibold text-[#5f3c46] dark:text-[var(--dark-text)]"
  >
    {t("inventarios.selectBranch")}
  </label>

  <select
    id="filtro-sucursal"
    value={sucursalSeleccionada}
    onChange={(e) => {
      setSucursalSeleccionada(e.target.value);
      setPaginaActual(1);
    }}
className="w-full h-10 rounded-xl border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-bg)] px-4 text-base text-[#8c6773] dark:text-[var(--dark-text)] shadow-sm focus:border-[#875d69] dark:focus:border-rose-300 focus:outline-none">
    <option value="">
      {t("inventarios.allBranches")}
    </option>

    <option value="inactivas">
      {t("inventarios.inactiveBranches")}
    </option>

    {sucursales.map((sucursal) => (
      <option key={sucursal.id} value={sucursal.id}>
        {sucursal.nombre}
      </option>
    ))}
  </select>
</div>

    {/* Buscador por nombre */}
    <div className="min-w-0">
  <label
    htmlFor="buscar-producto-inventario"
    className="mb-2 block text-sm font-semibold text-[#5f3c46] dark:text-[var(--dark-text)]"
  >
    {t("inventarios.searchLabel")}
  </label>

      <div className="relative">
        <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-[#a1818a] dark:text-[var(--dark-muted)]">
          search
        </span>

        <input
          id="buscar-producto-inventario"
          type="search"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPaginaActual(1);
          }}
          placeholder={t("inventarios.searchPlaceholder")}
          className="w-full h-10 rounded-xl border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-bg)] pl-12 pr-3 text-base text-[#8c6773] dark:text-[var(--dark-text)] shadow-sm transition placeholder:text-[#a1818a] dark:placeholder:text-[var(--dark-muted)] focus:border-[#875d69] dark:focus:border-rose-300 focus:outline-none"
        />
      </div>
    </div>

  </div>
</div>


      {/* Estado de carga */}
      {cargando && (
        <div className="rounded-2xl border border-[#ead8d8] dark:border-[var(--dark-border)] bg-white/70 dark:bg-[var(--dark-surface)] p-8 text-center shadow-sm">
          <p className="text-[#8c6773] dark:text-[var(--dark-muted)]">
            {t("inventarios.loading")}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-5 text-center">
          <p className="font-medium text-red-500 dark:text-red-400">
            {error}
          </p>
        </div>
      )}

      {/* Inventarios */}
      {!cargando &&
  !error &&
  inventarios.length > 0 &&
  inventariosFiltrados.length > 0 && (
        <div>
          {/* Resumen */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#5f3c46] dark:text-[var(--dark-text)]">
                {t("inventarios.stockTitle")}
              </h2>

              <p className="text-sm text-[#a1818a] dark:text-[var(--dark-muted)]">
                {t("inventarios.productCount", {
                  count: inventariosFiltrados.length,
                })}
              </p>
            </div>
          </div>

          {/* Tabla con paginación */}
          <section className="overflow-hidden rounded-2xl border border-[#ead8d8] dark:border-[var(--dark-border)] bg-white/80 dark:bg-[var(--dark-surface)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#ead8d8] dark:border-[var(--dark-border)] bg-[#fff8f8] dark:bg-[var(--dark-bg)]">
                    <th className="p-4 text-left text-sm font-semibold text-[#5f3c46] dark:text-[var(--dark-text)]">
                      {t("inventarios.product")}
                    </th>

                    <th className="p-4 text-left text-sm font-semibold text-[#5f3c46] dark:text-[var(--dark-text)]">
                      {t("inventarios.category")}
                    </th>

                    <th className="p-4 text-left text-sm font-semibold text-[#5f3c46] dark:text-[var(--dark-text)]">
                      {t("inventarios.price")}
                    </th>

                    <th className="p-4 text-left text-sm font-semibold text-[#5f3c46] dark:text-[var(--dark-text)]">
                      {t("inventarios.branch")}
                    </th>

                    <th className="p-4 text-center text-sm font-semibold text-[#5f3c46] dark:text-[var(--dark-text)]">
                      {t("inventarios.quantity")}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {inventariosPaginados.map((inventario) => (
                    <tr
                      key={`${inventario.sucursal_id}-${inventario.producto_id}`}
                      className="border-b border-[#f0e3e3] dark:border-[var(--dark-border)] last:border-b-0 transition-colors hover:bg-[#fff8f8] dark:hover:bg-white/5"
                    >
                      <td className="p-4">
                        <div className="font-semibold text-[#4f3b40] dark:text-[var(--dark-text)]">
                          {inventario.producto_nombre}
                        </div>
                      </td>

                      <td className="p-4 text-[#8c6773] dark:text-[var(--dark-muted)]">
                        {inventario.categoria_nombre}
                      </td>

                      <td className="p-4 text-[#8c6773] dark:text-[var(--dark-muted)]">
                        {formatoMoneda.format(Number(inventario.precio) || 0)}
                      </td>

                      <td className="p-4 text-[#8c6773] dark:text-[var(--dark-muted)]">
                        {inventario.sucursal_nombre}
                      </td>

                      <td className="p-4 text-center">
                        <span className="inline-flex min-w-12 justify-center rounded-full bg-[#f9eeb4] dark:bg-yellow-900/30 px-3 py-1.5 font-semibold text-[#70565e] dark:text-[var(--dark-text)]">
                          {inventario.existencia}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {inventarios.length > 0 && (
              <div className="flex flex-col items-center gap-4 border-t border-[#ead8d8] dark:border-[var(--dark-border)] bg-[#fffaf8] dark:bg-[var(--dark-bg)] px-5 py-4">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPaginaActual((pagina) => Math.max(1, pagina - 1))
                    }
                    disabled={paginaActual === 1}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ead8d8] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-surface)] text-[#8b5e6b] dark:text-[var(--dark-muted)] transition hover:bg-[#fae4df] dark:hover:bg-[var(--dark-border)] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={t("inventarios.paginacion.anterior")}
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
                            className="px-1 text-[#8c6773] dark:text-[var(--dark-muted)]"
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
                              ? "border-[#d06b7d] dark:border-rose-700 bg-[#d06b7d] dark:bg-rose-700 text-white"
                              : "border-[#ead8d8] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-surface)] text-[#8b5e6b] dark:text-[var(--dark-muted)] hover:bg-[#fae4df] dark:hover:bg-[var(--dark-border)]"
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
                    disabled={paginaActual === totalPaginas || totalPaginas === 0}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ead8d8] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-surface)] text-[#8b5e6b] dark:text-[var(--dark-muted)] transition hover:bg-[#fae4df] dark:hover:bg-[var(--dark-border)] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={t("inventarios.paginacion.siguiente")}
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
      )}

      {/* Sin inventarios */}
      {!cargando &&
  !error &&
  (inventarios.length === 0 || inventariosFiltrados.length === 0) && (
        <div className="rounded-2xl border border-[#ead8d8] dark:border-[var(--dark-border)] bg-white/70 dark:bg-[var(--dark-surface)] px-6 py-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff1f3] dark:bg-[var(--dark-border)]">
            <span className="text-2xl text-[#875d69] dark:text-rose-300">📦</span>
          </div>

          <h2 className="mb-2 text-lg font-semibold text-[#5f3c46] dark:text-[var(--dark-text)]">
            {t(
              inventarios.length === 0
                ? "inventarios.emptyTitle"
                : "inventarios.noSearchResults"
            )}
          </h2>

          <p className="mx-auto max-w-md text-sm text-[#9a7b84] dark:text-[var(--dark-muted)]">
            {t(
              inventarios.length === 0
                ? "inventarios.emptyDescription"
                : "inventarios.noSearchResultsDescription"
            )}
          </p>
        </div>
      )}
    </div>
  );
}

export default Inventarios;