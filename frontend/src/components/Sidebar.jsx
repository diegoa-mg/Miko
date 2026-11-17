import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import iconoMiko from "../assets/icono.png";
import logoOscuro from "../assets/logo_oscuro.png";
import { useAuth } from "../context/AuthContext";
import ConfirmarCerrarSesion from "../components/ConfirmarCerrarSesion";

// Devuelve true cuando la pantalla es menor a 768 px (breakpoint `md` de Tailwind).
function useEsMovil() {
  const consulta = "(max-width: 767px)";
  const [esMovil, setEsMovil] = useState(
    () => typeof window !== "undefined" && window.matchMedia(consulta).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const manejar = (e) => setEsMovil(e.matches);
    setEsMovil(mq.matches);
    mq.addEventListener("change", manejar);
    return () => mq.removeEventListener("change", manejar);
  }, []);

  return esMovil;
}

export default function Sidebar({
  items,
  bottomItems = [],
  settingsPath = "/admin/configuracion",
}) {
  const [open, setOpen] = useState(true); // colapsado/expandido (solo escritorio)
  const [mobileOpen, setMobileOpen] = useState(false); // cajón abierto (solo celular)
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmarLogout, setConfirmarLogout] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const esMovil = useEsMovil();

  // En celular el cajón siempre se muestra expandido (con textos).
  const expandido = open || esMovil;

  // Cierra el cajón al cambiar de ruta.
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setConfirmarLogout(false);

    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const cerrarTodo = () => {
    setMenuOpen(false);
    setMobileOpen(false);
  };

  const renderLink = (item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={cerrarTodo}
      className={({ isActive }) =>
        `w-full flex items-center px-3 py-2 rounded-lg text-sm ${
          isActive
            ? "bg-rose-300 text-[#5c3a42] font-semibold"
            : "text-rose-100 hover:bg-white/10"
        }`
      }
    >
      <span
        className={`material-icons text-xl shrink-0 w-6 flex justify-center transition-all duration-300 ease-in-out ${
          expandido ? "ml-0" : "ml-1"
        }`}
      >
        {item.icon}
      </span>
      <span
        className={`transition-all duration-300 ease-in-out ${
          expandido
            ? "grid opacity-100 ml-3"
            : "grid opacity-0 ml-0 pointer-events-none"
        }`}
        style={{
          gridTemplateColumns: expandido ? "1fr" : "0fr",
        }}
      >
        <span className="overflow-hidden whitespace-nowrap">
          {t(item.key)}
        </span>
      </span>
    </NavLink>
  );

  const avatarSrc = user
    ? user.foto_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user.nombre || "U"
      )}&background=875d69&color=fff&bold=true`
    : "";

  return (
    <>
      {/* Barra superior: solo en celular */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center gap-3 pl-3 pr-28 bg-[#5c3a42] text-white dark:bg-[var(--dark-surface)] border-b border-white/10">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label={t("sidebar.openMenu", "Abrir menú")}
          className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
        >
          <span className="material-icons">menu</span>
        </button>
        <img src={logoOscuro} alt="Miko" className="h-8 object-contain" />
      </header>

      {/* Fondo oscuro detrás del cajón: solo en celular */}
      <div
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
        className={`md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        className={`bg-[#5c3a42] text-white dark:bg-[var(--dark-surface)] dark:border-r dark:border-[var(--dark-border)] flex flex-col transition-all duration-300 ease-in-out shrink-0
          fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }
          md:sticky md:top-0 md:bottom-auto md:h-screen md:self-start md:z-auto md:translate-x-0 md:max-w-none ${
            open ? "md:w-64" : "md:w-20"
          }`}
      >
        {/* Header / Logo */}
        <div className="p-6 flex flex-col items-center border-b border-white/10 relative">
          {/* Colapsar/expandir: solo escritorio */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="hidden md:flex absolute -right-3 top-6 bg-white text-[#5c3a42] rounded-full w-6 h-6 items-center justify-center shadow"
          >
            <span className="material-icons text-sm">
              {open ? "chevron_left" : "chevron_right"}
            </span>
          </button>

          {/* Cerrar cajón: solo celular */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label={t("sidebar.closeMenu", "Cerrar menú")}
            className="md:hidden absolute right-2 top-2 w-9 h-9 flex items-center justify-center rounded-lg text-rose-100 hover:bg-white/10 transition-colors"
          >
            <span className="material-icons">close</span>
          </button>

          {/* Contenedor con las 2 versiones del logo superpuestas, cruzando opacidad */}
          <div className="relative h-12 w-full flex items-center justify-center">
            <img
              src={logoOscuro}
              alt="Miko"
              className={`absolute object-contain h-10 transition-all duration-300 ease-in-out ${
                expandido
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-90 pointer-events-none"
              }`}
            />
            <img
              src={iconoMiko}
              alt="Miko"
              className={`absolute object-contain h-8 w-8 transition-all duration-300 ease-in-out ${
                expandido
                  ? "opacity-0 scale-90 pointer-events-none"
                  : "opacity-100 scale-100"
              }`}
            />
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              expandido ? "max-h-6 opacity-100 mt-1" : "max-h-0 opacity-0 mt-0"
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
              className={`absolute bg-white dark:bg-[var(--dark-bg)] dark:border dark:border-[var(--dark-border)] rounded-lg shadow-xl overflow-hidden text-[#5c3a42] dark:text-[var(--dark-text)] whitespace-nowrap transition-all duration-200 origin-bottom ${
                expandido
                  ? "bottom-full left-2 right-2 mb-2"
                  : "left-full bottom-2 ml-2 min-w-[180px]"
              } ${
                menuOpen
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none"
              }`}
            >
              <NavLink
                to={settingsPath}
                onClick={cerrarTodo}
                className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-[var(--dark-border)] transition-colors"
              >
                <span className="material-icons text-lg text-gray-500 dark:text-[var(--dark-muted)]">settings</span>
                {t("sidebar.settings")}
              </NavLink>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmarLogout(true);
                }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-left hover:bg-gray-100 dark:hover:bg-[var(--dark-border)] transition-colors"
              >
                <span className="material-icons text-lg">logout</span>
                {t("sidebar.logout")}
              </button>
            </div>

            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-full flex items-center p-3 hover:bg-white/5 transition-colors text-left overflow-hidden"
            >
              <div
                className={`relative shrink-0 transition-all duration-300 ease-in-out ${
                  expandido ? "ml-0" : "ml-2"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-rose-200 overflow-hidden flex items-center justify-center">
                  <img
                    src={avatarSrc}
                    alt={user.nombre}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-[#5c3a42] dark:border-[var(--dark-surface)]" />
              </div>

              <div
                className={`flex items-center justify-between flex-1 min-w-0 transition-all duration-300 ease-in-out ${
                  expandido ? "max-w-full opacity-100 ml-3" : "max-w-0 opacity-0 ml-0 pointer-events-none"
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

      {/* Fuera del <aside>: el cajón usa transform y encerraría un modal fixed */}
      <ConfirmarCerrarSesion
        abierto={confirmarLogout}
        onCancelar={() => setConfirmarLogout(false)}
        onConfirmar={handleLogout}
        titulo={t("perfil.confirmarCerrarSesionTitulo")}
        descripcion={t("perfil.confirmarCerrarSesion")}
        textoCancelar={t("perfil.cancelar")}
        textoConfirmar={t("perfil.aceptar")}
        textoCargando={t("perfil.cerrandoSesion")}
      />
    </>
  );
}