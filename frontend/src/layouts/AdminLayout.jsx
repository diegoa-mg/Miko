import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const adminNavItems = [
  { icon: "dashboard", key: "sidebar.dashboard", to: "/admin", end: true },
  { icon: "inventory_2", key: "sidebar.inventory", to: "/admin/inventario" },
  { icon: "trending_up", key: "sidebar.sales", to: "/admin/ventas" },
  { icon: "supervisor_account", key: "sidebar.managers", to: "/admin/gerentes" },
  { icon: "store", key: "sidebar.branches", to: "/admin/sucursales" },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex bg-[#fdf6e9]">
      <Sidebar items={adminNavItems} />
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}