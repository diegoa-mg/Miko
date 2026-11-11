
import { createPortal } from "react-dom";

export default function ConfirmarCerrarSesion({
  abierto,
  onCancelar,
  onConfirmar,
  cargando = false,
  titulo,
  descripcion,
  textoCancelar,
  textoConfirmar,
  textoCargando,
}) {
  if (!abierto) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
      style={{ zIndex: 99999 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-cerrar-sesion"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[var(--dark-surface)] p-6 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ead8d8] dark:bg-[var(--dark-border)]">
            <span className="material-icons text-3xl text-[#875d69] dark:text-rose-300">
              logout
            </span>
          </div>

          <h3
            id="titulo-cerrar-sesion"
            className="font-sans text-lg font-bold text-[#875d69] dark:text-rose-300"
          >
            {titulo}
          </h3>

          <p className="mt-3 font-sans text-sm text-gray-600 dark:text-[var(--dark-muted)]">
            {descripcion}
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={cargando}
            onClick={onCancelar}
            className="flex-1 rounded-xl border border-[#cda4b4] dark:border-[var(--dark-border)] py-3 font-sans text-sm font-semibold text-[#875d69] dark:text-rose-300 hover:bg-[#fdf6e3] dark:hover:bg-white/5 disabled:opacity-50"
          >
            {textoCancelar}
          </button>

          <button
            type="button"
            disabled={cargando}
            onClick={onConfirmar}
            className="flex-1 rounded-xl bg-[#875d69] py-3 font-sans text-sm font-semibold text-white hover:bg-[#704956] disabled:opacity-50"
          >
            {cargando ? textoCargando : textoConfirmar}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
