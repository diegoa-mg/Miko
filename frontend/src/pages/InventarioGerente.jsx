import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  obtenerInventarioMiSucursal,
  actualizarExistencias,
} from "../api/inventarios";

const PRODUCTOS_POR_PAGINA = 16;

function InventarioGerente() {
  const { t, i18n } = useTranslation();

  const [inventario, setInventario] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [errorAccion, setErrorAccion] = useState("");
  const [buscar, setBuscar] = useState("");
  const [cantidades, setCantidades] = useState({});
  const [guardando, setGuardando] = useState(null);
  const [paginaActual, setPaginaActual] = useState(1);

  const tr = (clave, fallback, opciones = {}) =>
    t(`inventarioGerente.${clave}`, {
      defaultValue: fallback,
      ...opciones,
    });

  const mensajeErrorCarga = (err) => {
    const status = err?.response?.status;

    if (status === 401) {
      return tr("sesionExpirada", "Tu sesión ha expirado. Inicia sesión nuevamente.");
    }
    if (status === 403) {
      return tr("sinPermiso", "No tienes permisos para consultar este inventario.");
    }

    return tr("errorCarga", "No se pudo cargar el inventario.");
  };

  const mensajeErrorActualizacion = (err) => {
    const status = err?.response?.status;
    const detalle = err?.response?.data?.detail;
    const idiomaIngles = i18n.language?.startsWith("en");

    if (status === 401) {
      return tr("sesionExpirada", "Tu sesión ha expirado. Inicia sesión nuevamente.");
    }

    if (status === 403) {
      return tr("sinPermiso", "No tienes permisos para realizar esta acción.");
    }

    if (status === 404) {
      return tr(
        "productoNoEncontrado",
        "El producto no existe en el inventario de tu sucursal."
      );
    }

    if (status === 400 && typeof detalle === "string") {
      const disponible = detalle.match(/Disponible:\s*(\d+)/i);
      if (disponible) {
        return tr(
        "existenciaInsuficiente",
        "Existencias insuficientes. Disponibles: {{count}}.",
        { count: disponible[1] }
      );
      }

      return tr(
        "existenciaInsuficienteGenerica",
        "No hay existencias suficientes para realizar el ajuste."
      );
    }

    if (status === 422) {
      return tr(
        "cantidadInvalida",
        "Ingresa una cantidad entera distinta de cero."
      );
    }

    return tr("errorActualizar", "No se pudo actualizar la existencia.");
  };

  useEffect(() => {
    let activo = true;

    const cargarInventario = async () => {
      try {
        setCargando(true);
        setError("");

        const data = await obtenerInventarioMiSucursal();

        if (activo) {
          setInventario(data);
        }
      } catch (err) {
        console.error("Error al cargar el inventario:", err);
        if (activo) setError(mensajeErrorCarga(err));
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargarInventario();

    return () => {
      activo = false;
    };
  }, [i18n.language]);

  const inventarioFiltrado = inventario.filter((fila) => {
    const texto = buscar.trim().toLocaleLowerCase();

    return (
      fila.producto_nombre?.toLocaleLowerCase().includes(texto) ||
      fila.categoria_nombre?.toLocaleLowerCase().includes(texto)
    );
  });

  const totalPaginas = Math.ceil(
    inventarioFiltrado.length / PRODUCTOS_POR_PAGINA
  );

  const indiceInicial = (paginaActual - 1) * PRODUCTOS_POR_PAGINA;
  const inventarioPaginado = inventarioFiltrado.slice(
    indiceInicial,
    indiceInicial + PRODUCTOS_POR_PAGINA
  );

  const cambiarBusqueda = (valor) => {
    setBuscar(valor);
    setPaginaActual(1);
    setErrorAccion("");
  };

  const cambiarPagina = (pagina) => {
    setPaginaActual(Math.min(Math.max(pagina, 1), totalPaginas));
  };

  const ajustar = async (fila, signo) => {
    const valor = cantidades[fila.producto_id] ?? "1";
    const cantidad = Number(valor);

    if (
      valor === "" ||
      !Number.isInteger(cantidad) ||
      cantidad < 1
    ) {
      setErrorAccion(
        tr("cantidadInvalida", "Ingresa una cantidad entera mayor que cero.")
      );
      return;
    }

    try {
      setErrorAccion("");
      setGuardando(fila.producto_id);

      const actualizado = await actualizarExistencias(
        fila.producto_id,
        signo * cantidad
      );

      setInventario((prev) =>
        prev.map((producto) =>
          producto.producto_id === fila.producto_id
            ? { ...producto, ...actualizado }
            : producto
        )
      );
    } catch (err) {
      console.error("Error al actualizar la existencia:", err);
      setErrorAccion(mensajeErrorActualizacion(err));
    } finally {
      setGuardando(null);
    }
  };

  const numero = (valor) =>
    new Intl.NumberFormat(
      i18n.language?.startsWith("en") ? "en-US" : "es-MX"
    ).format(valor);

  return (
    <div className="min-h-screen bg-[#fdf6e3] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Encabezado */}
        <header className="mb-7">
          <h1 className="font-sans text-2xl font-bold text-[#875d69] sm:text-3xl">
            {tr("titulo", "Inventario")}
          </h1>
          <p className="mt-2 font-sans text-sm text-[#203a5f] sm:text-base">
            {tr(
              "descripcion",
              "Consulta y ajusta las existencias de tu sucursal."
            )}
          </p>
        </header>

        {/* Mensaje de error al ajustar */}
        {errorAccion && (
          <div
            role="alert"
            className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <p>{errorAccion}</p>
            <button
              type="button"
              onClick={() => setErrorAccion("")}
              aria-label={tr("cerrar", "Cerrar")}
              className="font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Cargando */}
        {cargando ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-[#ead8d8] border-t-[#875d69]" />
            <p className="text-sm text-[#203a5f]">
              {tr("cargando", "Cargando inventario...")}
            </p>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm"
          >
            <p className="mb-4 text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-[#875d69] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#704653]"
            >
              {tr("reintentar", "Reintentar")}
            </button>
          </div>
        ) : inventario.length === 0 ? (
          <div className="rounded-2xl border border-[#ead8d8] bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff1f3] text-2xl text-[#875d69]">
              <span className="material-icons">inventory_2</span>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-[#5f3c46]">
              {tr("sinExistencias", "Sin productos registrados")}
            </h2>
            <p className="mx-auto max-w-md text-sm text-[#203a5f]">
              {tr(
                "sinExistenciasDetalle",
                "No hay productos registrados en el inventario de tu sucursal."
              )}
            </p>
          </div>
        ) : (
          <>
            {/* Resumen y búsqueda */}
            <section className="mb-5 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-[#5f3c46]">
                    {tr("resumen", "Resumen del inventario")}
                  </p>
                  <p className="mt-1 text-sm text-[#203a5f]">
                    {tr("totalProductos", "Productos registrados: {{count}}", {
                      count: numero(inventario.length),
                    })}
                  </p>
                </div>

                <div className="w-full sm:max-w-sm">
                  <label
                    htmlFor="buscar-inventario-gerente"
                    className="mb-1.5 block text-sm font-medium text-[#5f3c46]"
                  >
                    {tr("etiquetaBuscar", "Buscar producto")}
                  </label>
                  <input
                    id="buscar-inventario-gerente"
                    type="search"
                    value={buscar}
                    onChange={(e) => cambiarBusqueda(e.target.value)}
                    placeholder={tr("buscar", "Buscar por producto o categoría...")}
                    className="w-full rounded-xl border border-[#ead8d8] bg-[#fffaf2] px-4 py-3 text-sm text-[#5f3c46] outline-none transition placeholder:text-[#a1818a] focus:border-[#875d69] focus:ring-2 focus:ring-[#ead8d8]"
                  />
                </div>
              </div>
            </section>

            {/* Sin resultados */}
            {inventarioFiltrado.length === 0 ? (
              <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                <p className="font-medium text-[#5f3c46]">
                  {tr("sinResultados", "No se encontraron productos.")}
                </p>
                <button
                  type="button"
                  onClick={() => cambiarBusqueda("")}
                  className="mt-3 text-sm font-semibold text-[#875d69] underline underline-offset-4"
                >
                  {tr("limpiarBusqueda", "Limpiar búsqueda")}
                </button>
              </div>
            ) : (
              <>
                {/* Tabla */}
                <div className="overflow-x-auto rounded-2xl border border-[#ead8d8] bg-white shadow-sm">
                  <table className="w-full min-w-[760px]">
                    <thead>
                      <tr className="border-b border-[#ead8d8] bg-[#fff8f8]">
                        <th className="p-4 text-left text-sm font-semibold text-[#5f3c46]">
                          {tr("producto", "Producto")}
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-[#5f3c46]">
                          {tr("categoria", "Categoría")}
                        </th>
                        <th className="p-4 text-center text-sm font-semibold text-[#5f3c46]">
                          {tr("existencia", "Existencia")}
                        </th>
                        <th className="p-4 text-center text-sm font-semibold text-[#5f3c46]">
                          {tr("ajustar", "Ajustar existencias")}
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {inventarioPaginado.map((fila) => {
                        const ocupado = guardando === fila.producto_id;

                        return (
                          <tr
                            key={`${fila.sucursal_id}-${fila.producto_id}`}
                            className="border-b border-[#f0e3e3] last:border-b-0 transition-colors hover:bg-[#fffaf7]"
                          >
                            <td className="p-4 font-semibold text-[#4f3b40]">
                              {fila.producto_nombre}
                            </td>

                            <td className="p-4 text-sm text-[#8c6773]">
                              {fila.categoria_nombre}
                            </td>

                            <td className="p-4 text-center">
                              <span className="inline-flex min-w-12 justify-center rounded-full bg-[#f9eeb4] px-3 py-1.5 font-semibold text-[#70565e]">
                                {numero(fila.existencia)}
                              </span>
                            </td>

                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={cantidades[fila.producto_id] ?? "1"}
                                  onChange={(e) =>
                                    setCantidades((prev) => ({
                                      ...prev,
                                      [fila.producto_id]: e.target.value,
                                    }))
                                  }
                                  aria-label={tr(
                                    "cantidad",
                                    "Cantidad"
                                  )}
                                  disabled={ocupado}
                                  className="w-20 rounded-lg border border-[#ead8d8] bg-white px-2 py-2 text-center text-sm text-[#875d69] outline-none focus:border-[#875d69] focus:ring-2 focus:ring-[#ead8d8] disabled:opacity-50"
                                />

                                <button
                                  type="button"
                                  disabled={ocupado}
                                  onClick={() => ajustar(fila, -1)}
                                  className="rounded-lg border border-[#ead8d8] bg-white px-3 py-2 text-sm font-semibold text-[#875d69] transition hover:bg-[#fff1f3] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {ocupado
                                    ? "..."
                                    : `− ${tr("restar", "Restar")}`}
                                </button>

                                <button
                                  type="button"
                                  disabled={ocupado}
                                  onClick={() => ajustar(fila, 1)}
                                  className="rounded-lg bg-[#875d69] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#704653] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {ocupado
                                    ? "..."
                                    : `+ ${tr("agregar", "Agregar")}`}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                <div className="mt-5 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  
<div className="flex items-center justify-center gap-3">
  {/* Página anterior */}
  <button
    type="button"
    disabled={paginaActual === 1}
    onClick={() => cambiarPagina(paginaActual - 1)}
    aria-label={tr("anterior", "Anterior")}
    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f0d6dc] bg-white text-[#875d69] transition hover:bg-[#fff1f3] disabled:cursor-not-allowed disabled:opacity-40"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  </button>

  
{/* Números de página */}
{Array.from({ length: totalPaginas }, (_, i) => i + 1)
  .filter((pagina) => {
    if (totalPaginas <= 3) return true;
    if (pagina === 1 || pagina === totalPaginas) return true;
    if (pagina === paginaActual) return true;
    if (pagina === paginaActual - 1) return true;
    if (pagina === paginaActual + 1) return true;
    return false;
  })
  .reduce((elementos, pagina, indice, paginas) => {
    if (indice > 0 && pagina - paginas[indice - 1] > 1) {
      elementos.push(
        <span
          key={`puntos-${pagina}`}
          className="flex h-9 w-8 items-center justify-center text-[#8b5e6b]"
        >
          …
        </span>
      );
    }

    elementos.push(
      <button
        key={pagina}
        type="button"
        onClick={() => cambiarPagina(pagina)}
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


                  {/* Página siguiente */}
                  <button
                    type="button"
                    disabled={paginaActual >= totalPaginas}
                    onClick={() => cambiarPagina(paginaActual + 1)}
                    aria-label={tr("siguiente", "Siguiente")}
                   className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ead8d8] bg-white text-[#8b5e6b] transition hover:bg-[#fae4df] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>

                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default InventarioGerente;
