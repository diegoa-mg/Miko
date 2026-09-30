import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  obtenerGerentes,
  crearGerente,
  actualizarGerente,
  eliminarGerente,
} from "../api/gerentes";

import {
  obtenerSucursales,
  actualizarSucursal,
} from "../api/sucursales";

function Gerentes() {
  const { t } = useTranslation();

  const [buscar, setBuscar] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [gerentes, setGerentes] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [gerenteAEliminar, setGerenteAEliminar] = useState(null);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [editandoGerente, setEditandoGerente] = useState(null);

  const [formulario, setFormulario] = useState({
     nombre: "",
     email: "",
     password:"",
    });

  useEffect(() => {
  cargarDatos();
}, []);

  const cargarDatos = async () => {
  try {
    setCargando(true);
    setError("");

    const [gerentesData, sucursalesData] = await Promise.all([
      obtenerGerentes(),
      obtenerSucursales(),
    ]);

    console.log("GERENTES: ", gerentesData);
    console.log("SUCURSALES JSON NUEVO:", JSON.stringify(sucursalesData, null, 2));

    setGerentes(gerentesData);
    setSucursales(sucursalesData);
  } catch (err) {
    console.error("Error al cargar los datos:", err);
    setError("No se pudieron cargar los datos.");
  } finally {
    setCargando(false);
  }
};

    const manejarCambio = (e) => {
  const { name, value } = e.target;

  setFormulario((prev) => ({
    ...prev,
    [name]: value,
  }));
};

const limpiarFormulario = () => {
  setFormulario({
    nombre: "",
    email: "",
    password: "",
  });

  setEditandoGerente(null);
};
const abrirNuevoGerente = () => {
  limpiarFormulario();
  setMostrarFormulario(true);
};

const abrirEditarGerente = (gerente) => {
  setEditandoGerente(gerente);

  setFormulario({
    nombre: gerente.nombre || "",
    email: gerente.email || "",
    sucursal_id: gerente.sucursal_id || "",
  });

  setMostrarFormulario(true);
};

const manejarGuardar = async (e) => {
  e.preventDefault();

  try {
    setError("");

    const datos = {
        nombre: formulario.nombre,
        email: formulario.email,
        password: formulario.password,
    };
    if (editandoGerente) {
      await actualizarGerente(editandoGerente.id, {
        nombre: formulario.nombre,
        email: formulario.email,
      });
    } else {
      await crearGerente(datos);
    }

    await cargarDatos();
    limpiarFormulario();
    setMostrarFormulario(false);

  } catch (err) {
    console.error("Error al guardar gerente:", err);
    console.error("Respuesta backend:", err.response?.data);
    setError("No se pudo guardar el gerente.");
  }
};

const manejarEliminar = (id) => {
    setGerenteAEliminar(id);
};

const confirmarEliminar = async () => {
    try {
        setError("");

        await eliminarGerente(gerenteAEliminar);
        await cargarDatos();

        setGerenteAEliminar(null);
    } catch (err) {
        console.error("Error al eliminar gerente:", err);
        setError("No se pudo eliminar el gerente.");
    }
};

  const gerentesFiltrados = gerentes.filter((gerente) =>
    gerente.nombre.toLowerCase().includes(buscar.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#fdf6e3] p-8">
        {gerenteAEliminar && (
    <div className="miko-confirm-overlay">
        <div className="miko-confirm-modal">

            {/* Icono */}
            <div className="miko-confirm-icon">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-8 w-8"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v4m0 4h.01M10.3 3.7 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"
                    />
                </svg>
            </div>

            {/* Título */}
            <h2>Eliminar gerente</h2>

            {/* Mensaje */}
            <p>
                ¿Estás segura de que deseas eliminar este gerente?
            </p>

            {/* Botones */}
            <div className="miko-confirm-actions">
                <button
                    type="button"
                    className="miko-confirm-cancel"
                    onClick={() => setGerenteAEliminar(null)}
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    className="miko-confirm-accept"
                    onClick={confirmarEliminar}
                >
                    Aceptar
                </button>
            </div>

        </div>
    </div>
)}
      <div className="max-w-7xl mx-auto">

        {/* Encabezado */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-sans text-3xl font-bold text-[#875d69]">
                {t("gerentes.titulo")}
            </h1>

            <p className="font-sans text-gray-600 mt-1">
              {t("gerentes.descripcion")}
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNuevoGerente}
            className="font-sans bg-rose-800 hover:bg-rose-900 text-white px-5 py-3 rounded-lg transition-colors"
          >
            + {t("gerentes.nuevo")}
          </button>
        </div>

        {/* Barra superior */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">

            {/* Opciones */}
            <div className="flex gap-2 w-full lg:w-auto">
              <button
                type="button"
                className="font-sans bg-[#875d69] text-white px-5 py-3 rounded-full"
              >
                👥 {t("gerentes.lista")}
              </button>
            </div>

            {/* Buscador */}
            <div className="w-full lg:w-80">
              <input
                type="text"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder={t("gerentes.buscar")}
                className="font-sans w-full rounded-full border-2 border-[#ead8d8] bg-[#fffaf2] px-5 py-3 text-[#875d69] focus:outline-none focus:border-[#cda4b4]"
              />
            </div>

          </div>
        </div>

        {/* Lista de gerentes */}
        {gerentesFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <p className="font-sans text-gray-500">
              {t("gerentes.sinResultados")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {gerentesFiltrados.map((gerente) => (
              <div
                key={gerente.id}
                className="bg-white rounded-3xl shadow-sm border border-[#f0dfdc] overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Información principal */}
                <div className="p-6">

                  <div className="flex items-start justify-between">

                    <div className="flex items-center gap-4">

                      {/* Avatar */}
                      <div className="w-20 h-20 rounded-full bg-[#f6d5ca] flex items-center justify-center text-[#875d69] text-xl font-semibold">
                        {gerente.nombre
                            ?.split(" ")
                            .map((nombre) => nombre[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-semibold text-[#875d69]">
                            {gerente.nombre}
                          </h2>

                          <span className="font-sans text-xs font-medium text-green-700 bg-green-100 px-3 py-1 rounded-full">
                            {gerente.estado}
                          </span>
                        </div>

                        <p className="font-sans text-sm text-gray-600 mt-2">
                          ✉ {gerente.email}
                        </p>

                </div>
                    </div>

                    {/* Menú */}
                    <button
                      type="button"
                      aria-label={t("gerentes.masOpciones")}
                      className="font-sans text-2xl text-[#875d69] hover:text-rose-800"
                    >
                      ⋯
                    </button>
                  </div>

                  {/* Separador */}
                  <div className="border-t border-[#eee1dd] my-5" />
            </div>

            {/* Acciones */}
            <div className="bg-[#fffaf2] px-6 py-4 flex justify-end">
              <div className="flex gap-2">

                {/* Editar */}
                <button
                  type="button"
                  onClick={() => abrirEditarGerente(gerente)}
                  className="miko-edit-button"
                  aria-label={t("gerentes.editar")}
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

                {/* Eliminar */}
                <button
                  type="button"
                  onClick={() => manejarEliminar(gerente.id)}
                  className="miko-delete-button"
                  aria-label={t("gerentes.eliminar")}
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
                        d="M20.8232 2.62734L19.9948 4.21304C19.8224 4.54309 19.4808 4.75 19.1085 4.75H4.92857C2.20246 4.75 0 6.87266 0 9.5C0 12.1273 2.20246 14.25 4.92857 14.25H64.0714C66.7975 14.25 69 12.1273 69 9.5C69 6.87266 66.7975 4.75 64.0714 4.75H49.8915C49.5192 4.75 49.1776 4.54309 49.0052 4.21305L48.1768 2.62734C47.3451 1.00938 45.6355 0 43.7719 0H25.2281C23.3645 0 21.6549 1.00938 20.8232 2.62734ZM64.0023 20.0648C64.0397 19.4882 63.5822 19 63.0044 19H5.99556C5.4178 19 4.96025 19.4882 4.99766 20.0648L8.19375 69.3203C8.44018 73.0758 11.6746 76 15.5712 76H53.4288C57.3255 76 60.5598 73.0758 60.8062 69.3203L64.0023 20.0648Z"
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
                        d="M20.8232 -16.3727L19.9948 -14.787C19.8224 -14.4569 19.4808 -14.25 19.1085 -14.25H4.92857C2.20246 -14.25 0 -12.1273 0 -9.5C0 -6.8727 2.20246 -4.75 4.92857 -4.75H64.0714C66.7975 -4.75 69 -6.8727 69 -9.5C69 -12.1273 66.7975 -14.25 64.0714 -14.25H49.8915C49.5192 -14.25 49.1776 -14.4569 49.0052 -16.3727C47.3451 -17.9906 45.6355 -19 43.7719 -19H25.2281C23.3645 -19 21.6549 -17.9906 20.8232 -16.3727ZM64.0023 1.0648C64.0397 0.4882 63.5822 0 63.0044 0H5.99556C5.4178 0 4.96025 0.4882 4.99766 1.0648L8.19375 50.3203C8.44018 54.0758 11.6746 57 15.5712 57H53.4288C57.3255 57 60.5598 54.0758 60.8062 50.3203L64.0023 1.0648Z"
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
        </div>

              </div>
            ))}
          </div>
        )}

        {/* Panel Nuevo gerente */}
        {mostrarFormulario && (
          <div className="fixed inset-0 bg-black/30 flex justify-end z-50">

            <div className="bg-[#fffaf2] w-full max-w-md shadow-2xl p-6 overflow-y-auto">

              {/* Encabezado */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-sans text-2xl font-bold text-[#875d69]">
                  {t("gerentes.nuevo")}
                </h2>

                <button
                  type="button"
                  onClick={() => setMostrarFormulario(false)}
                  className="font-sans text-2xl text-[#875d69] hover:text-rose-800"
                >
                  ×
                </button>
              </div>

              {/* Información */}
              <div className="bg-[#f9e5e4] rounded-2xl p-4 mb-6">
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-xl bg-[#f4d0d0] flex items-center justify-center text-xl">
                    👤
                  </div>

                  <div>
                    <h3 className="font-sans font-semibold text-[#875d69]">
                      {t("gerentes.agregaNuevo")}
                    </h3>

                    <p className="font-sans text-xs text-gray-600 mt-1">
                      {t("gerentes.descripcionFormulario")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Formulario visual */}
              <form
                className="space-y-5"
                onSubmit={manejarGuardar}
                noValidate
              >

                {/* Nombre */}
                <div>
                  <label className="font-sans block text-sm font-medium text-[#875d69] mb-2">
                    {t("gerentes.nombreCompleto")} *
                  </label>

                  <input
                    type="text"
                    name="nombre"
                    value={formulario.nombre}
                    onChange={manejarCambio}
                    placeholder={t("gerentes.nombrePlaceholder")}
                    required
                    className="font-sans w-full border-2 border-[#ead8d8] rounded-xl px-4 py-3 bg-white focus:outline-none focus:border-[#cda4b4]"
                  />
                </div>

                {/* Correo */}
                <div>
                  <label className="font-sans block text-sm font-medium text-[#875d69] mb-2">
                    {t("gerentes.correo")} *
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={formulario.email}
                    onChange={manejarCambio}
                    placeholder={t("gerentes.correoPlaceholder")}
                    required
                    className="font-sans w-full border-2 border-[#ead8d8] rounded-xl px-4 py-3"
                  />
                </div>

                {/* Contraseña */}
                <div>
                 <label className="font-sans block text-sm font-medium text-[#875d69] mb-2">
                 {t("gerentes.contraseña")} *
                 </label>

                 <input
                    type="password"
                    name="password"
                    value={formulario.password}
                    onChange={manejarCambio}
                    placeholder={t("gerentes.contraseñaPlaceholder")}
                    required
                    className="font-sans w-full border-2 border-[#ead8d8] rounded-xl px-4 py-3 bg-white focus:outline-none focus:border-[#cda4b4]"
                />
                </div>


                {/* Botones */}
                <div className="flex gap-3 pt-3">

                  <button
                    type="button"
                    onClick={() => {
                        console.log("CLICK EN CANCELAR");
                        setMostrarFormulario(false);
                    }}
                    className="font-sans flex-1 border-2 border-[#ead8d8] bg-white text-[#875d69] py-3 rounded-xl hover:bg-[#fff4ed] transition-colors"
                >
                    {t("gerentes.cancelar")}
                  </button>

                  <button
                    type="submit"
                    onClick={() => console.log("🔥 CLICK EN CREAR GERENTE")}
                    className="font-sans flex-1 bg-rose-800 hover:bg-rose-900 text-white py-3 rounded-xl transition-colors"
                  >
                    {editandoGerente
                        ? t("Guardar")
                    : t("gerentes.crear")}
                  </button>

                </div>
              </form>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Gerentes;