import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

// Opciones del gerente. `icon` es un nombre de Material Icons y `key` la
// clave de traducción en sidebar.*. Cuando se construya una sección nueva,
// su ruta ya está en App.jsx; aquí solo se agrega/quita la opción.
const items = [
  { to: "/gerente", end: true, icon: "dashboard", key: "sidebar.dashboard" },
  { to: "/gerente/ventas", icon: "trending_up", key: "sidebar.sales" },
  { to: "/gerente/inventario", icon: "inventory_2", key: "sidebar.inventory" },
  { to: "/gerente/productos", icon: "cake", key: "sidebar.products" },
  { to: "/gerente/cajeros", icon: "badge", key: "sidebar.cashiers" },
];

export default function GerenteLayout() {
  return (
    <div className="flex h-screen h-[100dvh]">
      <Sidebar items={items} settingsPath="/gerente/configuracion" />
      {/* pt-14: espacio para la barra superior que solo existe en celular */}
      <main className="flex-1 min-w-0 overflow-y-auto pt-14 md:pt-0 bg-[#fdf6e3] dark:bg-[var(--dark-bg)]">
        <Outlet />
      </main>
    </div>
  );
}