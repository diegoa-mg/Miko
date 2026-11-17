import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";

// Botón para alternar claro/oscuro. Flotante:
// - Celular: arriba a la derecha (dentro de la barra superior del layout).
// - Escritorio: abajo a la derecha, como antes.
// Se puede reutilizar en otro lugar pasando otra className.
export default function ThemeToggle({
  className = "fixed top-2 right-14 z-50 md:top-auto md:bottom-16 md:right-4",
}) {
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? t("theme.toLight") : t("theme.toDark");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`${className} flex h-10 w-10 items-center justify-center rounded-full bg-[#5c3a42] text-white shadow-lg transition-colors hover:bg-[#4a2e35]`}
    >
      <span className="material-icons text-xl">{isDark ? "light_mode" : "dark_mode"}</span>
    </button>
  );
}