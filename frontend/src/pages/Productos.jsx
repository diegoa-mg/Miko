
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

import {
  obtenerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  reactivarProducto,
  obtenerCategorias,
} from "../api/productos";

export default function Productos() {
  const { t } = useTranslation();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [vista, setVista] = useState("activos");
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const productosPorPagina = 16;

  const [panelAbierto, setPanelAbierto] = useState(false);
  const [productoEditar, setProductoEditar] = useState(null);

  const [formulario, setFormulario] = useState({
    nombre: "",
    precio: "",
    categoria_id: "",
    existencia_inicial: "0",
  });

  const [confirmacion, setConfirmacion] = useState(null);

  const mensajeError = (err) => {
    const detail = err?.response?.data?.detail;

    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg).join(", ");
    }

    return t("productos.errorGeneral", {
      defaultValue: "Ocurrió un error. Inténtalo de nuevo.",
    });
  };

  const cargarCategorias = useCallback(async () => {
    try {
      const data = await obtenerCategorias();
      setCategorias(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar categorías:", err);
      setError(mensajeError(err));
    }
  }, []);

  const cargarProductos = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const data = await obtenerProductos({
        buscar: busqueda.trim() || undefined,
        categoria_id: categoriaSeleccionada || undefined,
        incluir_inactivos: vista === "inactivos",
      });

      setProductos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar productos:", err);
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, [busqueda, categoriaSeleccionada, vista]);

  useEffect(() => {
    cargarCategorias();
  }, [cargarCategorias]);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      cargarProductos();
    }, 250);

    return () => clearTimeout(temporizador);
  }, [cargarProductos]);

  const productosVisibles = useMemo(
    () => productos.filter((producto) =>
      vista === "inactivos" ? !producto.activo : producto.activo
    ),
    [productos, vista]
  );

  const totalPaginas = Math.ceil(
  productosVisibles.length / productosPorPagina
);

const productosPaginados = productosVisibles.slice(
  (paginaActual - 1) * productosPorPagina,
  paginaActual * productosPorPagina
);

useEffect(() => {
  setPaginaActual(1);
}, [vista, busqueda, categoriaSeleccionada]);

