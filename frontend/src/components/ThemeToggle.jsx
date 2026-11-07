import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";

// Botón para alternar claro/oscuro. Por ahora flotante (visible en el login);
// al llegar al layout se puede reutilizar dentro del sidebar pasando otra className.
export default function ThemeToggle({ className = "fixed bottom-16 right-4 z-50" }) {
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