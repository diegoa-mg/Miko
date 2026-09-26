import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  obtenerSucursales,
  crearSucursal,
  actualizarSucursal,
  eliminarSucursal,
} from "../api/sucursales";

function Sucursales() {
  const { t } = useTranslation();

  const [sucursales, setSucursales] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [sucursalEditando, setSucursalEditando] = useState(null);

  const [formulario, setFormulario] = useState({
    nombre: "",
    direccion: "",
    telefono: "",
    gerente_id: "",
  });

  useEffect(() => {
    cargarSucursales();
  }, []);

  const cargarSucursales = async () => {
    try {
      setCargando(true);
      setError("");

      const data = await obtenerSucursales();
      setSucursales(data);
    } catch (error) {
      console.error(error);
      setError(t("sucursales.errorCarga"));
    } finally {
      setCargando(false);
    }
  };

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    setFormulario({
      ...formulario,
      [name]: value,
    });
  };

  const manejarCrear = async (e) => {
  e.preventDefault();
  setError("");

  try {
    const datosSucursal = {
      nombre: formulario.nombre,
      direccion: formulario.direccion,
      telefono: formulario.telefono || null,
      gerente_id: formulario.gerente_id
        ? Number(formulario.gerente_id)
        : null,
    };

    if (sucursalEditando) {
      await actualizarSucursal(
        sucursalEditando.id,
        datosSucursal
      );
    } else {
      await crearSucursal(datosSucursal);
    }

    setFormulario({
      nombre: "",
      direccion: "",
      telefono: "",
      gerente_id: "",
    });

    setSucursalEditando(null);
    setMostrarFormulario(false);

    await cargarSucursales();
  } catch (error) {
    console.error(error);

        setError(
          error.response?.data?.detail ||
            t("sucursales.errorGuardar")
        );
  }
};

  const manejarEditar = (sucursal) => {
    setSucursalEditando(sucursal);

    setFormulario({
      nombre: sucursal.nombre,
      direccion: sucursal.direccion,
      telefono: sucursal.telefono || "",
      gerente_id: sucursal.gerente_id || "",
    });

    setMostrarFormulario(true);
    setError("");
  };

  const manejarEliminar = async (id) => {
    const confirmar = window.confirm(
      t("sucursales.confirmarEliminar")
    );

    if (!confirmar) {
      return;
    }

    try {
      setError("");

      await eliminarSucursal(id);

      await cargarSucursales();
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.detail ||
          t("sucursales.errorEliminar")
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf6e3] p-8">
      <div className="max-w-6xl mx-auto">

        {/* Encabezado */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#875d69]">
              {t("sucursales.titulo")}
            </h1>

            <p className="font-sans text-gray-600 mt-1">
              {t("sucursales.descripcion")}
            </p>
          </div>

          <button
            onClick={() => {
              setMostrarFormulario(!mostrarFormulario);
              setSucursalEditando(null);
              setFormulario({
                nombre: "",
                direccion: "",
                telefono: "",
                gerente_id: "",
              });
            }}
            className="font-sans bg-rose-800 hover:bg-rose-900 text-white px-5 py-3 rounded-lg transition-colors"
          >
            {mostrarFormulario
                ? t("sucursales.cancelar")
                : `+ ${t("sucursales.nueva")}`}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Formulario */}
        {mostrarFormulario && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-[#875d69] mb-5">
                {sucursalEditando
                    ? t("sucursales.editar")
                    : t("sucursales.nueva")}
            </h2>

            <form
              onSubmit={manejarCrear}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              {/* Nombre */}
              <div>
                <label className="font-sans block text-sm font-medium mb-2">
                    {t("sucursales.nombre")} *
                </label>

                <input
                  type="text"
                  name="nombre"
                  value={formulario.nombre}
                  onChange={manejarCambio}
                  required
                  className="font-sans w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-rose-800"
                  placeholder={t("sucursales.nombrePlaceholder")}
                />
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("sucursales.direccion")} *
                </label>

                <input
                  type="text"
                  name="direccion"
                  value={formulario.direccion}
                  onChange={manejarCambio}
                  required
                  className="font-sans w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-rose-800"
                  placeholder={t("sucursales.direccionPlaceholder")}
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("sucursales.telefono")}
                </label>

                <input
                  type="text"
                  name="telefono"
                  value={formulario.telefono}
                  onChange={manejarCambio}
                  className="font-sans w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-rose-800"
                  placeholder={t("sucursales.telefonoPlaceholder")}
                />
              </div>

              {/* Gerente */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("sucursales.gerente")}
                </label>

                <input
                  type="number"
                  name="gerente_id"
                  value={formulario.gerente_id}
                  onChange={manejarCambio}
                  className="font-sans w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-rose-800"
                  placeholder={t("sucursales.gerentePlaceholder")}
                />
              </div>

              {/* Botón */}
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="font-sans bg-rose-800 hover:bg-rose-900 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  {sucursalEditando
                        ? t("sucursales.guardarCambios")
                        : t("sucursales.crear")}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-[#875d69]">
                {t("sucursales.lista")}
            </h2>
          </div>

          {cargando ? (
            <div className="p-8 text-center text-gray-500">
              {t("sucursales.cargando")}
            </div>
          ) : sucursales.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {t("sucursales.sinRegistros")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="font-sans w-full">
                <thead className="bg-[#f9eeb4]">
                  <tr>
                    <th className="text-left px-6 py-4">
                      {t("sucursales.id")}
                    </th>

                    <th className="text-left px-6 py-4">
                      {t("sucursales.nombre")}
                    </th>

                    <th className="text-left px-6 py-4">
                      {t("sucursales.direccion")}
                    </th>

                    <th className="text-left px-6 py-4">
                      {t("sucursales.telefono")}
                    </th>

                    <th className="text-left px-6 py-4">
                      {t("sucursales.estado")}
                    </th>

                    <th className="text-left px-6 py-4">
                      {t("sucursales.gerente")}
                    </th>

                    <th className="text-left px-6 py-4">
                        {t("sucursales.acciones")}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sucursales.map((sucursal) => (
                    <tr
                      key={sucursal.id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        {sucursal.id}
                      </td>

                      <td className="px-6 py-4 font-medium">
                        {sucursal.nombre}
                      </td>

                      <td className="px-6 py-4">
                        {sucursal.direccion}
                      </td>

                      <td className="px-6 py-4">
                        {sucursal.telefono || "—"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={
                            sucursal.estado === "activa"
                              ? "text-green-600 font-medium"
                              : "text-red-600 font-medium"
                          }
                        >
                          {sucursal.estado}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {sucursal.gerente_id || t("sucursales.sinGerente")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => manejarEditar(sucursal)}
                            className="miko-edit-button"
                            aria-label={t("sucursales.editar")}
                          >
                            <svg
                              className="miko-edit-icon"
                              viewBox="0 0 512 512"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"
                              />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={() => manejarEliminar(sucursal.id)}
                            className="miko-delete-button"
                            aria-label={t("sucursales.eliminar")}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 69 14"
                              className="miko-delete-icon miko-bin-top"
                            >
                              <g clipPath="url(#clip0_bin_top)">
                                <path
                                  fill="black"
                                  d="M20.8232 2.62734L19.9948 4.21304C19.8224 4.54309 19.4808 4.75 19.1085 4.75H4.92857C2.20246 4.75 0 6.87266 0 9.5C0 12.1273 2.20246 14.25 4.92857 14.25H64.0714C66.7975 14.25 69 12.1273 69 9.5C69 6.87266 66.7975 4.75 64.0714 4.75H49.8915C49.5192 4.75 49.1776 4.54309 49.0052 4.21305L48.1768 2.62734C47.3451 1.00938 45.6355 0 43.7719 0H25.2281C23.3645 0 21.6549 1.00938 20.8232 2.62734ZM64.0023 20.0648C64.0397 19.4882 63.5822 19 63.0044 19H5.99556C5.4178 19 4.96025 19.4882 4.99766 20.0648L8.19375 69.3203C8.44018 73.0758 11.6746 76 15.5712 76H53.4288C57.3254 76 60.5598 73.0758 60.8062 69.3203L64.0023 20.0648Z"
                                />
                              </g>
                             <defs>
                               <clipPath id="clip0_bin_top">
                                 <rect fill="white" height="14" width="69" />
                               </clipPath>
                             </defs>
                         </svg>

                         <svg
                           xmlns="http://www.w3.org/2000/svg"
                           fill="none"
                           viewBox="0 0 69 57"
                           className="miko-delete-icon"
                         >
                           <g clipPath="url(#clip0_bin_bottom)">
                             <path
                               fill="black"
                               d="M20.8232 -16.3727L19.9948 -14.787C19.8224 -14.4569 19.4808 -14.25 19.1085 -14.25H4.92857C2.20246 -14.25 0 -12.1273 0 -9.5C0 -6.8727 2.20246 -4.75 4.92857 -4.75H64.0714C66.7975 -4.75 69 -6.8727 69 -9.5C69 -12.1273 66.7975 -14.25 64.0714 -14.25H49.8915C49.5192 -14.25 49.1776 -14.4569 49.0052 -16.3727C47.3451 -17.9906 45.6355 -19 43.7719 -19H25.2281C23.3645 -19 21.6549 -17.9906 20.8232 -16.3727ZM64.0023 1.0648C64.0397 0.4882 63.5822 0 63.0044 0H5.99556C5.4178 0 4.96025 0.4882 4.99766 1.0648L8.19375 50.3203C8.44018 54.0758 11.6746 57 15.5712 57H53.4288C57.3254 57 60.5598 54.0758 60.8062 50.3203L64.0023 1.0648Z"
                              />
                            </g>
                            <defs>
                              <clipPath id="clip0_bin_bottom">
                                <rect fill="white" height="57" width="69" />
                              </clipPath>
                            </defs>
                          </svg>
                        </button>

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Sucursales;