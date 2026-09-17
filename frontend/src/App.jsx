import { Routes, Route } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { login as loginApi } from "./api/auth";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./routes/protectedRoute";
import RoleRoute from "./routes/roleRoute";

// ... (todas tus funciones Login, NotFound, Dashboard, MiSucursal, PuntoDeVenta se quedan igual)

export default function App() {
  const { t, i18n } = useTranslation();
  const cambiarIdioma = (lng) => i18n.changeLanguage(lng);

  return (
    <AuthProvider>
      <div>
        <nav className="p-4 flex justify-between items-center border-b">
          <span className="font-semibold">{t("app.name")}</span>
          <div className="space-x-2">
            <button onClick={() => cambiarIdioma("es")} className="text-sm underline">
              ES
            </button>
            <button onClick={() => cambiarIdioma("en")} className="text-sm underline">
              EN
            </button>
          </div>
        </nav>

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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}