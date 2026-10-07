import { useState } from "react";
import { useTranslation } from "react-i18next";


export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const { i18n } = useTranslation();

const cambiarIdioma = (lng) => {
  i18n.changeLanguage(lng);
  localStorage.setItem("idioma", lng); 
  setOpen(false);
};

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2">
        {/* Barrita que se despliega */}
        {open && (
          <div className="flex bg-white rounded-full shadow-lg p-1 gap-1 border border-gray-200">
            <button
              onClick={() => cambiarIdioma("es")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                i18n.language === "es"
                  ? "bg-rose-800 text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              ES
            </button>
            <button
              onClick={() => cambiarIdioma("en")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                i18n.language === "en"
                  ? "bg-rose-800 text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              EN
            </button>
          </div>
        )}

        {/* Botón cuadrado con el ícono */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-10 h-10 rounded-full bg-[#5c3a42] text-white shadow-lg flex items-center justify-center hover:bg-[#4a2e35] transition-colors"
        >
          <span className="material-icons text-lg">translate</span>
        </button>
      </div>
    </div>
  );
}