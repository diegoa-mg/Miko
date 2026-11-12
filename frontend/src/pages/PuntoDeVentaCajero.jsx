import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus, X, ShoppingCart } from "lucide-react";
import api from "../api/axios";
import { obtenerMetodosPago, registrarVenta } from "../api/ventasCajero";
import CobroModal from "../components/CobroModal";

/**
 * Pantalla de venta del Cajero (/cajero/pos)
 * - Catálogo: GET /cajero/productos (buscar, categoria_id) -> solo activos de su sucursal
 * - Código de barras: GET /cajero/productos?codigo=XXXX (coincidencia exacta)
 * - Carrito en memoria. La existencia es solo de consulta: nunca se modifica aquí.
 */

// ---- Helpers ---------------------------------------------------------------

// precio llega como Decimal (string): Number(...) lo convierte
const getStock = (p) => Number(p.existencia ?? 0);
const getPrice = (p) => Number(p.precio ?? 0);

export default function PuntoDeVentaCajero() {
  const { t, i18n } = useTranslation();

  const money = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language?.startsWith("en") ? "en-US" : "es-MX", {
        style: "currency",
        currency: "MXN",
      }),
    [i18n.language]
  );

  // Catálogo
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [buscar, setBuscar] = useState("");
  const [buscarDebounced, setBuscarDebounced] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);

  // Carrito: [{ producto, cantidad }]
  const [carrito, setCarrito] = useState([]);
  const [cobroAbierto, setCobroAbierto] = useState(false);
  const [metodosPago, setMetodosPago] = useState([]);

  // Código de barras
  const [codigo, setCodigo] = useState("");
  const [buscandoCodigo, setBuscandoCodigo] = useState(false);
  const codigoRef = useRef(null);

  // Mensaje de aviso/éxito/error (barcode, existencias)
  const [aviso, setAviso] = useState(null); // { tipo: "error" | "ok", texto }
  const avisoTimer = useRef(null);

  const mostrarAviso = useCallback((tipo, texto, ms = 4000) => {
    setAviso({ tipo, texto });
    clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(null), ms);
  }, []);

  useEffect(() => () => clearTimeout(avisoTimer.current), []);

  // ---- Carga de datos -------------------------------------------------------

  // Debounce de la búsqueda por nombre
  useEffect(() => {
    const id = setTimeout(() => setBuscarDebounced(buscar.trim()), 300);
    return () => clearTimeout(id);
  }, [buscar]);

  const cargarProductos = useCallback(async () => {
    setCargando(true);
    setErrorCarga(false);
    try {
      const params = {};
      if (buscarDebounced) params.buscar = buscarDebounced;
      if (categoriaId) params.categoria_id = categoriaId;
      const { data } = await api.get("/cajero/productos", { params });
      setProductos(data);

      // Si cambió la existencia en el servidor, el carrito no debe exceder lo disponible
      setCarrito((prev) =>
        prev.map((linea) => {
          const fresco = data.find((p) => p.id === linea.producto.id);
          if (!fresco) return linea;
          const max = getStock(fresco);
          return { producto: fresco, cantidad: Math.min(linea.cantidad, Math.max(max, 0)) };
        })
      );
    } catch {
      setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  }, [buscarDebounced, categoriaId]);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  // Categorías para el filtro: ProductoOut trae categoria_id y categoria_nombre.
  // Se acumulan para que el filtro no pierda opciones cuando la lista se reduce.
  useEffect(() => {
    setCategorias((prev) => {
      const mapa = new Map(prev.map((c) => [c.id, c]));
      productos.forEach((p) => {
        if (p.categoria_id != null && p.categoria_nombre) {
          mapa.set(p.categoria_id, { id: p.categoria_id, nombre: p.categoria_nombre });
        }
      });
      const lista = [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
      return lista.length === prev.length ? prev : lista;
    });
  }, [productos]);

  const categoriasFiltro = categorias;

  // Métodos de pago desde el backend (GET /ventas/metodos-pago)
  useEffect(() => {
    obtenerMetodosPago()
      .then(setMetodosPago)
      .catch(() => setMetodosPago([]));
  }, []);

  // ---- Carrito --------------------------------------------------------------

  const cantidadEnCarrito = (id) => carrito.find((l) => l.producto.id === id)?.cantidad ?? 0;

  /** Agrega 1 pieza respetando la existencia. Devuelve true si se agregó. */
  const agregarAlCarrito = useCallback(
    (producto) => {
      const max = getStock(producto);
      const actual = Number(cantidadEnCarrito(producto.id) || 0);

      if (max <= 0) {
        mostrarAviso("error", t("pos.sinExistencia", { nombre: producto.nombre }));
        return false;
      }
      if (actual >= max) {
        mostrarAviso("error", t("pos.existenciaMaxima", { count: max, nombre: producto.nombre }));
        return false;
      }

      setCarrito((prev) => {
        const existe = prev.find((l) => l.producto.id === producto.id);
        if (existe) {
          return prev.map((l) =>
            l.producto.id === producto.id ? { producto, cantidad: Number(l.cantidad || 0) + 1 } : l
          );
        }
        return [...prev, { producto, cantidad: 1 }];
      });
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [carrito, mostrarAviso, t]
  );

  const cambiarCantidad = (id, valor) => {
    const linea = carrito.find((l) => l.producto.id === id);
    if (!linea) return;
    const max = getStock(linea.producto);

    // Campo vacío mientras escribe: se tolera y se normaliza al salir (onBlur)
    if (valor === "") {
      setCarrito((prev) => prev.map((l) => (l.producto.id === id ? { ...l, cantidad: "" } : l)));
      return;
    }

    let n = Math.floor(Number(valor));
    if (!Number.isFinite(n) || n < 1) n = 1;
    if (n > max) {
      n = max;
      mostrarAviso("error", t("pos.existenciaMaxima", { count: max, nombre: linea.producto.nombre }));
    }
    setCarrito((prev) => prev.map((l) => (l.producto.id === id ? { ...l, cantidad: n } : l)));
  };

  const normalizarCantidad = (id) =>
    setCarrito((prev) =>
      prev.map((l) => (l.producto.id === id && !l.cantidad ? { ...l, cantidad: 1 } : l))
    );

  const sumar = (id) => {
    const linea = carrito.find((l) => l.producto.id === id);
    if (linea) agregarAlCarrito(linea.producto);
  };

  const restar = (id) =>
    setCarrito((prev) =>
      prev.map((l) =>
        l.producto.id === id ? { ...l, cantidad: Math.max(1, Number(l.cantidad) - 1) } : l
      )
    );

  const quitar = (id) => setCarrito((prev) => prev.filter((l) => l.producto.id !== id));
  const vaciar = () => setCarrito([]);

  // ---- Código de barras -----------------------------------------------------

  const enviarCodigo = async (e) => {
    e.preventDefault();
    const valor = codigo.trim();
    if (!valor || buscandoCodigo) return;

    setBuscandoCodigo(true);
    try {
      const { data } = await api.get("/cajero/productos", { params: { codigo: valor } });
      const producto = data[0];
      if (!producto) {
        mostrarAviso("error", t("pos.codigoNoExiste", { codigo: valor }));
      } else if (agregarAlCarrito(producto)) {
        mostrarAviso("ok", t("pos.productoAgregado", { nombre: producto.nombre }));
      }
    } catch {
      mostrarAviso("error", t("pos.errorCodigo"));
    } finally {
      setCodigo("");
      setBuscandoCodigo(false);
      codigoRef.current?.focus(); // listo para el siguiente escaneo
    }
  };

  // Enfoca el campo del lector al entrar a la pantalla
  useEffect(() => {
    codigoRef.current?.focus();
  }, []);

  // ---- Totales --------------------------------------------------------------

  const subtotalLinea = (l) => Math.round(getPrice(l.producto) * Number(l.cantidad || 0) * 100) / 100;
  const total = carrito.reduce((acc, l) => acc + subtotalLinea(l), 0);
  const piezas = carrito.reduce((acc, l) => acc + Number(l.cantidad || 0), 0);

  // ---- Cobro ----------------------------------------------------------------

  const carritoValido = carrito.length > 0 && carrito.every((l) => Number(l.cantidad) >= 1);

  // Si falla (por ejemplo, stock insuficiente), relanza el error: el modal lo
  // muestra sin cerrarse y aquí se refrescan las existencias.
  const confirmarCobro = async ({ metodoPagoId, efectivoRecibido }) => {
    let venta;
    try {
      venta = await registrarVenta(carrito, metodoPagoId);
    } catch (err) {
      cargarProductos();
      throw err;
    }

    setCobroAbierto(false);
    setCarrito([]);
    await cargarProductos(); // las existencias ya vienen descontadas

    // El cambio se calcula con el total oficial que devolvió el backend
    const totalVenta = Number(venta?.total ?? total);
    const cambio =
      efectivoRecibido != null ? Math.round((efectivoRecibido - totalVenta) * 100) / 100 : 0;

    if (cambio > 0) {
      mostrarAviso("ok", t("pos.ventaRegistradaCambio", { cambio: money.format(cambio) }), 10000);
    } else {
      mostrarAviso("ok", t("pos.ventaRegistrada"), 6000);
    }
    codigoRef.current?.focus();
  };

  // ---- Render ---------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#fdf6e3] dark:bg-[var(--dark-bg)] p-4 sm:p-8">
    <div className="max-w-7xl mx-auto">

      {/* Encabezado */}
      <header className="mb-7">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#fae4df] dark:bg-[var(--dark-border)]">
            <ShoppingCart
              size={32}
              strokeWidth={1.8}
              className="text-[#d06b7d] dark:text-rose-300"
            />
          </div>

          <div>
            <h1 className="font-sans text-3xl sm:text-4xl font-bold text-[#8b5e6b] dark:text-rose-300">
              {t("pos.titulo")}
            </h1>

            <p className="mt-1 font-sans text-lg text-[#5f4a50] dark:text-[var(--dark-muted)]">
              {t("pos.descripcion")}
            </p>
          </div>
        </div>
      </header>

      <CobroModal
        open={cobroAbierto}
        total={total}
        money={money}
        metodos={metodosPago}
        onClose={() => setCobroAbierto(false)}
        onConfirm={confirmarCobro}
      />

      <a
        href="#carrito-venta"
        className="mb-4 inline-flex items-center gap-2 rounded-full bg-rose-800 dark:bg-rose-700 px-4 py-2 text-sm font-medium text-white xl:hidden"
      >
        {t("pos.verCarrito", { count: piezas })}
      </a>

      {aviso && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-4 rounded-md border px-4 py-2 text-sm ${
            aviso.tipo === "error"
              ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
              : "border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300"
          }`}
        >
          {aviso.texto}
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_400px]">
        {/* ===================== CATÁLOGO ===================== */}
        <section className="min-w-0">
          {/* Lector de código de barras */}
          <form onSubmit={enviarCodigo} className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <span className="material-icons pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[#cda4b4] dark:text-[var(--dark-muted)]">
                qr_code_scanner
              </span>
              <input
                ref={codigoRef}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder={t("pos.codigoPlaceholder")}
                aria-label={t("pos.codigoLabel")}
                autoComplete="off"
                className={`w-full rounded-full bg-white dark:bg-[var(--dark-bg)] border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] text-[#4a2f38] dark:text-[var(--dark-text)] placeholder:text-[#b08a98] dark:placeholder:text-[var(--dark-muted)] pl-12 pr-5 py-2 focus:outline-none focus:border-[#875d69] dark:focus:border-rose-300 focus:ring-2 focus:ring-rose-200 dark:focus:ring-[var(--dark-border)] ${
                  codigo ? "font-mono" : ""
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={buscandoCodigo || !codigo.trim()}
              className="rounded-full bg-rose-800 dark:bg-rose-700 hover:bg-rose-900 dark:hover:bg-rose-600 text-white px-5 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {buscandoCodigo ? t("pos.buscandoCodigo") : t("pos.agregarCodigo")}
            </button>
          </form>

          {/* Búsqueda por nombre + filtro por categoría */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder={t("pos.buscar")}
              aria-label={t("pos.buscar")}
              className="min-w-0 flex-1 rounded-full bg-white dark:bg-[var(--dark-bg)] border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] text-[#8c6773] dark:text-[var(--dark-text)] px-5 py-2 focus:outline-none focus:border-[#875d69] dark:focus:border-rose-300"
            />
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              aria-label={t("pos.categoria")}
              className="rounded-full bg-white dark:bg-[var(--dark-bg)] border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] text-[#8c6773] dark:text-[var(--dark-text)] px-4 py-2 sm:w-60 sm:shrink-0 focus:outline-none focus:border-[#875d69] dark:focus:border-rose-300"
            >
              <option value="">{t("pos.todasCategorias")}</option>
              {categoriasFiltro.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {cargando && <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)]">{t("pos.cargando")}</p>}

          {errorCarga && !cargando && (
            <div className="rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300">
              {t("pos.errorCarga")}{" "}
              <button onClick={cargarProductos} className="font-medium underline">
                {t("pos.reintentar")}
              </button>
            </div>
          )}

          {!cargando && !errorCarga && productos.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)]">{t("pos.sinResultados")}</p>
          )}

          {!errorCarga && productos.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {productos.map((p) => {
                const stock = getStock(p);
                const enCarrito = cantidadEnCarrito(p.id);
                const agotado = stock <= 0;
                const limite = enCarrito >= stock;
                return (
                  <li key={p.id} className="flex flex-col justify-between bg-white dark:bg-[var(--dark-surface)] rounded-xl shadow p-4">
                    <div>
                      <p className="font-medium leading-tight">{p.nombre}</p>
                      {p.codigo && (
                        <p className="mt-0.5 font-mono text-xs text-gray-500 dark:text-[var(--dark-muted)]">{p.codigo}</p>
                      )}
                      <p className="mt-2 text-lg font-semibold text-gray-800 dark:text-[var(--dark-text)]">{money.format(getPrice(p))}</p>
                      <p
                        className={`text-xs ${
                          agotado ? "font-medium text-red-600 dark:text-red-400" : "text-gray-500 dark:text-[var(--dark-muted)]"
                        }`}
                      >
                        {agotado
                          ? t("pos.agotado")
                          : t("pos.disponibles", { count: stock - enCarrito })}
                      </p>
                    </div>
                    <button
                      onClick={() => agregarAlCarrito(p)}
                      disabled={agotado || limite}
                      className="mt-3 rounded-lg bg-rose-800 dark:bg-rose-700 hover:bg-rose-900 dark:hover:bg-rose-600 px-3 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {t("pos.agregar")}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ===================== CARRITO ===================== */}
        <aside id="carrito-venta" className="bg-white dark:bg-[var(--dark-surface)] rounded-xl shadow p-5 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-sans text-lg font-semibold text-[#875d69] dark:text-rose-300">{t("pos.carrito")} ({piezas})</h2>
            {carrito.length > 0 && (
              <button onClick={vaciar} className="text-sm text-red-600 dark:text-red-400 underline">
                {t("pos.vaciar")}
              </button>
            )}
          </div>

          {carrito.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-[var(--dark-muted)]">{t("pos.carritoVacio")}</p>
          ) : (
            <ul className="divide-y overflow-y-auto min-h-0 flex-1">
              {carrito.map((l) => {
                const stock = getStock(l.producto);
                return (
                  <li key={l.producto.id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium leading-tight">{l.producto.nombre}</p>
                        <p className="text-xs text-gray-500 dark:text-[var(--dark-muted)]">
                          {money.format(getPrice(l.producto))} {t("pos.cadaUna")} · {t("pos.existencia")}: {stock}
                        </p>
                      </div>
                      <button
                        onClick={() => quitar(l.producto.id)}
                        aria-label={t("pos.quitar")}
                        title={t("pos.quitar")}
                        className="flex shrink-0 items-center gap-1 rounded-full border border-red-300 dark:border-red-800 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <X size={14} />
                        {t("pos.quitarCorto")}
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => restar(l.producto.id)}
                          disabled={Number(l.cantidad) <= 1}
                          aria-label={t("pos.restar")}
                          className="h-8 w-8 rounded-full border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] text-[#875d69] dark:text-rose-300 hover:bg-[#f4d0d0] dark:hover:bg-[var(--dark-border)] disabled:opacity-40"
                        >
                          <Minus size={14} className="mx-auto" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={stock}
                          value={l.cantidad}
                          onChange={(e) => cambiarCantidad(l.producto.id, e.target.value)}
                          onBlur={() => normalizarCantidad(l.producto.id)}
                          aria-label={t("pos.cantidad")}
                          className="h-8 w-14 rounded-lg border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] text-center focus:outline-none dark:bg-[var(--dark-bg)] dark:text-[var(--dark-text)] focus:border-[#875d69] dark:focus:border-rose-300 [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() => sumar(l.producto.id)}
                          disabled={Number(l.cantidad) >= stock}
                          aria-label={t("pos.sumar")}
                          className="h-8 w-8 rounded-full border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] text-[#875d69] dark:text-rose-300 hover:bg-[#f4d0d0] dark:hover:bg-[var(--dark-border)] disabled:opacity-40"
                        >
                          <Plus size={14} className="mx-auto" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-[var(--dark-muted)]">{t("pos.subtotal")}</p>
                        <p className="font-semibold text-gray-800 dark:text-[var(--dark-text)]">{money.format(subtotalLinea(l))}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 shrink-0 border-t pt-4">
            <div className="flex justify-between text-sm text-gray-500 dark:text-[var(--dark-muted)]">
              <span>{t("pos.piezas")}</span>
              <span>{piezas}</span>
            </div>
            <div className="mt-1 flex justify-between text-xl font-semibold">
              <span>{t("pos.total")}</span>
              <span>{money.format(total)}</span>
            </div>
            <button
              onClick={() => setCobroAbierto(true)}
              disabled={!carritoValido}
              className="mt-4 w-full rounded-lg bg-rose-800 dark:bg-rose-700 py-3 text-lg font-semibold text-white transition-colors hover:bg-rose-900 dark:hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("pos.cobrar")}
            </button>
          </div>
        </aside>
      </div>
    </div>
    </div>
  );
}