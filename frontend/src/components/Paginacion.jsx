// Paginación con números y puntos suspensivos, igual a la de Inventarios.
// Muestra siempre la primera y la última página, y la actual con sus vecinas.
export default function Paginacion({
  paginaActual,
  totalPaginas,
  onCambiar,
  deshabilitado = false,
  etiquetaAnterior,
  etiquetaSiguiente,
}) {
  const paginas = Array.from({ length: totalPaginas }, (_, i) => i + 1).filter(
    (pagina) =>
      pagina === 1 ||
      pagina === totalPaginas ||
      Math.abs(pagina - paginaActual) <= 1
  );

  const botonFlecha =
    "flex h-9 w-9 items-center justify-center rounded-xl border border-[#ead8d8] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-surface)] text-[#8b5e6b] dark:text-[var(--dark-muted)] transition hover:bg-[#fae4df] dark:hover:bg-[var(--dark-border)] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-col items-center gap-4 border-t border-[#ead8d8] dark:border-[var(--dark-border)] bg-[#fffaf8] dark:bg-[var(--dark-bg)] px-5 py-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onCambiar(Math.max(1, paginaActual - 1))}
          disabled={deshabilitado || paginaActual === 1}
          className={botonFlecha}
          aria-label={etiquetaAnterior}
        >
          <span className="material-icons text-xl">chevron_left</span>
        </button>

        {paginas.map((pagina, indice) => (
          <span key={pagina} className="contents">
            {indice > 0 && pagina - paginas[indice - 1] > 1 && (
              <span className="px-1 text-[#8c6773] dark:text-[var(--dark-muted)]">
                …
              </span>
            )}
            <button
              type="button"
              onClick={() => onCambiar(pagina)}
              disabled={deshabilitado}
              aria-current={paginaActual === pagina ? "page" : undefined}
              className={`h-9 min-w-9 rounded-xl border px-3 text-sm font-semibold transition ${
                paginaActual === pagina
                  ? "border-[#d06b7d] dark:border-rose-700 bg-[#d06b7d] dark:bg-rose-700 text-white"
                  : "border-[#ead8d8] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-surface)] text-[#8b5e6b] dark:text-[var(--dark-muted)] hover:bg-[#fae4df] dark:hover:bg-[var(--dark-border)]"
              }`}
            >
              {pagina}
            </button>
          </span>
        ))}

        <button
          type="button"
          onClick={() => onCambiar(Math.min(totalPaginas, paginaActual + 1))}
          disabled={deshabilitado || paginaActual >= totalPaginas}
          className={botonFlecha}
          aria-label={etiquetaSiguiente}
        >
          <span className="material-icons text-xl">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
