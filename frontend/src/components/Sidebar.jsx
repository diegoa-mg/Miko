import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logoMiko from "../assets/icono.png";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ items, bottomItems = [] }) {
  const [open, setOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();

  const renderLink = (item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={() => setMenuOpen(false)}
      className={({ isActive }) =>
        `w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? "bg-rose-300 text-[#5c3a42] font-semibold"
            : "text-rose-100 hover:bg-white/10"
        }`
      }
    >
      <span className="material-icons text-xl shrink-0 w-6 flex justify-center">
        {item.icon}
      </span>
      <span
        className={`transition-all duration-300 ease-in-out ${
          open
            ? "grid opacity-100 ml-3"
            : "grid opacity-0 ml-0 pointer-events-none"
        }`}
        style={{
          gridTemplateColumns: open ? "1fr" : "0fr",
        }}
      >
        <span className="overflow-hidden whitespace-nowrap">
          {t(item.key)}
        </span>
      </span>
    </NavLink>
  );

  return (
    <aside
      className={`bg-[#5c3a42] text-white flex flex-col transition-all duration-300 ease-in-out shrink-0 ${
        open ? "w-64" : "w-20"
      }`}
    >
      {/* Header / Logo */}
      <div className="p-6 flex flex-col items-center border-b border-white/10 relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="absolute -right-3 top-6 bg-white text-[#5c3a42] rounded-full w-6 h-6 flex items-center justify-center shadow"
        >
          <span className="material-icons text-sm">
            {open ? "chevron_left" : "chevron_right"}
          </span>
        </button>
        <img
          src={logoMiko}
          alt="Miko"
          className={`object-contain transition-all duration-300 ease-in-out ${
            open ? "h-12 w-12" : "h-8 w-8"
          }`}
        />
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            open ? "max-h-6 opacity-100 mt-1" : "max-h-0 opacity-0 mt-0"
          }`}
        >
          <p className="text-[10px] tracking-widest text-rose-200 whitespace-nowrap">
            {t("sidebar.subtitle")}
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto overflow-x-hidden">
        {items.map(renderLink)}
      </nav>

      {/* Bottom Items */}
      {bottomItems.length > 0 && (
        <div className="py-4 px-3 space-y-1 border-t border-white/10 overflow-hidden">
          {bottomItems.map(renderLink)}
        </div>
      )}

      {/* User Section */}
      {user && (
        <div className="relative border-t border-white/10">
          <div
            className={`absolute bg-white rounded-lg shadow-xl overflow-hidden text-[#5c3a42] whitespace-nowrap transition-all duration-200 origin-bottom ${
              open
                ? "bottom-full left-2 right-2 mb-2"
                : "left-full bottom-2 ml-2 min-w-[180px]"
            } ${
              menuOpen
                ? "opacity-100 scale-100 pointer-events-auto"
                : "opacity-0 scale-95 pointer-events-none"
            }`}
          >
            <NavLink
              to="/admin/configuracion"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-gray-100 transition-colors"
            >
              <span className="material-icons text-lg text-gray-500">settings</span>
              {t("sidebar.settings")}
            </NavLink>
          </div>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-full flex items-center p-3 hover:bg-white/5 transition-colors text-left overflow-hidden"
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-rose-200 flex items-center justify-center text-lg">
                🧁
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-[#5c3a42]" />
            </div>

            <div
              className={`flex items-center justify-between flex-1 min-w-0 transition-all duration-300 ease-in-out ${
                open ? "max-w-full opacity-100 ml-3" : "max-w-0 opacity-0 ml-0 pointer-events-none"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{user.nombre}</p>
                <p className="text-xs text-rose-200 truncate">
                  {t(`roles.${user.rol}`, user.rol)}
                </p>
              </div>
              <span className="material-icons text-rose-200 text-lg shrink-0 ml-2">
                {menuOpen ? "expand_more" : "chevron_right"}
              </span>
            </div>
          </button>
        </div>
      )}
    </aside>
  );
}