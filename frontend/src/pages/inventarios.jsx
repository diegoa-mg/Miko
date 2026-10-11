import { useEffect, useState } from "react";
import { obtenerInventarios } from "../api/inventarios";
import { obtenerSucursales } from "../api/sucursales";
import { useTranslation } from "react-i18next";

function Inventarios() {
  const [inventarios, setInventarios] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const { t } = useTranslation();

  // Cargar las sucursales para el filtro
  useEffect(() => {
    const cargarSucursales = async () => {
      try {
        const data = await obtenerSucursales();
        setSucursales(data);
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

      const data = await obtenerInventarios(
        sucursalSeleccionada || null
      );

      setInventarios(data);
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

  return (
    <div className="p-6">
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#875d69]">
         {t("inventarios.title")}
        </h1>

        <p className="mt-2 text-[#203a5f]">
          {t("inventarios.subtitle")}
        </p>
      </div>

      {/* Filtro */}
      <div className="mb-8 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#5f3c46]">
              {t("inventarios.selectBranch")}
            </label>

            <p className="text-sm text-[#a1818a]">
              {t("inventarios.filterDescription")}
            </p>
          </div>

          <select
            value={sucursalSeleccionada}
            onChange={(e) =>
              setSucursalSeleccionada(e.target.value)
            }
            className="w-full max-w-sm rounded-xl border-2 border-[#e6bdc7] bg-white px-4 py-2.5 text-[#8c6773] shadow-sm transition focus:border-[#875d69] focus:outline-none"
          >
            <option value="">
           {t("inventarios.allBranches")}
          </option>

          <option value="inactivas">
            {t("inventarios.inactiveBranches")}
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
        </div>
      </div>

      {/* Estado de carga */}
      {cargando && (
        <div className="rounded-2xl border border-[#ead8d8] bg-white/70 p-8 text-center shadow-sm">
          <p className="text-[#8c6773]">
            {t("inventarios.loading")}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
          <p className="font-medium text-red-500">
            {error}
          </p>
        </div>
      )}

      {/* Inventarios */}
      {!cargando && !error && inventarios.length > 0 && (
        <div>
          {/* Resumen */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#5f3c46]">
                {t("inventarios.stockTitle")}
              </h2>

              <p className="text-sm text-[#a1818a]">
                {t("inventarios.productCount", {
                  count: inventarios.length,
                })}
              </p>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto rounded-2xl border border-[#ead8d8] bg-white/80 shadow-sm">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-[#ead8d8] bg-[#fff8f8]">
                  <th className="p-4 text-left text-sm font-semibold text-[#5f3c46]">
                    {t("inventarios.product")}
                  </th>

                  <th className="p-4 text-left text-sm font-semibold text-[#5f3c46]">
                    {t("inventarios.category")}
                  </th>

                  <th className="p-4 text-left text-sm font-semibold text-[#5f3c46]">
                    {t("inventarios.branch")}
                  </th>

                  <th className="p-4 text-center text-sm font-semibold text-[#5f3c46]">
                    {t("inventarios.quantity")}
                  </th>
                </tr>
              </thead>

              <tbody>
                {inventarios.map((inventario) => (
                  <tr
                    key={`${inventario.sucursal_id}-${inventario.producto_id}`}
                    className="border-b border-[#f0e3e3] last:border-b-0 transition-colors hover:bg-[#fff8f8]"
                  >
                    <td className="p-4">
                      <div className="font-semibold text-[#4f3b40]">
                        {inventario.producto_nombre}
                      </div>
                    </td>

                    <td className="p-4 text-[#8c6773]">
                      {inventario.categoria_nombre}
                    </td>

                    <td className="p-4 text-[#8c6773]">
                      {inventario.sucursal_nombre}
                    </td>

                    <td className="p-4 text-center">
                      <span className="inline-flex min-w-12 justify-center rounded-full bg-[#f9eeb4] px-3 py-1.5 font-semibold text-[#70565e]">
                        {inventario.existencia}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sin inventarios */}
      {!cargando && !error && inventarios.length === 0 && (
        <div className="rounded-2xl border border-[#ead8d8] bg-white/70 px-6 py-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff1f3]">
            <span className="text-2xl text-[#875d69]">📦</span>
            </div>

          <h2 className="mb-2 text-lg font-semibold text-[#5f3c46]">
            {t("inventarios.emptyTitle")}
          </h2>

          <p className="mx-auto max-w-md text-sm text-[#9a7b84]">
            {t("inventarios.emptyDescription")}
          </p>
        </div>
      )}
    </div>
  );
}

export default Inventarios;