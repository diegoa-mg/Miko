import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  obtenerInventarioMiSucursal,
  actualizarExistencias,
} from "../api/inventarios";

function InventarioGerente() {
  const { t } = useTranslation();

  const [inventario, setInventario] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [errorAccion, setErrorAccion] = useState("");
  const [buscar, setBuscar] = useState("");

  // Cantidad escrita en cada fila (producto_id -> texto del input)
  const [cantidades, setCantidades] = useState({});
  // producto_id que se está actualizando (para deshabilitar sus botones)
  const [guardando, setGuardando] = useState(null);

  // El backend puede mandar `detail` como texto o, en un 422, como arreglo;
  // solo se muestra si es texto (renderizar un arreglo rompería la página).
  const mensajeError = (err, textoPorDefecto) => {
    const detalle = err?.response?.data?.detail;
    return typeof detalle === "string" ? detalle : textoPorDefecto;
  };

  useEffect(() => {
    const cargarInventario = async () => {
      try {
        setCargando(true);
        setError("");
        const data = await obtenerInventarioMiSucursal();
        setInventario(data);
      } catch (err) {
        console.error("Error al cargar el inventario:", err);
        setError(
          mensajeError(
            err,
            t("inventarioGerente.errorCarga", "No se pudo cargar el inventario.")
          )
        );
      } finally {
        setCargando(false);
      }
    };

    cargarInventario();
  }, []);

  // signo: 1 para agregar existencias, -1 para restar
  const ajustar = async (fila, signo) => {
    const cantidad = Number(cantidades[fila.producto_id] ?? "1");

    if (!Number.isInteger(cantidad) || cantidad < 1) {
      setErrorAccion(
        t(
          "inventarioGerente.cantidadInvalida",
          "Escribe una cantidad entera mayor a 0."
        )
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
        prev.map((f) =>
          f.producto_id === fila.producto_id ? { ...f, ...actualizado } : f
        )
      );
    } catch (err) {
      console.error("Error al actualizar la existencia:", err);
      setErrorAccion(
        mensajeError(
          err,
          t(
            "inventarioGerente.errorActualizar",
            "No se pudo actualizar la existencia."
          )
        )
      );
    } finally {
      setGuardando(null);
    }
  };

  const inventarioFiltrado = inventario.filter((fila) => {
    const texto = buscar.toLowerCase();
    return (
      fila.producto_nombre?.toLowerCase().includes(texto) ||
      fila.categoria_nombre?.toLowerCase().includes(texto)
    );
  });

  return (
    <div className="min-h-screen bg-[#fdf6e3] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="mb-6 sm:mb-8">
          <h1 className="font-sans text-2xl sm:text-3xl font-bold text-[#875d69]">
            {t("inventarioGerente.titulo", "Inventario")}
          </h1>
          <p className="font-sans text-gray-600 mt-1">
            {t(
              "inventarioGerente.descripcion",
              "Consulta y ajusta las existencias de tu sucursal."
            )}
          </p>
        </div>

        {/* Error al ajustar una existencia */}
        {errorAccion && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6">
            {errorAccion}
          </div>
        )}

        {cargando ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <p className="font-sans text-gray-500">
              {t("inventarioGerente.cargando", "Cargando inventario...")}
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
            <p className="font-medium text-red-500">{error}</p>
          </div>
        ) : inventario.length === 0 ? (
          <div className="rounded-2xl border border-[#ead8d8] bg-white/70 px-6 py-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff1f3]">
              <span className="material-icons text-2xl text-[#875d69]">
                inventory_2
              </span>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-[#5f3c46]">
              {t("inventarioGerente.sinExistencias", "Sin existencias registradas")}
            </h2>
            <p className="mx-auto max-w-md text-sm text-[#9a7b84]">
              {t(
                "inventarioGerente.sinExistenciasDetalle",
                "No hay productos registrados en el inventario de tu sucursal."
              )}
            </p>
          </div>
        ) : (
          <>
            {/* Barra superior: total + búsqueda */}
            <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <p className="font-sans text-sm text-[#875d69] font-medium">
                  {t("inventarioGerente.totalProductos", {
                    count: inventario.length,
                    defaultValue: "Productos registrados: {{count}}",
                  })}
                </p>
                <div className="w-full sm:w-80">
                  <input
                    type="text"
                    value={buscar}
                    onChange={(e) => setBuscar(e.target.value)}
                    placeholder={t(
                      "inventarioGerente.buscar",
                      "Buscar producto..."
                    )}
                    className="font-sans w-full rounded-full border-2 border-[#ead8d8] bg-[#fffaf2] px-5 py-3 text-[#875d69] focus:outline-none focus:border-[#cda4b4]"
                  />
                </div>
              </div>
            </div>

            {inventarioFiltrado.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
                <p className="font-sans text-gray-500">
                  {t(
                    "inventarioGerente.sinResultados",
                    "No se encontraron productos"
                  )}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[#ead8d8] bg-white/80 shadow-sm">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-[#ead8d8] bg-[#fff8f8]">
                      <th className="p-4 text-left text-sm font-semibold text-[#5f3c46]">
                        {t("inventarioGerente.producto", "Producto")}
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-[#5f3c46]">
                        {t("inventarioGerente.categoria", "Categoría")}
                      </th>
                      <th className="p-4 text-center text-sm font-semibold text-[#5f3c46]">
                        {t("inventarioGerente.existencia", "Existencia")}
                      </th>
                      <th className="p-4 text-center text-sm font-semibold text-[#5f3c46]">
                        {t("inventarioGerente.ajustar", "Ajustar")}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {inventarioFiltrado.map((fila) => {
                      const ocupado = guardando === fila.producto_id;
                      return (
                        <tr
                          key={`${fila.sucursal_id}-${fila.producto_id}`}
                          className="border-b border-[#f0e3e3] last:border-b-0 transition-colors hover:bg-[#fff8f8]"
                        >
                          <td className="p-4 font-semibold text-[#4f3b40]">
                            {fila.producto_nombre}
                          </td>

                          <td className="p-4 text-[#8c6773]">
                            {fila.categoria_nombre}
                          </td>

                          <td className="p-4 text-center">
                            <span className="inline-flex min-w-12 justify-center rounded-full bg-[#f9eeb4] px-3 py-1.5 font-semibold text-[#70565e]">
                              {fila.existencia}
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
                                aria-label={t(
                                  "inventarioGerente.cantidad",
                                  "Cantidad"
                                )}
                                className="font-sans w-20 rounded-xl border-2 border-[#ead8d8] bg-white px-3 py-2 text-center text-[#875d69] focus:outline-none focus:border-[#cda4b4]"
                              />
                              <button
                                type="button"
                                disabled={ocupado}
                                onClick={() => ajustar(fila, -1)}
                                className="font-sans rounded-xl border-2 border-[#ead8d8] bg-white px-3 py-2 text-sm text-[#875d69] transition-colors hover:bg-[#fff4ed] disabled:opacity-50"
                              >
                                − {t("inventarioGerente.restar", "Restar")}
                              </button>
                              <button
                                type="button"
                                disabled={ocupado}
                                onClick={() => ajustar(fila, 1)}
                                className="font-sans rounded-xl bg-rose-800 px-3 py-2 text-sm text-white transition-colors hover:bg-rose-900 disabled:opacity-50"
                              >
                                + {t("inventarioGerente.agregar", "Agregar")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default InventarioGerente;