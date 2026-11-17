import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Alto máximo de la lista (equivale a max-h-60) y separación con el botón (equivale a mt-2)
const ALTO_MAXIMO_LISTA = 240;
const SEPARACION = 8;
// Alto aproximado de una opción (py-3 + text-sm); solo sirve para decidir si la lista cabe hacia abajo
const ALTO_OPCION = 44;

const noop = () => {};

/**
 * Desplegable propio que reemplaza al select nativo, con el diseño de Inventario.
 *
 * - options: [{ value, label }]. El valor se compara como texto, así que 3 y "3" son lo mismo.
 * - onChange emite { target: { name, value } }: igual que un evento, para poder usar
 *   los handlers que ya existen (cambiarCampo, manejarCambio, (e) => setX(e.target.value)).
 * - className va al contenedor (ancho y comportamiento dentro de un flex/grid).
 * - botonClassName va al botón (alto, forma y relleno). Si no se pasa, usa el estilo de Inventario.
 * - required: se valida con un <input> oculto sincronizado (ver más abajo).
 */
export default function Select({
  value,
  onChange,
  options = [],
  placeholder = "",
  name,
  id,
  required = false,
  disabled = false,
  ariaLabel,
  className = "w-full",
  botonClassName = "h-10 rounded-xl px-3 sm:px-4 text-sm sm:text-base",
}) {
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const [posicion, setPosicion] = useState(null);

  const contenedorRef = useRef(null);
  const botonRef = useRef(null);
  const listaRef = useRef(null);
  const idLista = useId();

  const valorActual = value === undefined || value === null ? "" : String(value);
  const indiceSeleccionado = options.findIndex(
    (opcion) => String(opcion.value) === valorActual
  );
  const opcionSeleccionada =
    indiceSeleccionado >= 0 ? options[indiceSeleccionado] : null;

  // La lista se dibuja con position: fixed a partir de la posición del botón. Así no la
  // recorta ningún contenedor con overflow (los paneles laterales de Productos y Cajeros).
  const calcularPosicion = useCallback(() => {
    const boton = botonRef.current;
    if (!boton) return;

    const rect = boton.getBoundingClientRect();
    const margen = 8; // distancia mínima al borde de la ventana
    const espacioAbajo = window.innerHeight - rect.bottom - SEPARACION - margen;
    const espacioArriba = rect.top - SEPARACION - margen;
    const altoNecesario = Math.min(ALTO_MAXIMO_LISTA, options.length * ALTO_OPCION);

    // Si abajo no cabe y arriba hay más lugar, la lista se abre hacia arriba
    const haciaArriba = espacioAbajo < altoNecesario && espacioArriba > espacioAbajo;
    const espacio = haciaArriba ? espacioArriba : espacioAbajo;

    setPosicion({
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(96, Math.min(ALTO_MAXIMO_LISTA, espacio)),
      ...(haciaArriba
        ? { bottom: window.innerHeight - rect.top + SEPARACION }
        : { top: rect.bottom + SEPARACION }),
    });
  }, [options.length]);

  const abrir = (indice) => {
    if (disabled) return;
    calcularPosicion();
    setIndiceActivo(indice ?? Math.max(indiceSeleccionado, 0));
    setAbierto(true);
  };

  const cerrar = () => setAbierto(false);

  const elegir = (opcion) => {
    onChange?.({ target: { name, value: opcion.value } });
    setAbierto(false);
    botonRef.current?.focus();
  };

  // Mientras está abierto: cerrar con clic/toque fuera o con Escape, y seguir al botón si hay scroll o resize.
  // El efecto limpia sus listeners al cerrarse o desmontarse. Como cada Select abierto escucha el mousedown
  // de todo el documento, al abrir uno los demás (que quedan "fuera") se cierran solos.
  useEffect(() => {
    if (!abierto) return undefined;

    const alHacerClicFuera = (e) => {
      if (
        contenedorRef.current?.contains(e.target) ||
        listaRef.current?.contains(e.target)
      ) {
        return;
      }
      setAbierto(false);
    };

    // En fase de captura y con stopPropagation: Escape cierra solo el desplegable,
    // no también el panel lateral que lo contiene.
    const alPresionarTecla = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setAbierto(false);
      botonRef.current?.focus();
    };

    const alMoverPantalla = (e) => {
      // El scroll dentro de la propia lista no debe moverla
      if (listaRef.current?.contains(e.target)) return;
      calcularPosicion();
    };

    document.addEventListener("mousedown", alHacerClicFuera);
    document.addEventListener("touchstart", alHacerClicFuera, { passive: true });
    document.addEventListener("keydown", alPresionarTecla, true);
    window.addEventListener("resize", alMoverPantalla);
    // true = captura, para enterarse también del scroll de contenedores internos (paneles)
    window.addEventListener("scroll", alMoverPantalla, true);

    return () => {
      document.removeEventListener("mousedown", alHacerClicFuera);
      document.removeEventListener("touchstart", alHacerClicFuera);
      document.removeEventListener("keydown", alPresionarTecla, true);
      window.removeEventListener("resize", alMoverPantalla);
      window.removeEventListener("scroll", alMoverPantalla, true);
    };
  }, [abierto, calcularPosicion]);

  // Mantiene visible la opción resaltada al navegar con el teclado
  useEffect(() => {
    if (!abierto || indiceActivo < 0) return;
    listaRef.current?.children[indiceActivo]?.scrollIntoView({ block: "nearest" });
  }, [abierto, indiceActivo, posicion]);

  const alPresionarTeclaEnBoton = (e) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!abierto) abrir();
        else setIndiceActivo((i) => Math.min(i + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!abierto) abrir();
        else setIndiceActivo((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        if (abierto) {
          e.preventDefault();
          setIndiceActivo(0);
        }
        break;
      case "End":
        if (abierto) {
          e.preventDefault();
          setIndiceActivo(options.length - 1);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (!abierto) abrir();
        else if (options[indiceActivo]) elegir(options[indiceActivo]);
        else cerrar();
        break;
      case "Tab":
        // Tab sigue el flujo normal: solo se cierra la lista, sin cancelar el cambio de foco
        if (abierto) cerrar();
        break;
      default:
        break;
    }
  };

  const textoBoton = opcionSeleccionada ? opcionSeleccionada.label : placeholder;

  return (
    <div ref={contenedorRef} className={`relative min-w-0 ${className}`}>
      {/*
        Validación de required: el botón no es un campo de formulario, así que el navegador no lo valida.
        Se pone un <input> oculto con el mismo valor (y name). Está encima del botón pero invisible y sin
        recibir clics (no usa display:none porque un campo oculto así no se puede enfocar y el formulario
        se quedaría bloqueado sin avisar). Si falta el valor, el navegador muestra su aviso "Completa este
        campo" junto al botón. No usa readOnly porque los campos de solo lectura no se validan.
        Va ANTES del botón para poder resaltarlo con peer-focus cuando el aviso le quita el foco.
      */}
      {(required || name) && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="off"
          name={name}
          value={valorActual}
          onChange={noop}
          required={required}
          disabled={disabled}
          className="peer pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
      )}

      <button
        ref={botonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? idLista : undefined}
        aria-activedescendant={
          abierto && indiceActivo >= 0 ? `${idLista}-opcion-${indiceActivo}` : undefined
        }
        // detail === 0 es el "clic" que el navegador inventa al usar Enter/Espacio:
        // el teclado ya se maneja en onKeyDown y, si no se ignora, se abriría y cerraría de inmediato
        onClick={(e) => {
          if (e.detail === 0) return;
          if (abierto) cerrar();
          else abrir();
        }}
        onKeyDown={alPresionarTeclaEnBoton}
        className={`flex w-full items-center justify-between gap-2 border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-bg)] text-[#8c6773] dark:text-[var(--dark-text)] shadow-sm focus:border-[#875d69] dark:focus:border-rose-300 peer-focus:border-[#875d69] dark:peer-focus:border-rose-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#875d69]/30 dark:focus-visible:ring-rose-300/30 disabled:cursor-not-allowed disabled:opacity-60 ${botonClassName}`}
      >
        <span
          className={`truncate ${
            opcionSeleccionada ? "" : "text-[#a1818a] dark:text-[var(--dark-muted)]"
          }`}
        >
          {textoBoton}
        </span>

        <span className="material-icons shrink-0" aria-hidden="true">
          {abierto ? "keyboard_arrow_up" : "keyboard_arrow_down"}
        </span>
      </button>

      {abierto &&
        posicion &&
        createPortal(
          <div
            ref={listaRef}
            id={idLista}
            role="listbox"
            aria-label={ariaLabel}
            style={{ position: "fixed", ...posicion }}
            className="z-[70] overflow-y-auto rounded-xl border border-[#e6bdc7] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-surface)] shadow-xl"
          >
            {options.map((opcion, indice) => {
              const seleccionada = indice === indiceSeleccionado;
              const resaltada = indice === indiceActivo;

              return (
                <div
                  key={String(opcion.value)}
                  id={`${idLista}-opcion-${indice}`}
                  role="option"
                  aria-selected={seleccionada}
                  // preventDefault evita que el clic le quite el foco al botón (así el teclado sigue funcionando)
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setIndiceActivo(indice)}
                  onClick={() => elegir(opcion)}
                  className={`block w-full cursor-pointer break-words px-4 py-3 text-left text-sm transition-colors ${
                    seleccionada
                      ? "bg-[#fae4df] dark:bg-[var(--dark-border)] text-[#875d69] dark:text-rose-300 font-semibold"
                      : resaltada
                      ? "bg-[#fae4df] dark:bg-[var(--dark-border)] text-[#8c6773] dark:text-[var(--dark-text)]"
                      : "text-[#8c6773] dark:text-[var(--dark-text)]"
                  }`}
                >
                  {opcion.label}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
