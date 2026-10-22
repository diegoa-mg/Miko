import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

// Opciones del cajero. `icon` es un nombre de Material Icons y `key` la
// clave de traducción en sidebar.*. La configuración de cuenta la agrega
// el Sidebar con settingsPath.
const items = [
  { to: "/cajero", end: true, icon: "dashboard", key: "sidebar.dashboard" },
  { to: "/cajero/pos", icon: "point_of_sale", key: "sidebar.pos" },
  { to: "/cajero/ventas", icon: "receipt_long", key: "sidebar.mySales" },
];

export default function CajeroLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar items={items} settingsPath="/cajero/configuracion" />
      <main className="flex-1 min-w-0 overflow-y-auto bg-[#fdf6e3]">
        <Outlet />
      </main>
    </div>
  );
}