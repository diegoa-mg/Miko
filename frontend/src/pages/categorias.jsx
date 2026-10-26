import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  listarCategoriasApi,
  crearCategoriaApi,
  editarCategoriaApi,
  eliminarCategoriaApi,
} from "../api/categorias";

export default function Categorias() {
  const { t } = useTranslation();

  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  // Modal crear / editar
  const [modal, setModal] = useState(null); // { modo: "crear" | "editar", categoria? }
  const [nombre, setNombre] = useState("");
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Modal eliminar
  const [porEliminar, setPorEliminar] = useState(null);
  const [errorEliminar, setErrorEliminar] = useState("");
  const [eliminando, setEliminando] = useState(false);

  const cargarCategorias = async () => {
    try {
      setCargando(true);
      setErrorCarga(false);
      setCategorias(await listarCategoriasApi());
    } catch {
      setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCategorias();
  }, []);

  useEffect(() => {
    if (!mensaje.texto) return;
    const timer = setTimeout(() => setMensaje({ tipo: "", texto: "" }), 3500);
    return () => clearTimeout(timer);
  }, [mensaje]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return categorias;
    return categorias.filter((c) => c.nombre.toLowerCase().includes(q));
  }, [categorias, busqueda]);

  // ---------- Crear / editar ----------
  const abrirCrear = () => {
    setNombre("");
    setErrorForm("");
    setModal({ modo: "crear" });
  };

  const abrirEditar = (categoria) => {
    setNombre(categoria.nombre);
    setErrorForm("");
    setModal({ modo: "editar", categoria });
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModal(null);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    const limpio = nombre.trim();
    if (!limpio) {
      setErrorForm(t("categorias.nombreRequerido"));
      return;
    }

    try {
      setGuardando(true);
      setErrorForm("");
      if (modal.modo === "crear") {
        await crearCategoriaApi(limpio);
        setMensaje({ tipo: "ok", texto: t("categorias.creada") });
      } else {
        await editarCategoriaApi(modal.categoria.id, limpio);
        setMensaje({ tipo: "ok", texto: t("categorias.actualizada") });
      }
      setModal(null);
      await cargarCategorias();
    } catch (err) {
      const status = err.response?.status;
      if (status === 400) {
        setErrorForm(t("categorias.errorDuplicada", { nombre: limpio }));
      } else if (status === 404) {
        setErrorForm(t("categorias.errorNoExiste"));
      } else {
        setErrorForm(t("categorias.errorGuardar"));
      }
    } finally {
      setGuardando(false);
    }
  };

  // ---------- Eliminar ----------
  const abrirEliminar = (categoria) => {
    setErrorEliminar("");
    setPorEliminar(categoria);
  };

  const cerrarEliminar = () => {
    if (eliminando) return;
    setPorEliminar(null);
  };

  const handleEliminar = async () => {
    try {
      setEliminando(true);
      setErrorEliminar("");
      await eliminarCategoriaApi(porEliminar.id);
      setPorEliminar(null);
      setMensaje({ tipo: "ok", texto: t("categorias.eliminada") });
      await cargarCategorias();
    } catch (err) {
      const status = err.response?.status;
      if (status === 400) {
        setErrorEliminar(t("categorias.errorTieneProductos"));
      } else if (status === 404) {
        setErrorEliminar(t("categorias.errorNoExiste"));
      } else {
        setErrorEliminar(t("categorias.errorEliminar"));
      }
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf6e3] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
          <div>
            <h1 className="font-sans text-3xl font-bold text-[#875d69]">
              {t("categorias.titulo")}
            </h1>
            <p className="font-sans text-gray-600 mt-1">
              {t("categorias.descripcion")}
            </p>
          </div>
          <button
            type="button"
            onClick={abrirCrear}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#875d69] hover:bg-[#724d58] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <span className="material-icons text-lg">add</span>
            {t("categorias.nueva")}
          </button>
        </div>

        {/* Notificaciones */}
        {mensaje.texto && (
          <div className="p-4 rounded-2xl text-sm font-medium border bg-green-50 text-green-700 border-green-200">
            {mensaje.texto}
          </div>
        )}

        {/* Lista */}
        <div className="bg-white rounded-3xl shadow-sm border border-[#f0dfdc] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-sans text-lg font-semibold text-[#875d69]">
                {t("categorias.lista")}
              </h2>
              {!cargando && !errorCarga && (
                <p className="font-sans text-xs text-gray-500">
                  {t("categorias.totalCategorias", { count: categorias.length })}
                </p>
              )}
            </div>
            <div className="relative w-full sm:w-64">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                search
              </span>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={t("categorias.buscar")}
                className="font-sans w-full border-2 border-[#ead8d8] rounded-xl pl-10 pr-4 py-2 text-sm bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#cda4b4] transition"
              />
            </div>
          </div>

          {cargando ? (
            <p className="font-sans text-sm text-gray-500 py-8 text-center">
              {t("categorias.cargando")}
            </p>
          ) : errorCarga ? (
            <div className="py-8 text-center space-y-3">
              <p className="font-sans text-sm text-red-600">
                {t("categorias.errorCarga")}
              </p>
              <button
                type="button"
                onClick={cargarCategorias}
                className="px-4 py-2 border border-[#ead8d8] text-[#875d69] text-xs font-semibold rounded-xl hover:border-[#cda4b4] transition-colors"
              >
                {t("categorias.reintentar")}
              </button>
            </div>
          ) : filtradas.length === 0 ? (
            <p className="font-sans text-sm text-gray-500 py-8 text-center">
              {categorias.length === 0
                ? t("categorias.sinRegistros")
                : t("categorias.sinResultados")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-sm">
                <thead>
                  <tr className="border-b border-[#eee1dd] text-[#875d69] text-xs font-semibold">
                    <th className="py-3 px-3 w-24">{t("categorias.id")}</th>
                    <th className="py-3 px-3">{t("categorias.nombre")}</th>
                    <th className="py-3 px-3 text-right">
                      {t("categorias.acciones")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-[#f3e9e6] last:border-0 hover:bg-[#fdf9f8] transition-colors"
                    >
                      <td className="py-3 px-3 text-gray-500">{c.id}</td>
                      <td className="py-3 px-3 font-medium text-gray-800">
                        {c.nombre}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex justify-end gap-3">
                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => abrirEditar(c)}
                            className="miko-edit-button"
                            title={t("categorias.editar")}
                            aria-label={t("categorias.editar")}
                          >
                            <svg
                              className="miko-edit-icon"
                              viewBox="0 0 512 512"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z" />
                            </svg>
                          </button>

                          {/* Eliminar */}
                          <button
                            type="button"
                            onClick={() => abrirEliminar(c)}
                            className="miko-delete-button"
                            title={t("categorias.eliminar")}
                            aria-label={t("categorias.eliminar")}
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal crear / editar */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleGuardar}
            className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6"
          >
            <h3 className="font-sans text-lg font-semibold text-[#875d69]">
              {modal.modo === "crear"
                ? t("categorias.nuevaTitulo")
                : t("categorias.editarTitulo")}
            </h3>
            <p className="font-sans text-xs text-gray-500 mb-4">
              {modal.modo === "crear"
                ? t("categorias.crearDescripcion")
                : t("categorias.editarDescripcion")}
            </p>

            <label className="font-sans block text-xs font-medium text-[#875d69] mb-1.5">
              {t("categorias.nombre")} *
            </label>
            <input
              type="text"
              autoFocus
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setErrorForm("");
              }}
              placeholder={t("categorias.nombrePlaceholder")}
              className="font-sans w-full border-2 border-[#ead8d8] rounded-xl px-4 py-2.5 text-sm bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#cda4b4] transition"
            />
            {errorForm && (
              <p className="font-sans text-xs text-red-600 mt-2">{errorForm}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                className="flex-1 py-2.5 border border-[#ead8d8] text-[#875d69] text-xs font-semibold rounded-xl hover:border-[#cda4b4] transition-colors disabled:opacity-50"
              >
                {t("categorias.cancelar")}
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 py-2.5 bg-[#875d69] hover:bg-[#724d58] text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {guardando
                  ? t("categorias.guardando")
                  : modal.modo === "crear"
                  ? t("categorias.crear")
                  : t("categorias.guardarCambios")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal eliminar */}
      {porEliminar && (
        <div className="miko-confirm-overlay">
          <div className="miko-confirm-modal">
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

            <h2>{t("categorias.eliminarTitulo")}</h2>
            <p>
              {t("categorias.confirmarEliminar", { nombre: porEliminar.nombre })}
            </p>

            {errorEliminar && (
              <p className="miko-confirm-error">{errorEliminar}</p>
            )}

            <div className="miko-confirm-actions">
              <button
                type="button"
                className="miko-confirm-cancel"
                onClick={cerrarEliminar}
                disabled={eliminando}
              >
                {t("categorias.cancelar")}
              </button>
              <button
                type="button"
                className="miko-confirm-accept"
                onClick={handleEliminar}
                disabled={eliminando}
              >
                {eliminando ? t("categorias.eliminando") : t("categorias.aceptar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}