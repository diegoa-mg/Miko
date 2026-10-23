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
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => abrirEditar(c)}
                            title={t("categorias.editar")}
                            aria-label={t("categorias.editar")}
                            className="p-2 rounded-lg text-[#875d69] hover:bg-[#f7ecea] transition-colors"
                          >
                            <span className="material-icons text-lg">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirEliminar(c)}
                            title={t("categorias.eliminar")}
                            aria-label={t("categorias.eliminar")}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <span className="material-icons text-lg">delete</span>
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-sans text-lg font-semibold text-[#875d69]">
              {t("categorias.eliminarTitulo")}
            </h3>
            <p className="font-sans text-sm text-gray-600 mt-2">
              {t("categorias.confirmarEliminar", { nombre: porEliminar.nombre })}
            </p>
            {errorEliminar && (
              <p className="font-sans text-xs text-red-600 mt-3">{errorEliminar}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={cerrarEliminar}
                disabled={eliminando}
                className="flex-1 py-2.5 border border-[#ead8d8] text-[#875d69] text-xs font-semibold rounded-xl hover:border-[#cda4b4] transition-colors disabled:opacity-50"
              >
                {t("categorias.cancelar")}
              </button>
              <button
                type="button"
                onClick={handleEliminar}
                disabled={eliminando}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {eliminando ? t("categorias.eliminando") : t("categorias.eliminar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}