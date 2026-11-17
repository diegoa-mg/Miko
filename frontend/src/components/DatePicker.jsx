import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

// Ancho mínimo del calendario (equivale a w-72): si el botón es angosto, el calendario no se encoge con él
const ANCHO_MINIMO = 288;
// Alto aproximado del calendario; solo se usa antes de medirlo para decidir si cabe hacia abajo
const ALTO_ESTIMADO = 400;
// Separación con el botón (equivale a mt-2) y distancia mínima al borde de la ventana
const SEPARACION = 8;
const MARGEN = 8;

// Misma conversión que usa ventas.jsx: fecha local -> "YYYY-MM-DD"
const formatearFechaISO = (fecha) => {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${año}-${mes}-${dia}`;
};

// "YYYY-MM-DD" -> Date. Se usa T12:00:00 (mediodía) para que ningún cambio de zona horaria
// o de horario de verano mueva la fecha al día anterior o siguiente.
const aFecha = (iso) => new Date(`${iso}T12:00:00`);

const primerDiaDelMes = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), 1);

/**
 * Selector de fecha propio que reemplaza al campo de fecha nativo, con el diseño del calendario de Ventas.
 *
 * - value / onChange / min / max / hoy: siempre texto "YYYY-MM-DD" ("" = sin fecha).
 * - hoy: el "hoy" del negocio. Si no se pasa, se usa la fecha local del navegador.
 * - className va al contenedor (ancho). botonClassName va al botón (alto y forma).
 * - El calendario se dibuja en un portal con position: fixed, así que ningún contenedor con
 *   overflow (paneles laterales, tarjetas) lo recorta.
 */
export default function DatePicker({
  value = "",
  onChange,
  id,
  ariaLabel,
  min,
  max,
  hoy,
  disabled = false,
  className = "w-full",
  botonClassName = "h-12 rounded-full px-5 text-sm",
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-US" : "es-MX";

  const hoyISO = hoy || formatearFechaISO(new Date());

  const [abierto, setAbierto] = useState(false);
  const [mes, setMes] = useState(() => primerDiaDelMes(aFecha(value || hoyISO)));
  const [posicion, setPosicion] = useState(null);

  const contenedorRef = useRef(null);
  const botonRef = useRef(null);
  const dialogoRef = useRef(null);
  const idDialogo = useId();

  const fueraDeRango = (iso) => Boolean((min && iso < min) || (max && iso > max));

  // Los 42 días (6 semanas) que se dibujan; la semana inicia en lunes
  const desplazamiento = (mes.getDay() + 6) % 7;
  const inicioCalendario = new Date(mes.getFullYear(), mes.getMonth(), 1 - desplazamiento);
  const dias = Array.from(
    { length: 42 },
    (_, i) =>
      new Date(
        inicioCalendario.getFullYear(),
        inicioCalendario.getMonth(),
        inicioCalendario.getDate() + i
      )
  );

  // Nombres de los días según el idioma (1 de enero de 2024 fue lunes)
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const nombre = new Date(2024, 0, 1 + i)
      .toLocaleDateString(locale, { weekday: "short" })
      .replace(".", "");
    return nombre.charAt(0).toLocaleUpperCase(locale) + nombre.slice(1);
  });

  // Día que recibe el foco al abrir: la fecha elegida, si no el "hoy", si no el primer día disponible del mes
  const disponiblesDelMes = dias.filter(
    (dia) =>
      dia.getMonth() === mes.getMonth() && !fueraDeRango(formatearFechaISO(dia))
  );
  const isoFoco = disponiblesDelMes.some((dia) => formatearFechaISO(dia) === value)
    ? value
    : disponiblesDelMes.some((dia) => formatearFechaISO(dia) === hoyISO)
    ? hoyISO
    : disponiblesDelMes[0]
    ? formatearFechaISO(disponiblesDelMes[0])
    : null;

  const calcularPosicion = useCallback(() => {
    const boton = botonRef.current;
    if (!boton) return;

    const rect = boton.getBoundingClientRect();
    const ancho = Math.min(
      Math.max(rect.width, ANCHO_MINIMO),
      window.innerWidth - 2 * MARGEN
    );
    // Alineado al botón, pero sin salirse de la ventana por la derecha o la izquierda
    const left = Math.min(Math.max(rect.left, MARGEN), window.innerWidth - ancho - MARGEN);

    const espacioAbajo = window.innerHeight - rect.bottom - SEPARACION - MARGEN;
    const espacioArriba = rect.top - SEPARACION - MARGEN;
    const alto = dialogoRef.current?.offsetHeight || ALTO_ESTIMADO;

    // Si abajo no cabe y arriba hay más lugar, el calendario se abre hacia arriba
    const haciaArriba = espacioAbajo < alto && espacioArriba > espacioAbajo;
    const espacio = haciaArriba ? espacioArriba : espacioAbajo;

    setPosicion({
      left,
      width: ancho,
      maxHeight: Math.max(100, espacio),
      ...(haciaArriba
        ? { bottom: window.innerHeight - rect.top + SEPARACION }
        : { top: rect.bottom + SEPARACION }),
    });
  }, []);

  const abrir = () => {
    if (disabled) return;
    setMes(primerDiaDelMes(aFecha(value || hoyISO)));
    calcularPosicion();
    setAbierto(true);
  };

  const cerrar = () => setAbierto(false);

  const elegir = (iso) => {
    onChange?.(iso);
    setAbierto(false);
    botonRef.current?.focus();
  };

  // Al abrir ya existe el calendario en el DOM: se vuelve a calcular con su alto real
  // y el foco entra al calendario (los días son botones, se recorren con Tab).
  useLayoutEffect(() => {
    if (!abierto) return;
    calcularPosicion();
    dialogoRef.current
      ?.querySelector("[data-foco]")
      ?.focus({ preventScroll: true });
    // Solo al abrir: cambiar de mes no debe mover el foco
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  // Mientras está abierto: cerrar con clic/toque fuera o con Escape, y seguir al botón si hay scroll o resize.
  // Cada calendario abierto escucha el mousedown de todo el documento, así que al abrir otro
  // (otro DatePicker o un Select) este queda "fuera" y se cierra solo.
  useEffect(() => {
    if (!abierto) return undefined;

    const alHacerClicFuera = (e) => {
      if (
        contenedorRef.current?.contains(e.target) ||
        dialogoRef.current?.contains(e.target)
      ) {
        return;
      }
      setAbierto(false);
    };

    // En fase de captura y con stopPropagation: Escape cierra solo el calendario,
    // no también el panel lateral que lo contiene.
    const alPresionarTecla = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setAbierto(false);
      botonRef.current?.focus();
    };

    const alMoverPantalla = (e) => {
      // El scroll dentro del propio calendario no debe moverlo
      if (dialogoRef.current?.contains(e.target)) return;
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

  // El calendario se dibuja fuera del contenedor (al final del body), así que Tab no lo "encontraría"
  // desde el botón: el foco entra al abrir y aquí se mantiene dentro (del último botón pasa al primero).
  const alPresionarTeclaEnCalendario = (e) => {
    if (e.key !== "Tab") return;

    const botones = dialogoRef.current?.querySelectorAll("button:not([disabled])");
    if (!botones || botones.length === 0) return;

    const primero = botones[0];
    const ultimo = botones[botones.length - 1];

    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  };

  const cambiarMes = (delta) =>
    setMes((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  const textoBoton = value
    ? aFecha(value).toLocaleDateString(locale)
    : t("datePicker.placeholder");

  const hoyDisponible = !fueraDeRango(hoyISO);

  return (
    <div ref={contenedorRef} className={`relative min-w-0 ${className}`}>
      <button
        ref={botonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls={abierto ? idDialogo : undefined}
        onClick={() => (abierto ? cerrar() : abrir())}
        className={`flex w-full min-w-0 items-center justify-between gap-2 border-2 border-[#e6bdc7] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-bg)] text-[#8c6773] dark:text-[var(--dark-text)] focus:outline-none focus:border-[#875d69] dark:focus:border-rose-300 focus-visible:ring-2 focus-visible:ring-[#875d69]/30 dark:focus-visible:ring-rose-300/30 disabled:cursor-not-allowed disabled:opacity-60 ${botonClassName}`}
      >
        <span
          className={`truncate ${
            value ? "" : "text-[#a1818a] dark:text-[var(--dark-muted)]"
          }`}
        >
          {textoBoton}
        </span>

        <span className="material-icons shrink-0" aria-hidden="true">
          calendar_today
        </span>
      </button>

      {abierto &&
        posicion &&
        createPortal(
          <div
            ref={dialogoRef}
            id={idDialogo}
            role="dialog"
            aria-label={ariaLabel || t("datePicker.calendario")}
            onKeyDown={alPresionarTeclaEnCalendario}
            style={{ position: "fixed", ...posicion }}
            className="z-[80] overflow-y-auto rounded-2xl border border-[#e6bdc7] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-surface)] p-3 shadow-xl"
          >
            {/* Mes y navegación */}
            <div className="mb-4 flex items-center justify-between gap-2">
              <span
                aria-live="polite"
                className="min-w-0 truncate text-sm font-bold capitalize text-[#875d69] dark:text-rose-300"
              >
                {mes.toLocaleDateString(locale, {
                  month: "long",
                  year: "numeric",
                })}
              </span>

              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label={t("datePicker.mesAnterior")}
                  onClick={() => cambiarMes(-1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#875d69] hover:bg-[#fae4df] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#875d69] dark:text-rose-300 dark:hover:bg-[var(--dark-border)] dark:focus-visible:outline-rose-300"
                >
                  <span className="material-icons" aria-hidden="true">
                    chevron_left
                  </span>
                </button>

                <button
                  type="button"
                  aria-label={t("datePicker.mesSiguiente")}
                  onClick={() => cambiarMes(1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#875d69] hover:bg-[#fae4df] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#875d69] dark:text-rose-300 dark:hover:bg-[var(--dark-border)] dark:focus-visible:outline-rose-300"
                >
                  <span className="material-icons" aria-hidden="true">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>

            {/* Días de la semana */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {diasSemana.map((dia) => (
                <div
                  key={dia}
                  className="py-1 text-center text-xs font-semibold text-[#9b7b84] dark:text-[var(--dark-muted)]"
                >
                  {dia}
                </div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7 gap-1">
              {dias.map((dia) => {
                const fechaISO = formatearFechaISO(dia);
                const esMesActual = dia.getMonth() === mes.getMonth();
                const seleccionado = value === fechaISO;
                const esHoy = fechaISO === hoyISO;
                const deshabilitado = fueraDeRango(fechaISO);

                return (
                  <button
                    key={fechaISO}
                    type="button"
                    disabled={deshabilitado}
                    data-foco={fechaISO === isoFoco ? "" : undefined}
                    aria-pressed={seleccionado}
                    aria-current={esHoy ? "date" : undefined}
                    aria-label={dia.toLocaleDateString(locale, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    onClick={() => elegir(fechaISO)}
                    className={`flex aspect-square min-w-0 items-center justify-center rounded-full text-xs transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#875d69] dark:focus-visible:outline-rose-300 ${
                      seleccionado
                        ? "bg-rose-800 text-white font-bold dark:bg-rose-700"
                        : deshabilitado
                        ? "cursor-not-allowed text-gray-300 opacity-40 dark:text-gray-600"
                        : esMesActual
                        ? "text-[#5f3c46] hover:bg-[#fae4df] dark:text-[var(--dark-text)] dark:hover:bg-[var(--dark-border)]"
                        : "text-gray-300 dark:text-gray-600 hover:bg-[#fae4df] dark:hover:bg-[var(--dark-border)]"
                    } ${
                      esHoy && !seleccionado
                        ? "font-bold ring-2 ring-inset ring-[#d06b7d] dark:ring-rose-300"
                        : ""
                    }`}
                  >
                    {dia.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Acciones */}
            <div className="mt-3 flex justify-between border-t border-[#ead8d8] dark:border-[var(--dark-border)] pt-3">
              <button
                type="button"
                onClick={() => elegir("")}
                className="rounded text-sm font-medium text-[#b6536b] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#875d69] dark:text-rose-300 dark:focus-visible:outline-rose-300"
              >
                {t("datePicker.limpiar")}
              </button>

              {/* Si "hoy" queda fuera de min/max no se puede elegir (por ejemplo, un "Desde" posterior a hoy) */}
              <button
                type="button"
                disabled={!hoyDisponible}
                onClick={() => elegir(hoyISO)}
                className="rounded text-sm font-medium text-[#875d69] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#875d69] disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-300 dark:focus-visible:outline-rose-300"
              >
                {t("datePicker.hoy")}
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
