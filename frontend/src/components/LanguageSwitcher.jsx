import { useState } from "react";
import { useTranslation } from "react-i18next";

// Selector de idioma flotante:
// - Celular: arriba a la derecha (dentro de la barra superior del layout);
//   la barrita ES/EN se despliega hacia abajo.
// - Escritorio: abajo a la derecha, como antes; la barrita se despliega a la izquierda.
export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const { i18n } = useTranslation();

  const cambiarIdioma = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("idioma", lng);
    setOpen(false);
  };

  return (
    <div className="fixed top-2 right-2 z-50 md:top-auto md:bottom-4 md:right-4">
      <div className="relative flex items-center gap-2">
        {/* Barrita que se despliega */}
        {open && (
          <div className="absolute top-full right-0 mt-2 md:static md:mt-0 flex bg-white rounded-full shadow-lg p-1 gap-1 border border-gray-200 dark:bg-[var(--dark-surface)] dark:border-[var(--dark-border)]">
            <button
              onClick={() => cambiarIdioma("es")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                i18n.language === "es"
                  ? "bg-rose-800 text-white"
                  : "text-gray-500 hover:bg-gray-100 dark:text-[var(--dark-muted)] dark:hover:bg-[var(--dark-border)]"
              }`}
            >
              ES
            </button>
            <button
              onClick={() => cambiarIdioma("en")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                i18n.language === "en"
                  ? "bg-rose-800 text-white"
                  : "text-gray-500 hover:bg-gray-100 dark:text-[var(--dark-muted)] dark:hover:bg-[var(--dark-border)]"
              }`}
            >
              EN
            </button>
          </div>
        )}

        {/* Botón redondo con el ícono */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Idioma / Language"
          className="w-10 h-10 rounded-full bg-[#5c3a42] text-white shadow-lg flex items-center justify-center hover:bg-[#4a2e35] transition-colors"
        >
          <span className="material-icons text-lg">translate</span>
        </button>
      </div>
    </div>
  );
}