useEffect(() => {
  if (totalPaginas > 0 && paginaActual > totalPaginas) {
    setPaginaActual(totalPaginas);
  }
}, [paginaActual, totalPaginas]);

  const abrirCrear = () => {
    setProductoEditar(null);
    setFormulario({
      nombre: "",
      precio: "",
      categoria_id: "",
      existencia_inicial: "0",
    });
    setError("");
    setMensaje("");
    setPanelAbierto(true);
  };

  const abrirEditar = (producto) => {
    setProductoEditar(producto);
    setFormulario({
      nombre: producto.nombre ?? "",
      precio: String(producto.precio ?? ""),
      categoria_id: String(producto.categoria_id ?? ""),
      existencia_inicial: "0",
    });
    setError("");
    setMensaje("");
    setPanelAbierto(true);
  };

  const cerrarPanel = () => {
    if (guardando) return;
    setPanelAbierto(false);
    setProductoEditar(null);
  };

  const cambiarCampo = (e) => {
    const { name, value } = e.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
  };

  const guardarProducto = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    const nombre = formulario.nombre.trim();
    const precio = Number(formulario.precio);
    const categoriaId = Number(formulario.categoria_id);
    const existencia = Number(formulario.existencia_inicial);

    if (!nombre) {
      setError(
        t("productos.nombreRequerido", {
          defaultValue: "Escribe el nombre del producto.",
        })
      );
      return;
    }

    if (!Number.isFinite(precio) || precio <= 0) {
      setError(
        t("productos.precioInvalido", {
          defaultValue: "El precio debe ser mayor que cero.",
        })
      );
      return;
    }

    if (!categoriaId) {
      setError(
        t("productos.categoriaRequerida", {
          defaultValue: "Selecciona una categoría.",
        })
      );
      return;
    }

    if (
      !productoEditar &&
      (!Number.isInteger(existencia) || existencia < 0)
    ) {
      setError(
        t("productos.existenciaInvalida", {
          defaultValue: "Las existencias deben ser un entero igual o mayor que cero.",
        })
      );
      return;
    }

    const datos = {
      nombre,
      precio: precio.toFixed(2),
      categoria_id: categoriaId,
    };

    setGuardando(true);

    try {
      if (productoEditar) {
        await actualizarProducto(productoEditar.id, datos);
        setMensaje(
          t("productos.actualizado", {
            defaultValue: "Producto actualizado correctamente.",
          })
        );
      } else {
        await crearProducto({
          ...datos,
          existencia_inicial: existencia,
        });
        setMensaje(
          t("productos.creado", {
            defaultValue: "Producto creado correctamente.",
          })
        );
      }

      setPanelAbierto(false);
      setProductoEditar(null);
      await cargarProductos();
    } catch (err) {
      console.error("Error al guardar producto:", err);
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const pedirEliminar = (producto) => {
    setConfirmacion({ tipo: "eliminar", producto });
  };

  const pedirReactivar = (producto) => {
    setConfirmacion({ tipo: "reactivar", producto });
  };

  const ejecutarConfirmacion = async () => {
    if (!confirmacion) return;

    const { tipo, producto } = confirmacion;
    setConfirmacion(null);
    setError("");
    setMensaje("");

    try {
      if (tipo === "eliminar") {
        await eliminarProducto(producto.id);
        setMensaje(
          t("productos.desactivado", {
            defaultValue: "Producto desactivado correctamente.",
          })
        );
      } else {
        await reactivarProducto(producto.id);
        setMensaje(
          t("productos.reactivado", {
            defaultValue: "Producto reactivado correctamente.",
          })
        );
      }

      await cargarProductos();
    } catch (err) {
      console.error("Error al cambiar el estado del producto:", err);
      setError(mensajeError(err));
    }
  };

  const dinero = (valor) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(Number(valor ?? 0));

  return (
    <div className="min-h-screen bg-[#fdf6e3] px-5 py-8 font-sans md:px-8">
      {/* Encabezado */}
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#f9e5e4] text-[#875d69]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2a1.5 1.5 0 0 0-1.5 1.5c0 .7.5 1.3 1.1 1.45V7H9.8V5.8H8.2V7H6.8A2.8 2.8 0 0 0 4 9.8v2.1c1.2 0 1.8-.9 2.7-.9s1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.5.9V9.8A2.8 2.8 0 0 0 17.2 7h-1.4V5.8h-1.6V7h-1.1V4.95A1.5 1.5 0 0 0 12 2Z" />
            <path d="M4 13.5c1.2 0 1.8-.9 2.7-.9s1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.5.9V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5.5Z" />
          </svg>
        </div>

          <div>
            <h1 className="font-sans text-3xl font-bold text-[#875d69]">
              {t("productos.titulo", { defaultValue: "Productos" })}
            </h1>
            <p className="mt-1 font-sans text-gray-600">
              {t("productos.descripcion", {
                defaultValue: "Administra los productos de tu sucursal.",
              })}
            </p>
          </div>
        </div>

        {vista === "activos" && (
         <button
          type="button"
          onClick={abrirCrear}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#a30f3c] px-6 py-3 font-sans text-sm font-normal text-white transition-colors hover:bg-[#850c32]"
        >
          <Plus size={21} />
          {t("productos.nuevo", { defaultValue: "Nuevo producto" })}
        </button>
        )}
      </header>

      {/* Mensajes */}
      {error && !panelAbierto && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {mensaje && !panelAbierto && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <CheckCircle2 size={20} />
          <span>{mensaje}</span>
        </div>
      )}

      {/* Búsqueda y filtros */}
      <section className="mb-6 rounded-2xl border border-[#f0dfdc] bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex flex-wrap gap-3">
  <button
    type="button"
    onClick={() => {
      setVista("activos");
      setMensaje("");
    }}
    className={`flex items-center gap-2 rounded-full px-6 py-3 font-sans text-sm font-normal transition-colors ${
  vista === "activos"
    ? "bg-[#875d69] text-white"
    : "bg-[#eab0b5] text-[#875d69] hover:bg-[#e4a0a7]"
}`}
  >
    <svg
  xmlns="http://www.w3.org/2000/svg"
  width="22"
  height="22"
  viewBox="0 0 24 24"
  fill="currentColor"
  aria-hidden="true"
>
  <path d="M12 2a1.5 1.5 0 0 0-1.5 1.5c0 .7.5 1.3 1.1 1.45V7H9.8V5.8H8.2V7H6.8A2.8 2.8 0 0 0 4 9.8v2.1c1.2 0 1.8-.9 2.7-.9s1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.5.9V9.8A2.8 2.8 0 0 0 17.2 7h-1.4V5.8h-1.6V7h-1.1V4.95A1.5 1.5 0 0 0 12 2Z"/>
  <path d="M4 13.5c1.2 0 1.8-.9 2.7-.9s1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.5.9V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5.5Z"/>
</svg>
    {t("productos.activos", { defaultValue: "Activos" })}
  </button>

  <button
    type="button"
    onClick={() => {
      setVista("inactivos");
      setMensaje("");
    }}
   className={`flex items-center gap-2 rounded-full px-6 py-3 font-sans text-sm font-normal transition-colors ${
  vista === "inactivos"
    ? "bg-[#875d69] text-white"
    : "bg-[#eab0b5] text-[#875d69] hover:bg-[#e4a0a7]"
}`}
  >
    <svg
  xmlns="http://www.w3.org/2000/svg"
  width="22"
  height="22"
  viewBox="0 0 24 24"
  fill="currentColor"
  aria-hidden="true"
>
  <path d="M12 2a1.5 1.5 0 0 0-1.5 1.5c0 .7.5 1.3 1.1 1.45V7H9.8V5.8H8.2V7H6.8A2.8 2.8 0 0 0 4 9.8v2.1c1.2 0 1.8-.9 2.7-.9s1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.5.9V9.8A2.8 2.8 0 0 0 17.2 7h-1.4V5.8h-1.6V7h-1.1V4.95A1.5 1.5 0 0 0 12 2Z"/>
  <path d="M4 13.5c1.2 0 1.8-.9 2.7-.9s1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.5.9V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5.5Z"/>
</svg>
    {t("productos.inactivos", { defaultValue: "Inactivos" })}
  </button>
</div>

<div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_280px_auto]">         
   <div className="relative min-w-0">
            <Search
              size={21}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cda4b4]"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={t("productos.buscar", {
                defaultValue: "Buscar producto...",
              })}
              className="w-full min-w-0 rounded-xl border-2 border-[#ead8d8] bg-white py-3 pl-12 pr-4 text-sm text-[#875d69] placeholder:text-[#b4a9ad] placeholder:truncate focus:border-[#cda4b4] focus:outline-none"
            />
          </div>

          <select
            value={categoriaSeleccionada}
            onChange={(e) => setCategoriaSeleccionada(e.target.value)}
            aria-label={t("productos.categorias", {
              defaultValue: "Categorías",
            })}
            className="w-full min-w-0 rounded-xl border-2 border-[#ead8d8] bg-white px-3 py-3 text-sm text-[#875d69] focus:border-[#cda4b4] focus:outline-none"          >
            <option value="">
              {t("productos.todos", { defaultValue: "Todos los productos" })}
            </option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              cargarProductos();
              cargarCategorias();
            }}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#ead8d8] px-5 py-3 font-sans text-sm font-normal text-[#875d69] transition-colors hover:bg-[#fff5f4]"
          >
            <RefreshCw size={19} />
            {t("productos.actualizarLista", {
              defaultValue: "Actualizar",
            })}
          </button>
        </div>
      </section>

      {/* Tabla única */}
      <div className="mb-3 text-sm text-[#9b7b83]">
        {t("productos.productosContador", {
        count: productosVisibles.length,
        defaultValue: "{{count}} productos",
      })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#f0dfdc] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-left">
            <thead>
              <tr className="bg-[#f9e5e4] text-sm text-[#875d69]">
                <th className="px-5 py-4 font-semibold">
                  {t("productos.nombre", { defaultValue: "Nombre" })}
                </th>
                <th className="px-5 py-4 font-semibold">
                  {t("productos.categoria", { defaultValue: "Categoría" })}
                </th>
                <th className="px-5 py-4 font-semibold">
                  {t("productos.precio", { defaultValue: "Precio" })}
                </th>
                <th className="px-5 py-4 font-semibold">
                  {t("productos.existencia", { defaultValue: "Existencias" })}
                </th>
                <th className="px-5 py-4 font-semibold">
                  {t("productos.estado", { defaultValue: "Estado" })}
                </th>
                <th className="px-5 py-4 text-center font-semibold">
                  {t("productos.acciones", { defaultValue: "Acciones" })}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f3e6e3]">
              {cargando ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[#9b7b83]">
                    {t("productos.cargando", {
                      defaultValue: "Cargando productos...",
                    })}
                  </td>
                </tr>
              ) : productosVisibles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[#9b7b83]">
                    {t("productos.sinResultados", {
                      defaultValue: "No se encontraron productos.",
                    })}
                  </td>
                </tr>
              ) : (
                productosPaginados.map((producto) => (
                  <tr
                    key={producto.id}
                    className="transition-colors hover:bg-[#fffaf7]"
                  >
                    <td className="px-5 py-4 font-semibold text-[#875d69]">
                      {producto.nombre}
                    </td>
                    <td className="px-5 py-4 text-[#9b7b83]">
                      {producto.categoria_nombre}
                    </td>
                    <td className="px-5 py-4 font-medium text-[#875d69]">
                      {dinero(producto.precio)}
                    </td>
                    <td className="px-5 py-4 text-[#875d69]">
                      {producto.existencia}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block h-2 w-8 rounded-full ${
                          producto.activo ? "bg-green-300" : "bg-red-300"
                        }`}
                        title={producto.activo ? "Activo" : "Inactivo"}
                        aria-label={producto.activo ? "Activo" : "Inactivo"}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-3">
                        {producto.activo ? (
                          <>
                            <button
                              type="button"
                              onClick={() => abrirEditar(producto)}
                              className="miko-edit-button"
                              aria-label={t("productos.editar", {
                                defaultValue: "Editar",
                              })}
                              title={t("productos.editar", {
                                defaultValue: "Editar",
                              })}
                            >
                              <svg
                                className="miko-edit-icon"
                                viewBox="0 0 512 512"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                              >
                                <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              onClick={() => pedirEliminar(producto)}
                              className="miko-delete-button"
                              aria-label={t("productos.eliminar", {
                                defaultValue: "Eliminar producto",
                              })}
                              title={t("productos.eliminar", {
                                defaultValue: "Eliminar producto",
                              })}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 69 14"
                                className="miko-delete-icon miko-bin-top"
                                aria-hidden="true"
                              >
                                <g>
                                  <path
                                    fill="black"
                                    d="M20.8232 2.62734L19.9948 4.21304C19.8224 4.54309 19.4808 4.75 19.1085 4.75H4.92857C2.20246 4.75 0 6.87266 0 9.5C0 12.1273 2.20246 14.25 4.92857 14.25H64.0714C66.7975 14.25 69 12.1273 69 9.5V9.5C69 6.87266 66.7975 4.75 64.0714 4.75H49.8915C49.5192 4.75 49.1776 4.54309 49.0052 4.21305L48.1768 2.62734C47.3451 1.00938 45.6355 0 43.7719 0H25.2281C23.3645 0 21.6549 1.00938 20.8232 2.62734Z"
                                  />
                                </g>
                              </svg>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 69 57"
                                className="miko-delete-icon"
                                aria-hidden="true"
                              >
                                <g>
                                  <path
                                    fill="black"
                                    d="M5 3H64L60.8 48.5C60.5 53.3 57.3 57 53.4 57H15.6C11.7 57 8.5 53.3 8.2 48.5L5 3Z"
                                  />
                                </g>
                              </svg>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => pedirReactivar(producto)}
                            className="flex items-center gap-2 rounded-xl bg-[#875d69] px-4 py-2 font-sans text-sm font-normal text-white transition-colors hover:bg-[#704956]"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="17"
                              height="17"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path d="M12 2a1.5 1.5 0 0 0-1.5 1.5c0 .7.5 1.3 1.1 1.45V7H9.8V5.8H8.2V7H6.8A2.8 2.8 0 0 0 4 9.8v2.1c1.2 0 1.8-.9 2.7-.9s1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.5.9V9.8A2.8 2.8 0 0 0 17.2 7h-1.4V5.8h-1.6V7h-1.1V4.95A1.5 1.5 0 0 0 12 2Z" />
                              <path d="M4 13.5c1.2 0 1.8-.9 2.7-.9s1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.5.9V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5.5Z" />
                            </svg>
                            {t("productos.reactivar", {
                              defaultValue: "Reactivar",
                            })}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      {/* PAGINACIÓN */}
{!cargando && productosVisibles.length > 0 && totalPaginas > 1 && (
  <div className="flex flex-col items-center gap-4 border-t border-[#ead8d8] bg-[#fffaf8] px-5 py-4 rounded-b-2xl">
    <div className="flex flex-wrap items-center justify-center gap-2">

      {/* Página anterior */}
      <button
        type="button"
        onClick={() =>
          setPaginaActual((pagina) => Math.max(1, pagina - 1))
        }
        disabled={paginaActual === 1}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ead8d8] bg-white text-[#8b5e6b] transition hover:bg-[#fae4df] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={t("productos.paginaAnterior", {
          defaultValue: "Página anterior",
        })}
      >
        <span className="material-icons text-xl">chevron_left</span>
      </button>

      {/* Números de página */}
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
              className={`h-9 min-w-9 rounded-xl border px-3 font-sans text-sm font-semibold transition ${
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
        onClick={() =>
          setPaginaActual((pagina) =>
            Math.min(totalPaginas, pagina + 1)
          )
        }
        disabled={paginaActual === totalPaginas}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ead8d8] bg-white text-[#8b5e6b] transition hover:bg-[#fae4df] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={t("productos.paginaSiguiente", {
        defaultValue: "Página siguiente",
      })}
      >
        <span className="material-icons text-xl">chevron_right</span>
      </button>
    </div>
  </div>
)}
    </section>

      {/* Panel lateral para crear o editar */}
      {panelAbierto && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cerrarPanel();
          }}
        >
          <aside className="h-full w-full max-w-md overflow-y-auto bg-[#fffaf2] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
             <h2 className="font-sans text-2xl font-bold text-[#875d69]">
                {productoEditar
                  ? t("productos.editarTitulo", {
                      defaultValue: "Editar producto",
                    })
                  : t("productos.nuevoTitulo", {
                      defaultValue: "Nuevo producto",
                    })}
              </h2>

              <button
                type="button"
                onClick={cerrarPanel}
                disabled={guardando}
                className="rounded-full p-2 text-[#875d69] transition-colors hover:bg-[#f9e5e4] disabled:opacity-50"
                aria-label={t("common.close", { defaultValue: "Cerrar" })}
              >
                <X size={23} />
              </button>
            </div>

            <div className="mb-6 rounded-2xl bg-[#f9e5e4] p-4">
              <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="shrink-0 text-[#875d69]"
                aria-hidden="true"
              >
                <path d="M12 2a1.5 1.5 0 0 0-1.5 1.5c0 .7.5 1.3 1.1 1.45V7H9.8V5.8H8.2V7H6.8A2.8 2.8 0 0 0 4 9.8v2.1c1.2 0 1.8-.9 2.7-.9s1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.5.9V9.8A2.8 2.8 0 0 0 17.2 7h-1.4V5.8h-1.6V7h-1.1V4.95A1.5 1.5 0 0 0 12 2Z" />
                <path d="M4 13.5c1.2 0 1.8-.9 2.7-.9s1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.7.9 1.8-.9 2.7-.9 1.5.9 2.5.9V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5.5Z" />
              </svg>
              <div>
                  <p className="font-semibold text-[#875d69]">
                    {productoEditar
                      ? t("productos.editarTitulo", {
                          defaultValue: "Editar producto",
                        })
                      : t("productos.nuevoTitulo", {
                          defaultValue: "Nuevo producto",
                        })}
                  </p>
                  <p className="text-sm text-[#9b7b83]">
                    {t("productos.formDescripcion", {
                      defaultValue: "Completa la información del producto.",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={guardarProducto} className="flex flex-col gap-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#875d69]">
                  {t("productos.nombre", { defaultValue: "Nombre" })}
                </label>
                <input
                  name="nombre"
                  value={formulario.nombre}
                  onChange={cambiarCampo}
                  maxLength={120}
                  required
                  placeholder={t("productos.nombrePlaceholder", {
                    defaultValue: "Ej. Concha de vainilla",
                  })}
                  className="w-full rounded-xl border-2 border-[#ead8d8] bg-white px-4 py-3 text-[#875d69] focus:border-[#cda4b4] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#875d69]">
                  {t("productos.precio", { defaultValue: "Precio" })} (MXN)
                </label>
                <input
                  type="number"
                  name="precio"
                  value={formulario.precio}
                  onChange={cambiarCampo}
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="w-full rounded-xl border-2 border-[#ead8d8] bg-white px-4 py-3 text-[#875d69] focus:border-[#cda4b4] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#875d69]">
                  {t("productos.categorias", {
                    defaultValue: "Categorías",
                  })}
                </label>
                <select
                  name="categoria_id"
                  value={formulario.categoria_id}
                  onChange={cambiarCampo}
                  required
                  className="w-full rounded-xl border-2 border-[#ead8d8] bg-white px-4 py-3 text-[#875d69] focus:border-[#cda4b4] focus:outline-none"
                >
                  <option value="">
                    {t("productos.seleccionarCategoria", {
                      defaultValue: "Selecciona una categoría",
                    })}
                  </option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {!productoEditar && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#875d69]">
                    {t("productos.existenciaInicial", {
                      defaultValue: "Existencias iniciales",
                    })}
                  </label>
                  <input
                    type="number"
                    name="existencia_inicial"
                    value={formulario.existencia_inicial}
                    onChange={cambiarCampo}
                    min="0"
                    step="1"
                    required
                    className="w-full rounded-xl border-2 border-[#ead8d8] bg-white px-4 py-3 text-[#875d69] focus:border-[#cda4b4] focus:outline-none"
                  />
                </div>
              )}

              {productoEditar && (
                <p className="rounded-xl bg-[#f9e5e4]/60 p-3 text-sm text-[#875d69]">
                  {t("productos.existenciaNoEditable", {
                    defaultValue:
                      "Las existencias se administran desde el módulo de inventario.",
                  })}
                </p>
              )}

              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={cerrarPanel}
                  disabled={guardando}
                  className="flex-1 rounded-xl bg-[#eee7e3] px-4 py-3 font-sans text-sm font-normal text-[#6b5a60] transition-colors hover:bg-[#ddd3ce] disabled:opacity-50"
                >
                 {t("productos.cancelar", { defaultValue: "Cancelar" })}
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 rounded-xl bg-[#a30f3c] px-4 py-3 font-sans text-sm font-normal text-white transition-colors hover:bg-[#850c32] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {guardando
                  ? t("common.guardando", {
                      defaultValue: "Guardando...",
                    })
                  : productoEditar
                  ? t("productos.guardarCambios", {
                      defaultValue: "Guardar cambios",
                    })
                  : t("productos.crearProducto", {
                      defaultValue: "Crear producto",
                    })}
                  </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {/* Modal de confirmación */}
      {confirmacion && (
        <div className="miko-confirm-overlay">
          <div
            className="miko-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="producto-confirmacion-titulo"
          >
            <div className="miko-confirm-icon">
              <AlertCircle size={38} strokeWidth={1.8} />
            </div>

            <h2 id="producto-confirmacion-titulo">
              {confirmacion.tipo === "eliminar"
                ? t("productos.confirmarDesactivar", {
                    defaultValue: "¿Eliminar producto?",
                  })
                : t("productos.confirmarReactivar", {
                    defaultValue: "¿Reactivar producto?",
                  })}
            </h2>

            <p>
              {confirmacion.tipo === "eliminar"
                ? t("productos.confirmacionDesactivarTexto", {
                    nombre: confirmacion.producto.nombre,
                    defaultValue: `¿Deseas eliminar "${confirmacion.producto.nombre}"?`
                  })
                : t("productos.confirmacionReactivarTexto", {
                    nombre: confirmacion.producto.nombre,
                    defaultValue: `¿Deseas reactivar "${confirmacion.producto.nombre}"?`,
                  })}
            </p>

            <div className="miko-confirm-actions">
              <button
                type="button"
                onClick={() => setConfirmacion(null)}
                className="miko-confirm-cancel"
              >
                {t("productos.cancelar", { defaultValue: "Cancelar" })}
              </button>
              <button
                type="button"
                onClick={ejecutarConfirmacion}
                className="miko-confirm-accept"
              >
                {t("productos.aceptar", { defaultValue: "Aceptar" })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
