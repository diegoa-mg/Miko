import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";

import Login from "../pages/auth/Login";
import Dashboard from "../pages/admin-general/Dashboard";
import MiSucursal from "../pages/gerente-sede/MiSucursal";
import PuntoDeVenta from "../pages/cajero/PuntoDeVenta";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowedRoles={["admin_general"]} />}>
            <Route path="/admin/*" element={<Dashboard />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={["admin_general", "gerente_sede"]} />}>
            <Route path="/gerente/*" element={<MiSucursal />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={["admin_general", "gerente_sede", "cajero"]} />}>
            <Route path="/pos/*" element={<PuntoDeVenta />} />
          </Route>
        </Route>

        <Route path="/no-autorizado" element={<p>No tienes acceso a esta sección</p>} />
      </Routes>
    </BrowserRouter>
  );
}